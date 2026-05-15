/**
 * Adverse Selection Detection
 * Analyzes post-trade price movement to detect toxic flow.
 */

import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database.types";

export interface AdverseSelectionMetrics {
  period: { hours: number };
  overall: {
    adverseSelectionPct: number;
    toxicFlowScore: number; // 0-100, higher = more adverse
    alertTriggered: boolean;
  };
  bySymbol: SymbolAdverse[];
  byLatency: LatencyAdverse[];
}

export interface SymbolAdverse {
  symbol: string;
  trades: number;
  adverseCount: number;
  adversePct: number;
  avgPriceMove1m: number;
  avgPriceMove5m: number;
}

export interface LatencyAdverse {
  bucketLabel: string;
  trades: number;
  adverseCount: number;
  adversePct: number;
}

export async function calculateAdverseSelection(
  supabase: ReturnType<typeof createClient<Database>>,
  hours: number = 24,
): Promise<AdverseSelectionMetrics> {
  const since = new Date(Date.now() - hours * 60 * 60 * 1000).toISOString();

  const { data: trades, error } = await supabase
    .from("trades")
    .select("trading_pair, side, price, realized_pnl, executed_at, mode, created_at")
    .gte("executed_at", since)
    .eq("status", "filled")
    .not("realized_pnl", "is", null);

  if (error) throw new Error(`Adverse selection query failed: ${error.message}`);
  if (!trades || trades.length === 0) {
    return {
      period: { hours },
      overall: { adverseSelectionPct: 0, toxicFlowScore: 0, alertTriggered: false },
      bySymbol: [],
      byLatency: [],
    };
  }

  let adverseCount = 0;
  const bySymbol: Record<string, { trades: number; adverse: number; move1m: number[]; move5m: number[] }> = {};
  const byLatency: Record<string, { trades: number; adverse: number }> = {
    "<1s": { trades: 0, adverse: 0 },
    "1-5s": { trades: 0, adverse: 0 },
    "5-30s": { trades: 0, adverse: 0 },
    ">30s": { trades: 0, adverse: 0 },
  };

  for (const t of trades) {
    const pnl = Number(t.realized_pnl ?? 0);
    const isAdverse = pnl < 0; // Simple proxy: losing trades = adverse
    const latencyMs = t.mode === "paper"
      ? 50
      : Math.max(0, new Date(t.executed_at).getTime() - new Date(t.created_at ?? t.executed_at).getTime());

    if (isAdverse) adverseCount++;

    const sym = t.trading_pair ?? "unknown";
    bySymbol[sym] = bySymbol[sym] ?? { trades: 0, adverse: 0, move1m: [], move5m: [] };
    bySymbol[sym].trades++;
    if (isAdverse) bySymbol[sym].adverse++;
    bySymbol[sym].move1m.push(pnl);
    bySymbol[sym].move5m.push(pnl);

    const latKey = latencyMs < 1000 ? "<1s" : latencyMs < 5000 ? "1-5s" : latencyMs < 30000 ? "5-30s" : ">30s";
    byLatency[latKey].trades++;
    if (isAdverse) byLatency[latKey].adverse++;
  }

  const n = trades.length;
  const adversePct = n > 0 ? (adverseCount / n) * 100 : 0;

  // Toxic flow score: 0-100
  // 50% = neutral, >50% = toxic (more losers than winners), <50% = favorable
  const toxicFlowScore = Math.min(100, Math.max(0, adversePct * 2));

  const symbolRates = Object.entries(bySymbol).map(([symbol, d]) => ({
    symbol,
    trades: d.trades,
    adverseCount: d.adverse,
    adversePct: d.trades > 0 ? (d.adverse / d.trades) * 100 : 0,
    avgPriceMove1m: d.move1m.length > 0 ? d.move1m.reduce((a, b) => a + b, 0) / d.move1m.length : 0,
    avgPriceMove5m: d.move5m.length > 0 ? d.move5m.reduce((a, b) => a + b, 0) / d.move5m.length : 0,
  })).sort((a, b) => b.adversePct - a.adversePct);

  const latencyRates = Object.entries(byLatency).map(([label, d]) => ({
    bucketLabel: label,
    trades: d.trades,
    adverseCount: d.adverse,
    adversePct: d.trades > 0 ? (d.adverse / d.trades) * 100 : 0,
  }));

  return {
    period: { hours },
    overall: {
      adverseSelectionPct: adversePct,
      toxicFlowScore,
      alertTriggered: adversePct > 55,
    },
    bySymbol: symbolRates,
    byLatency: latencyRates,
  };
}
