// ============================================================================
// src/app/api/auto-trading/execute-trade/route.ts
// EXECUTE A SINGLE TRADE (idempotent)
// ============================================================================
// This is the atomic unit of trading. Called by:
// 1. The cron-driven strategy engine (auto-trading)
// 2. The copy-trade processor (fan-out)
// 3. Manual "Buy/Sell" button clicks
//
// Idempotency: If the same idempotency_key is sent twice, the second call
// returns the existing trade instead of creating a duplicate.
// ============================================================================

import { withAuth } from "@/lib/api-auth";
import { mul, pnl } from "@/lib/decimal";
import { checkRateLimit } from "@/lib/rate-limit";
import { ExecuteTradeSchema } from "@/lib/schemas";
import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const POST = withAuth(async (req: NextRequest, { user }) => {
  try {
    // Strict rate limit: max 10 trades per minute per user
    const { allowed } = checkRateLimit(`trade:${user.id}`, 10, 60_000);
    if (!allowed) {
      return NextResponse.json(
        { error: "Trade rate limit exceeded" },
        { status: 429 },
      );
    }

    const body = await req.json();
    const parsed = ExecuteTradeSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid input", details: parsed.error.flatten() },
        { status: 400 },
      );
    }

    const {
      session_id,
      side,
      quantity,
      price,
      order_type,
      idempotency_key,
      strategy_signal,
    } = parsed.data;
    const db = await createClient();

    // Check idempotency first (fast path for retries)
    const { data: existingTrade } = await db
      .from("trades")
      .select("*")
      .eq("idempotency_key", idempotency_key)
      .maybeSingle();

    if (existingTrade) {
      // Return existing trade (idempotent response)
      return NextResponse.json({ trade: existingTrade, duplicate: true });
    }

    // Verify session exists, is active, and belongs to user
    const { data: session } = await db
      .from("trading_sessions")
      .select("*")
      .eq("id", session_id)
      .eq("user_id", user.id)
      .in("status", ["active", "crashed"]) // Allow trades on crashed sessions (for recovery)
      .single();

    if (!session) {
      return NextResponse.json(
        { error: "Session not found or not active" },
        { status: 404 },
      );
    }

    const totalValue = mul(quantity, price);

    // Validate: sufficient capital for buy
    if (side === "buy" && totalValue > session.current_capital) {
      return NextResponse.json(
        {
          error: "Insufficient capital",
          available: session.current_capital,
          required: totalValue,
        },
        { status: 400 },
      );
    }

    // Validate: must have open position to sell
    if (side === "sell" && !session.open_position) {
      return NextResponse.json(
        { error: "No open position to sell" },
        { status: 400 },
      );
    }

    // Calculate PnL for sells
    let realizedPnl: number | null = null;
    if (side === "sell" && session.open_position) {
      const pos = session.open_position as { entry_price: number };
      realizedPnl = pnl(pos.entry_price, price, quantity);
    }

    // For live trading: execute on Binance first
    let binanceOrderId: string | null = null;
    if (session.mode === "live") {
      try {
        const binanceResult = await executeBinanceTrade({
          userId: user.id,
          pair: session.trading_pair.replace("/", ""),
          side,
          quantity,
          price,
          orderType: order_type,
        });
        binanceOrderId = binanceResult.orderId;
      } catch (binanceError) {
        console.error("Binance trade failed:", binanceError);

        // Queue for retry instead of failing immediately
        await db.from("notification_queue").insert({
          user_id: user.id,
          type: "trade_executed",
          payload: {
            error: true,
            message: `Binance trade failed: ${(binanceError as Error).message}`,
            session_id,
            side,
            quantity,
            price,
          },
        });

        return NextResponse.json(
          {
            error: "Binance trade failed",
            details: (binanceError as Error).message,
          },
          { status: 502 },
        );
      }
    }

    // Insert trade (triggers: update session state + copy-trade fan-out + notification)
    const { data: trade, error } = await db
      .from("trades")
      .insert({
        session_id,
        user_id: user.id,
        idempotency_key,
        mode: session.mode,
        trading_pair: session.trading_pair,
        side,
        order_type,
        quantity,
        price,
        total_value: totalValue,
        fee: session.mode === "live" ? mul(totalValue, 0.001) : 0, // 0.1% Binance fee
        status: "filled",
        binance_order_id: binanceOrderId,
        realized_pnl: realizedPnl,
        strategy_signal: strategy_signal ?? null,
      })
      .select()
      .single();

    if (error) {
      // Unique constraint on idempotency_key = duplicate (race condition)
      if (error.code === "23505") {
        const { data: dup } = await db
          .from("trades")
          .select("*")
          .eq("idempotency_key", idempotency_key)
          .single();
        return NextResponse.json({ trade: dup, duplicate: true });
      }
      console.error("Failed to insert trade:", error);
      return NextResponse.json(
        { error: "Failed to execute trade" },
        { status: 500 },
      );
    }

    // Update session heartbeat
    await db
      .from("trading_sessions")
      .update({ last_heartbeat: new Date().toISOString() })
      .eq("id", session_id);

    return NextResponse.json({ trade }, { status: 201 });
  } catch (err) {
    console.error("Unexpected error in execute trade:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
});

/**
 * Execute a real trade on Binance via the central BinanceClient.
 * Uses MARKET orders by default for instant execution.
 */
async function executeBinanceTrade(params: {
  userId: string;
  pair: string;
  side: string;
  quantity: number;
  price: number;
  orderType: string;
}): Promise<{ orderId: string }> {
  const { placeOrder } = await import("@/lib/binance/client");

  const order = await placeOrder({
    symbol: params.pair.toUpperCase(),
    side: params.side.toUpperCase() as "BUY" | "SELL",
    type: (params.orderType === "limit" ? "LIMIT" : "MARKET") as
      | "MARKET"
      | "LIMIT",
    quantity: params.quantity,
    ...(params.orderType === "limit" && { price: params.price }),
  });

  return { orderId: String(order.orderId) };
}
