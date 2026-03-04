"use server";

import { createClient } from "@/lib/supabase/server";

export interface TradeContext {
  symbol: string;
  side: string;
  entry_price: number;
  quantity: number;
  pnl?: number;
  created_at: string;
  reason?: string; // From log or strategy
}

export async function getLatestTrade(): Promise<TradeContext | null> {
  const supabase = await createClient();

  try {
    const { data, error } = await supabase
      .from("trades")
      .select("trading_pair, side, price, quantity, realized_pnl, executed_at, strategy_signal")
      .order("executed_at", { ascending: false })
      .limit(1)
      .single();

    if (error || !data) return null;

    return {
      symbol: data.trading_pair,
      side: data.side.toUpperCase(), // 'BUY' or 'SELL'
      entry_price: data.price,
      quantity: data.quantity,
      pnl: data.realized_pnl ?? undefined,
      created_at: data.executed_at,
      reason: data.strategy_signal?.reason as string || "Automatisk strategi-handel",
    };
  } catch (_) {
    return null;
  }
}
