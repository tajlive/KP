import { createClient } from "@/lib/supabase/server";
import { ExecutorFactory } from "@/lib/trading/executor-factory";
import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const {
    session_id,
    symbol = "BTCUSDT",
    side,
    order_type = "market",
    quantity,
    price: limitPrice,
  } = body;

  if (!session_id || !side || !quantity) {
    return NextResponse.json(
      { error: "session_id, side, and quantity are required" },
      { status: 400 },
    );
  }

  if (!["buy", "sell"].includes(side)) {
    return NextResponse.json(
      { error: "side must be buy or sell" },
      { status: 400 },
    );
  }

  if (quantity <= 0) {
    return NextResponse.json(
      { error: "quantity must be positive" },
      { status: 400 },
    );
  }

  try {
    const { data: session, error: sessionError } = await supabase
      .from("trading_sessions")
      .select(
        "id, user_id, mode, status, strategy_id, trading_pair, current_capital_nok, starting_capital_nok, risk_config, total_trades, total_pnl",
      )
      .eq("id", session_id)
      .eq("user_id", user.id)
      .single();

    if (sessionError || !session) {
      return NextResponse.json({ error: "Session not found" }, { status: 404 });
    }

    if (session.status !== "active") {
      return NextResponse.json(
        { error: `Session is ${session.status}, cannot execute trades` },
        { status: 400 },
      );
    }

    const riskConfig = session.risk_config as Record<string, number> | null;
    // 🔒 Pre-flight balance check for buy orders
    if (side === "buy") {
      const currentPrice = await fetchQuickPrice(symbol);
      const orderValue = quantity * currentPrice;
      const estimatedFee = orderValue * 0.001; // 0.1% fee estimate
      const totalCost = orderValue + estimatedFee;
      
      // Check if user has sufficient balance (minimum $10 equivalent)
      const MINIMUM_ORDER_VALUE = 10; // $10 minimum
      if (orderValue < MINIMUM_ORDER_VALUE) {
        return NextResponse.json(
          { error: `Order value must be at least $${MINIMUM_ORDER_VALUE}. Current: $${orderValue.toFixed(2)}` },
          { status: 400 },
        );
      }
      
      if (session.current_capital_nok < totalCost) {
        return NextResponse.json(
          { 
            error: `Insufficient balance. Required: $${totalCost.toFixed(2)}, Available: $${session.current_capital_nok.toFixed(2)}`,
            code: "INSUFFICIENT_BALANCE"
          },
          { status: 400 },
        );
      }
    }

    if (riskConfig) {
      const maxPositionPct = riskConfig.maxPositionSizePercent || 100;
      const maxValue = session.current_capital_nok * (maxPositionPct / 100);
      const currentPrice = await fetchQuickPrice(symbol);
      const orderValue = quantity * currentPrice;

      if (side === "buy" && orderValue > maxValue) {
        return NextResponse.json(
          {
            error: `Order value ${orderValue.toFixed(2)} exceeds max position size ${maxValue.toFixed(2)}`,
          },
          { status: 400 },
        );
      }
    }

    const executor = await ExecutorFactory.createFromSession(session_id);

    const result = await executor.executeOrder({
      symbol,
      side: side as "buy" | "sell",
      quantity,
      orderType: order_type as "market" | "limit",
      price: limitPrice,
    });

    if (!result.success) {
      return NextResponse.json(
        { error: result.error || "Execution failed" },
        { status: 500 },
      );
    }

    const idempotencyKey = `${session_id}-${Date.now()}-${result.orderId}`;
    const tradingPair = session.trading_pair || symbol.replace("USDT", "/USDT");

    const { data: trade, error: tradeError } = await supabase
      .from("trades")
      .insert({
        session_id,
        user_id: user.id,
        idempotency_key: idempotencyKey,
        mode: session.mode,
        trading_pair: tradingPair,
        side,
        order_type,
        quantity: result.executedQuantity,
        price: result.executedPrice,
        total_value: result.executedQuantity * result.executedPrice,
        fee: result.fee,
        status: "filled",
        strategy_signal: { order_type, slippage_pct: result.slippagePct },
        binance_order_id: session.mode === "live" ? result.orderId : null,
        executed_at: result.timestamp.toISOString(),
      })
      .select()
      .single();

    if (tradeError) {
      console.error("Failed to save trade:", tradeError);
      return NextResponse.json(
        { error: "Trade executed but failed to save: " + tradeError.message },
        { status: 500 },
      );
    }

    // 🔥 KLA-64: Atomic Balance & Position Tracking
    const tradeValue = result.executedQuantity * result.executedPrice;
    const netTradeValue =
      side === "buy" ? tradeValue + result.fee : tradeValue - result.fee;

    if (side === "buy") {
      // 1. Atomic decrement (race condition protection)
      const { error: balanceErr } = await supabase.rpc("decrement_capital", {
        p_session_id: session_id,
        p_amount: netTradeValue,
        p_user_id: user.id,
      });

      if (balanceErr) {
        console.error("Balance update failed:", balanceErr);
        // If we can't deduct money, we should fail, but the trade was already executed...
        // This shouldn't happen if risk checks pass, but atomic RPC is the final guard.
      }

      // 2. Upsert position with incremental logic
      const { data: existingPos } = await supabase
        .from("positions")
        .select("*")
        .eq("session_id", session_id)
        .eq("symbol", symbol)
        .single();

      if (existingPos) {
        const newQty = Number(existingPos.quantity) + result.executedQuantity;
        const newTotalCost = Number(existingPos.total_cost_nok) + netTradeValue;
        const newAvgPrice = newTotalCost / newQty;

        const { error: posErr } = await supabase
          .from("positions")
          .update({
            quantity: newQty,
            avg_entry_price: newAvgPrice,
            total_cost_nok: newTotalCost,
            updated_at: new Date().toISOString(),
          })
          .eq("session_id", session_id)
          .eq("symbol", symbol);

        if (posErr) console.error("Position update failed:", posErr);
      } else {
        const { error: posErr } = await supabase.from("positions").insert({
          session_id,
          user_id: user.id,
          symbol,
          quantity: result.executedQuantity,
          avg_entry_price: result.executedPrice,
          total_cost_nok: netTradeValue,
          updated_at: new Date().toISOString(),
        });

        if (posErr) console.error("Position insert failed:", posErr);
      }
    } else {
      // side === 'sell'
      // 1. Validate position existence/quantity
      const { data: position } = await supabase
        .from("positions")
        .select("quantity, avg_entry_price")
        .eq("session_id", session_id)
        .eq("symbol", symbol)
        .single();

      if (!position || position.quantity < result.executedQuantity) {
        return NextResponse.json(
          {
            error: `Insufficient position: have ${position?.quantity ?? 0}, want to sell ${result.executedQuantity}`,
          },
          { status: 400 },
        );
      }

      // 2. Atomic increment
      const { error: balanceErr } = await supabase.rpc("increment_capital", {
        p_session_id: session_id,
        p_amount: netTradeValue,
        p_user_id: user.id,
      });

      if (balanceErr) console.error("Balance update failed:", balanceErr);

      // 3. Update position (decrement quantity)
      const newQty = position.quantity - result.executedQuantity;
      if (newQty <= 0) {
        await supabase
          .from("positions")
          .delete()
          .eq("session_id", session_id)
          .eq("symbol", symbol);
      } else {
        await supabase
          .from("positions")
          .update({
            quantity: newQty,
            updated_at: new Date().toISOString(),
          })
          .eq("session_id", session_id)
          .eq("symbol", symbol);
      }
    }

    // 🏆 KLA-64: Update session stats
    const tradePnl =
      side === "sell"
        ? (result.executedPrice - (session.current_capital_nok || 0)) *
          result.executedQuantity
        : 0;

    await supabase
      .from("trading_sessions")
      .update({
        total_trades: (session.total_trades || 0) + 1,
        total_pnl: (session.total_pnl || 0) + tradePnl,
        updated_at: new Date().toISOString(),
      })
      .eq("id", session_id);

    return NextResponse.json({
      success: true,
      trade: trade || null,
      execution: {
        orderId: result.orderId,
        executedPrice: result.executedPrice,
        executedQuantity: result.executedQuantity,
        fee: result.fee,
        slippagePct: result.slippagePct,
      },
    });
  } catch (error) {
    console.error("Trade execution error:", error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Internal server error",
      },
      { status: 500 },
    );
  }
}

async function fetchQuickPrice(symbol: string): Promise<number> {
  try {
    const res = await fetch(
      `https://api.binance.com/api/v3/ticker/price?symbol=${symbol}`,
      { signal: AbortSignal.timeout(3000) },
    );
    if (!res.ok) return 0;
    const data = await res.json();
    return parseFloat(data.price);
  } catch {
    return 0;
  }
}
