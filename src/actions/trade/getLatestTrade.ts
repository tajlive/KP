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

    const strategySignal = data.strategy_signal as Record<string, unknown> | null;
    return {
      symbol: data.trading_pair as string,
      side: String(data.side).toUpperCase(), // 'BUY' or 'SELL'
      entry_price: data.price as number,
      quantity: data.quantity as number,
      pnl: (data.realized_pnl as number | null) ?? undefined,
      created_at: data.executed_at as string,
      reason: (strategySignal?.reason as string | undefined) || "Automatisk strategi-handel",
    };
  } catch (_) {
    return null;
  }
}
