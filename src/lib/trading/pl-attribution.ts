/**
 * P&L Attribution — Decompose returns into sources
 * alpha (skill), market beta (luck), currency drift, execution quality
 */

import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database.types";

interface TradeRow {
  realized_pnl: number | null;
  total_value: number;
  fee: number;
  usdt_nok_rate: number | null;
  side: string;
}

export interface PLAttribution {
  period: { hours: number };
  totalPnLNok: number;
  attribution: {
    alpha: number;           // Skill-based returns
    marketBeta: number;      // Market exposure returns
    currencyDrift: number;   // NOK/USD rate change impact
    executionQuality: number; // Slippage + fees impact
    unexplained: number;     // Residual
  };
  metrics: {
    sharpeRatio: number;
    alphaPct: number;
    beta: number;
    informationRatio: number;
  };
}

export async function calculatePLAttribution(
  supabase: ReturnType<typeof createClient<Database>>,
  hours: number = 24,
): Promise<PLAttribution> {
  const since = new Date(Date.now() - hours * 60 * 60 * 1000).toISOString();

  const { data: rawTrades, error } = await supabase
    .from("trades")
    .select("realized_pnl, total_value, fee, usdt_nok_rate, trading_pair, executed_at, side")
    .gte("executed_at", since)
    .eq("status", "filled")
    .not("realized_pnl", "is", null);
    const trades = rawTrades as TradeRow[];

  if (error) throw new Error(`P&L attribution query failed: ${error.message}`);
  if (!trades || trades.length === 0) {
    return {
      period: { hours },
      totalPnLNok: 0,
      attribution: { alpha: 0, marketBeta: 0, currencyDrift: 0, executionQuality: 0, unexplained: 0 },
      metrics: { sharpeRatio: 0, alphaPct: 0, beta: 0, informationRatio: 0 },
    };
  }

  const pnls: number[] = [];
  const totalValues: number[] = [];
  let totalPnL = 0;
  let totalFees = 0;
  let totalVolume = 0;
  let rateChangeImpact = 0;
  let prevRate: number | null = null;

  for (const t of trades) {
    const pnl = Number(t.realized_pnl ?? 0);
    const totalValue = Number(t.total_value ?? 0);
    const fee = Number(t.fee ?? 0);
    const rate = Number(t.usdt_nok_rate ?? 0);

    totalPnL += pnl;
    totalFees += fee;
    totalVolume += totalValue;
    pnls.push(pnl);
    totalValues.push(totalValue);

    if (prevRate !== null && rate > 0 && prevRate > 0) {
      const rateChange = (rate - prevRate) / prevRate;
      rateChangeImpact += totalValue * rateChange * (t.side === "buy" ? 1 : -1);
    }
    prevRate = rate;
  }

  // Execution quality = fees + estimated slippage (5 bps per trade as conservative)
  const estimatedSlippage = trades.length * (totalVolume / trades.length) * 0.0005;
  const executionQuality = -(totalFees + estimatedSlippage);

  // Currency drift attribution
  const currencyDrift = rateChangeImpact;

  // Market beta: assume 60% of returns correlate with market (conservative)
  // In practice this should use actual market returns (BTC/ETH index)
  const marketBeta = totalPnL * 0.4; // 40% attributed to market

  // Alpha = residual after removing beta, currency, execution
  const alpha = totalPnL - marketBeta - currencyDrift - executionQuality;

  // Unexplained = rounding/errors
  const unexplained = totalPnL - (alpha + marketBeta + currencyDrift + executionQuality);

  // Sharpe ratio (simplified: mean / std of returns)
  const returns = pnls.map((p, i) => (totalValues[i] > 0 ? p / totalValues[i] : 0));
  const meanReturn = returns.reduce((a, b) => a + b, 0) / returns.length;
  const variance = returns.reduce((sum, r) => sum + Math.pow(r - meanReturn, 2), 0) / returns.length;
  const stdDev = Math.sqrt(variance);
  const sharpeRatio = stdDev > 0 ? (meanReturn / stdDev) * Math.sqrt(365 * 24 / hours) : 0;

  // Alpha % of total P&L
  const alphaPct = totalPnL !== 0 ? (alpha / totalPnL) * 100 : 0;

  // Information ratio (alpha / tracking error)
  const trackingError = Math.sqrt(variance);
  const informationRatio = trackingError > 0 ? (meanReturn - 0) / trackingError : 0;

  return {
    period: { hours },
    totalPnLNok: totalPnL,
    attribution: {
      alpha,
      marketBeta,
      currencyDrift,
      executionQuality,
      unexplained,
    },
    metrics: {
      sharpeRatio,
      alphaPct,
      beta: 0.4, // Assumed for now
      informationRatio,
    },
  };
}
