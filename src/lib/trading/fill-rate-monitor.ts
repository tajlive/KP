/**
 * Fill Rate Monitor — Track partial fills and their cost impact
 */

import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database.types";

export interface FillRateMetrics {
  period: { hours: number };
  overall: {
    fillRatePct: number;
    partialFillCount: number;
    totalTrades: number;
    avgFillPct: number;
  };
  bySymbol: SymbolFillRate[];
}

export interface SymbolFillRate {
  symbol: string;
  trades: number;
  filledCount: number;
  partialCount: number;
  fillRatePct: number;
  avgFillPct: number;
  impactNok: number; // Estimated cost of partial fills
}

export async function calculateFillRate(
  supabase: ReturnType<typeof createClient<Database>>,
  hours: number = 24,
): Promise<FillRateMetrics> {
  const since = new Date(Date.now() - hours * 60 * 60 * 1000).toISOString();

  // Note: trades table stores "filled" status but doesn't track partial fill %.
  // We estimate from total_value vs quantity*price deviation.
  const { data: trades, error } = await supabase
    .from("trades")
    .select("trading_pair, quantity, price, total_value, fee, mode")
    .gte("executed_at", since)
    .eq("status", "filled");

  if (error) throw new Error(`Fill rate query failed: ${error.message}`);
  if (!trades || trades.length === 0) {
    return { period: { hours }, overall: { fillRatePct: 100, partialFillCount: 0, totalTrades: 0, avgFillPct: 100 }, bySymbol: [] };
  }

  // Estimate fill quality: if total_value deviates > 0.5% from quantity*price,
  // treat as partial fill impact
  let partialCount = 0;
  const bySymbol: Record<string, { trades: number; filled: number; partial: number; totalExpected: number; totalActual: number; impact: number }> = {};

  for (const t of trades) {
    const qty = Number(t.quantity ?? 0);
    const price = Number(t.price ?? 0);
    const total = Number(t.total_value ?? 0);
    const expected = qty * price;
    const deviation = expected > 0 ? Math.abs(total - expected) / expected : 0;
    const isPartial = deviation > 0.005; // > 0.5% deviation

    const sym = t.trading_pair ?? "unknown";
    bySymbol[sym] = bySymbol[sym] ?? { trades: 0, filled: 0, partial: 0, totalExpected: 0, totalActual: 0, impact: 0 };
    bySymbol[sym].trades++;
    bySymbol[sym].filled++;
    bySymbol[sym].totalExpected += expected;
    bySymbol[sym].totalActual += total;

    if (isPartial) {
      partialCount++;
      bySymbol[sym].partial++;
      bySymbol[sym].impact += Math.abs(total - expected);
    }
  }

  const n = trades.length;
  const symbolRates = Object.entries(bySymbol).map(([symbol, d]) => {
    const fillRatePct = d.trades > 0 ? ((d.trades - d.partial) / d.trades) * 100 : 100;
    const avgFillPct = d.totalExpected > 0 ? (d.totalActual / d.totalExpected) * 100 : 100;
    return {
      symbol,
      trades: d.trades,
      filledCount: d.filled,
      partialCount: d.partial,
      fillRatePct,
      avgFillPct,
      impactNok: d.impact,
    };
  }).sort((a, b) => a.fillRatePct - b.fillRatePct);

  return {
    period: { hours },
    overall: {
      fillRatePct: n > 0 ? ((n - partialCount) / n) * 100 : 100,
      partialFillCount: partialCount,
      totalTrades: n,
      avgFillPct: symbolRates.reduce((s, r) => s + r.avgFillPct, 0) / (symbolRates.length || 1),
    },
    bySymbol: symbolRates,
  };
}
