/**
 * Market Impact Estimation
 * Checks if position sizes are large relative to market volume.
 */

import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database.types";

export interface MarketImpactMetrics {
  period: { hours: number };
  checks: ImpactCheck[];
  summary: {
    highImpactCount: number;
    mediumImpactCount: number;
    totalTrades: number;
    avgImpactRatio: number;
    alertTriggered: boolean;
  };
}

export interface ImpactCheck {
  symbol: string;
  tradeValueNok: number;
  estimatedDailyVolume: number;
  impactRatio: number; // trade / daily_volume
  impactLevel: "low" | "medium" | "high";
  warning: string;
}

// Approximate daily volumes in NOK (conservative estimates)
const ESTIMATED_DAILY_VOLUME: Record<string, number> = {
  BTCUSDT: 500_000_000_000, // ~500B NOK
  ETHUSDT: 200_000_000_000,
  SOLUSDT: 50_000_000_000,
  XRPUSDT: 30_000_000_000,
  ADAUSDT: 20_000_000_000,
  DOGEUSDT: 15_000_000_000,
  AVAXUSDT: 10_000_000_000,
  LINKUSDT: 8_000_000_000,
  MATICUSDT: 7_000_000_000,
  DOTUSDT: 6_000_000_000,
};

const DEFAULT_VOLUME = 5_000_000_000; // 5B NOK default

export async function calculateMarketImpact(
  supabase: ReturnType<typeof createClient<Database>>,
  hours: number = 24,
): Promise<MarketImpactMetrics> {
  const since = new Date(Date.now() - hours * 60 * 60 * 1000).toISOString();

  const { data: trades, error } = await supabase
    .from("trades")
    .select("trading_pair, total_value, quantity, side")
    .gte("executed_at", since)
    .eq("status", "filled");

  if (error) throw new Error(`Market impact query failed: ${error.message}`);
  if (!trades || trades.length === 0) {
    return {
      period: { hours },
      checks: [],
      summary: { highImpactCount: 0, mediumImpactCount: 0, totalTrades: 0, avgImpactRatio: 0, alertTriggered: false },
    };
  }

  const checks: ImpactCheck[] = [];
  let highCount = 0;
  let mediumCount = 0;
  let totalImpact = 0;

  for (const t of trades) {
    const symbol = t.trading_pair ?? "unknown";
    const value = Number(t.total_value ?? 0);
    const dailyVol = ESTIMATED_DAILY_VOLUME[symbol] ?? DEFAULT_VOLUME;
    const impactRatio = value / dailyVol;

    let level: "low" | "medium" | "high" = "low";
    let warning = "";

    if (impactRatio > 0.005) {
      level = "high";
      warning = `Trade value ${(value / 1_000_000).toFixed(1)}M NOK is ${(impactRatio * 100).toFixed(2)}% of daily volume — may move price`;
      highCount++;
    } else if (impactRatio > 0.001) {
      level = "medium";
      warning = `Trade value ${(value / 1_000_000).toFixed(1)}M NOK is ${(impactRatio * 100).toFixed(3)}% of daily volume — monitor closely`;
      mediumCount++;
    }

    totalImpact += impactRatio;

    checks.push({
      symbol,
      tradeValueNok: value,
      estimatedDailyVolume: dailyVol,
      impactRatio,
      impactLevel: level,
      warning,
    });
  }

  const n = trades.length;

  return {
    period: { hours },
    checks: checks.sort((a, b) => b.impactRatio - a.impactRatio),
    summary: {
      highImpactCount: highCount,
      mediumImpactCount: mediumCount,
      totalTrades: n,
      avgImpactRatio: n > 0 ? totalImpact / n : 0,
      alertTriggered: highCount > 0 || mediumCount > 3,
    },
  };
}
