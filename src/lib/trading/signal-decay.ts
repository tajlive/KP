/**
 * Signal Decay Analysis
 * Measures how signal accuracy degrades with execution latency.
 */

import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database.types";

export interface SignalDecayMetrics {
  period: { hours: number };
  buckets: DecayBucket[];
  optimalWindowMs: number;
  overallAccuracyPct: number;
}

export interface DecayBucket {
  bucketLabel: string;
  minMs: number;
  maxMs: number;
  trades: number;
  winningTrades: number;
  accuracyPct: number;
  avgReturnPct: number;
}

export async function calculateSignalDecay(
  supabase: ReturnType<typeof createClient<Database>>,
  hours: number = 24,
): Promise<SignalDecayMetrics> {
  const since = new Date(Date.now() - hours * 60 * 60 * 1000).toISOString();

  // Fetch trades with realized_pnl
  const { data: trades, error } = await supabase
    .from("trades")
    .select("realized_pnl, total_value, executed_at, created_at, mode, trading_pair")
    .gte("executed_at", since)
    .eq("status", "filled")
    .not("realized_pnl", "is", null);

  if (error) throw new Error(`Signal decay query failed: ${error.message}`);
  if (!trades || trades.length === 0) {
    return { period: { hours }, buckets: [], optimalWindowMs: 0, overallAccuracyPct: 0 };
  }

  // Define latency buckets
  const buckets: DecayBucket[] = [
    { bucketLabel: "<100ms", minMs: 0, maxMs: 100, trades: 0, winningTrades: 0, accuracyPct: 0, avgReturnPct: 0 },
    { bucketLabel: "100-500ms", minMs: 100, maxMs: 500, trades: 0, winningTrades: 0, accuracyPct: 0, avgReturnPct: 0 },
    { bucketLabel: "500ms-2s", minMs: 500, maxMs: 2000, trades: 0, winningTrades: 0, accuracyPct: 0, avgReturnPct: 0 },
    { bucketLabel: "2-10s", minMs: 2000, maxMs: 10000, trades: 0, winningTrades: 0, accuracyPct: 0, avgReturnPct: 0 },
    { bucketLabel: ">10s", minMs: 10000, maxMs: Infinity, trades: 0, winningTrades: 0, accuracyPct: 0, avgReturnPct: 0 },
  ];

  let totalTrades = 0;
  let totalWinners = 0;
  let bestAccuracy = -1;
  let optimalWindowMs = 0;

  for (const t of trades) {
    const latencyMs = t.mode === "paper"
      ? Math.round(Math.random() * 80 + 20) // Simulated for paper: 20-100ms
      : Math.max(100, new Date(t.executed_at).getTime() - new Date(t.created_at ?? t.executed_at).getTime());

    const pnl = Number(t.realized_pnl ?? 0);
    const totalValue = Number(t.total_value ?? 1);
    const returnPct = (pnl / totalValue) * 100;
    const isWin = pnl > 0;

    const bucket = buckets.find((b) => latencyMs >= b.minMs && latencyMs < b.maxMs);
    if (bucket) {
      bucket.trades++;
      if (isWin) bucket.winningTrades++;
    }

    totalTrades++;
    if (isWin) totalWinners++;
  }

  for (const b of buckets) {
    b.accuracyPct = b.trades > 0 ? (b.winningTrades / b.trades) * 100 : 0;
    if (b.accuracyPct > bestAccuracy && b.trades >= 5) {
      bestAccuracy = b.accuracyPct;
      optimalWindowMs = b.maxMs;
    }
  }

  return {
    period: { hours },
    buckets: buckets.filter((b) => b.trades > 0),
    optimalWindowMs,
    overallAccuracyPct: totalTrades > 0 ? (totalWinners / totalTrades) * 100 : 0,
  };
}
