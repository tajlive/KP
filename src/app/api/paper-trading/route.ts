/**
 * Paper Trading API — Execute trades, get positions, get history
 * 
 * POST /api/paper-trading/execute  — Open a paper trade
 * GET  /api/paper-trading/positions — Get open positions
 * GET  /api/paper-trading/history   — Get trade history
 * POST /api/paper-trading/close     — Close a position
 */

import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// ─── POST /api/paper-trading/execute ───
export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { symbol, side, amount } = body as {
      symbol: string;
      side: "buy" | "sell";
      amount: number;
    };

    if (!symbol || !side || !amount || amount <= 0) {
      return NextResponse.json({ error: "Mangler symbol, side eller amount" }, { status: 400 });
    }

    // Hent live pris fra coin_prices
    const { data: priceData } = await supabase
      .from("coin_prices")
      .select("price")
      .eq("symbol", symbol)
      .maybeSingle();

    const price = (priceData as { price?: number } | null)?.price;
    if (!price || price <= 0) {
      return NextResponse.json({ error: "Kunne ikke hente pris" }, { status: 500 });
    }

    // Hent eller opprett paper account
    let { data: account } = await supabase
      .from("paper_accounts")
      .select("id, current_balance")
      .eq("user_id", user.id)
      .maybeSingle();

    if (!account) {
      const { data: newAccount, error: createErr } = await supabase
        .from("paper_accounts")
        .insert({
          user_id: user.id,
          initial_balance: 100000,
          current_balance: 100000,
        })
        .select("id, current_balance")
        .single();

      if (createErr || !newAccount) {
        return NextResponse.json({ error: "Kunne ikke opprette paper account" }, { status: 500 });
      }
      account = newAccount;
    }

    const accountRecord = account as { id: string; current_balance: number };

    // Beregn quantity
    const quantity = amount / price;
    const totalCost = amount;

    // Sjekk saldo for kjøp
    if (side === "buy" && accountRecord.current_balance < totalCost) {
      return NextResponse.json({
        error: `Utilstrekkelig saldo. Har ${accountRecord.current_balance.toFixed(2)} kr, trenger ${totalCost.toFixed(2)} kr`,
      }, { status: 400 });
    }

    // Oppdater saldo
    const newBalance = side === "buy"
      ? accountRecord.current_balance - totalCost
      : accountRecord.current_balance + totalCost;

    const { error: balanceErr } = await supabase
      .from("paper_accounts")
      .update({ current_balance: newBalance, updated_at: new Date().toISOString() })
      .eq("id", accountRecord.id);

    if (balanceErr) {
      return NextResponse.json({ error: "Kunne ikke oppdatere saldo" }, { status: 500 });
    }

    // Opprett posisjon
    if (side === "buy") {
      const { data: position, error: posErr } = await supabase
        .from("paper_positions")
        .insert({
          account_id: accountRecord.id,
          symbol,
          position_type: "spot_long",
          quantity,
          entry_price: price,
          entry_amount: amount,
          current_price: price,
          status: "open",
        })
        .select("id")
        .single();

      if (posErr) {
        return NextResponse.json({ error: "Kunne ikke opprette posisjon" }, { status: 500 });
      }
    }

    // Logg trade
    const { data: trade, error: tradeErr } = await supabase
      .from("paper_trades")
      .insert({
        account_id: accountRecord.id,
        symbol,
        position_type: side === "buy" ? "spot_long" : "spot_short",
        entry_price: price,
        exit_price: price,
        quantity,
        entry_amount: amount,
        exit_amount: amount,
        profit_loss: 0,
        profit_loss_percent: 0,
        entry_time: new Date().toISOString(),
        exit_time: new Date().toISOString(),
      })
      .select("id")
      .single();

    if (tradeErr) {
      console.error("Trade log error:", tradeErr);
    }

    return NextResponse.json({
      success: true,
      trade: {
        symbol,
        side,
        amount,
        price,
        quantity,
        newBalance,
        timestamp: new Date().toISOString(),
      },
      balance: newBalance,
    });
  } catch (err) {
    console.error("[paper-trading] execute error:", err);
    return NextResponse.json({ error: "Serverfeil" }, { status: 500 });
  }
}

// ─── GET /api/paper-trading ───
export async function GET(request: Request) {
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const type = searchParams.get("type") || "positions";

  try {
    // Hent account
    const { data: account } = await supabase
      .from("paper_accounts")
      .select("id, current_balance, initial_balance, total_profit_loss")
      .eq("user_id", user.id)
      .maybeSingle();

    if (!account) {
      return NextResponse.json({
        positions: [],
        history: [],
        balance: 100000,
        pnl: 0,
      });
    }

    const acc = account as { id: string; current_balance: number; initial_balance: number; total_profit_loss: number | null };

    if (type === "history") {
      const { data: trades } = await supabase
        .from("paper_trades")
        .select("*")
        .eq("account_id", acc.id)
        .order("exit_time", { ascending: false })
        .limit(50);

      return NextResponse.json({
        history: trades || [],
        balance: acc.current_balance,
        pnl: acc.total_profit_loss ?? 0,
      });
    }

    // Default: positions
    const { data: positions } = await supabase
      .from("paper_positions")
      .select("*")
      .eq("account_id", acc.id)
      .eq("status", "open")
      .order("opened_at", { ascending: false });

    // Update current prices
    if (positions && positions.length > 0) {
      const symbols = [...new Set(positions.map((p: { symbol: string }) => p.symbol))];
      const { data: prices } = await supabase
        .from("coin_prices")
        .select("symbol, price")
        .in("symbol", symbols);

      if (prices) {
        const priceMap = new Map((prices as Array<{ symbol: string; price: number }>).map((p) => [p.symbol, p.price]));
        for (const pos of positions as Array<{ symbol: string; current_price?: number; profit_loss?: number; profit_loss_percent?: number }>) {
          const currentPrice = priceMap.get(pos.symbol);
          if (currentPrice) {
            pos.current_price = currentPrice;
            pos.profit_loss = (currentPrice - (pos as unknown as { entry_price: number }).entry_price) * (pos as unknown as { quantity: number }).quantity;
          }
        }
      }
    }

    return NextResponse.json({
      positions: positions || [],
      balance: acc.current_balance,
      pnl: acc.total_profit_loss ?? 0,
    });
  } catch (err) {
    console.error("[paper-trading] GET error:", err);
    return NextResponse.json({ error: "Serverfeil" }, { status: 500 });
  }
}
