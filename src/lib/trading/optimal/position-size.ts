/**
 * Dynamic Position Sizing — Kelly + ATR + Regime + Drawdown
 *
 * Combines multiple factors to calculate optimal position size per trade:
 * 1. Kelly criterion (historical win rate + avg win/loss)
 * 2. ATR-based volatility adjustment
 * 3. Market regime multiplier
 * 4. Drawdown-based reduction
 * 5. Portfolio-level caps
 */

import { calculateKelly, updateKellyStats, type KellyStats } from "./kelly";
import { atr } from "../strategies/indicators";
import type { Candle } from "../strategies/types";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database.types";

export interface PositionSizeInput {
  userId: string;
  sessionId: string;
  strategyId: string;
  currentCapital: number;
  initialCapital: number;
  candles: Candle[];
  regime?: string;
  signalAction: "buy" | "sell" | "hold";
  basePositionSize?: number; // from strategy config
  riskProfile?: "conservative" | "balanced" | "aggressive";
}

export interface PositionSizeResult {
  positionSize: number; // fraction of capital (0.01 = 1%)
  kellyFraction: number;
  atrMultiplier: number;
  regimeMultiplier: number;
  drawdownMultiplier: number;
  rawSize: number;
  reason: string;
}

const REGIME_MULTIPLIERS: Record<string, number> = {
  bull: 1.2,
  bear: 0.8,
  chop: 0.9,
  "high-vol": 0.3,
  ranging: 1.0,
  trending_up: 1.1,
  trending_down: 0.7,
  volatile: 0.4,
  unknown: 0.5,
};

/**
 * Calculate dynamic position size for a trade.
 */
export async function calculateDynamicPositionSize(
  db: SupabaseClient<Database>,
  input: PositionSizeInput,
): Promise<PositionSizeResult> {
  const {
    userId,
    strategyId,
    currentCapital,
    initialCapital,
    candles,
    regime = "unknown",
    basePositionSize = 0.1,
    riskProfile = "balanced",
  } = input;

  // ── 1. KELLY CRITERION ──────────────────────────────────────────────────
  let kellyFraction = 0;
  let kellyStats: KellyStats | null = null;
  try {
    kellyStats = await updateKellyStats(userId, strategyId);
    kellyFraction = calculateKelly(kellyStats, riskProfile, regime as never);
  } catch {
    // Fallback: use base position size as starting point
    kellyFraction = basePositionSize * 0.5;
  }

  // If insufficient sample size (< 10 trades), use conservative default
  if (!kellyStats || kellyStats.sampleSize < 10) {
    kellyFraction = Math.min(basePositionSize * 0.6, 0.05); // Cap at 5% for new strategies
  }

  // ── 2. ATR VOLATILITY ADJUSTMENT ────────────────────────────────────────
  let atrMultiplier = 1.0;
  if (candles.length >= 14) {
    const highs = candles.map((c) => c.high);
    const lows = candles.map((c) => c.low);
    const closes = candles.map((c) => c.close);
    const atrValue = atr(highs, lows, closes, 14);
    const currentPrice = closes[closes.length - 1];
    const atrPct = (atrValue / currentPrice) * 100;

    // Higher ATR = lower position size
    // Normal ATR for BTC ~2-3%, so scale around that
    if (atrPct > 5) {
      atrMultiplier = 0.3; // Extreme volatility
    } else if (atrPct > 3.5) {
      atrMultiplier = 0.5; // High volatility
    } else if (atrPct > 2) {
      atrMultiplier = 0.8; // Moderate volatility
    } else if (atrPct < 1) {
      atrMultiplier = 1.2; // Low volatility = can size up
    }
  }

  // ── 3. REGIME MULTIPLIER ────────────────────────────────────────────────
  const regimeMultiplier = REGIME_MULTIPLIERS[regime] ?? REGIME_MULTIPLIERS.unknown;

  // ── 4. DRAWDOWN REDUCTION ───────────────────────────────────────────────
  let drawdownMultiplier = 1.0;
  if (initialCapital > 0) {
    const drawdownPct = ((initialCapital - currentCapital) / initialCapital) * 100;
    if (drawdownPct >= 10) {
      drawdownMultiplier = 0.2; // Severe drawdown: minimal sizing
    } else if (drawdownPct >= 7) {
      drawdownMultiplier = 0.4;
    } else if (drawdownPct >= 5) {
      drawdownMultiplier = 0.6;
    } else if (drawdownPct >= 3) {
      drawdownMultiplier = 0.8;
    }
  }

  // ── 5. COMBINE ──────────────────────────────────────────────────────────
  const rawSize = kellyFraction * atrMultiplier * regimeMultiplier * drawdownMultiplier;

  // ── 6. GUARDRAILS ───────────────────────────────────────────────────────
  // Max 15% per trade (Kelly can be aggressive)
  const maxPositionSize = 0.15;
  // Max 30% of portfolio in open positions
  const portfolioCap = await getPortfolioPositionCap(db, userId, currentCapital);

  const positionSize = Math.min(rawSize, maxPositionSize, portfolioCap);

  const reasons: string[] = [];
  if (kellyStats && kellyStats.sampleSize >= 10) {
    reasons.push(`Kelly ${(kellyFraction * 100).toFixed(2)}% (WR ${(kellyStats.winrate * 100).toFixed(0)}%)`);
  } else {
    reasons.push(`Conservative default (insufficient history)`);
  }
  reasons.push(`ATR×${atrMultiplier.toFixed(1)}`);
  reasons.push(`${regime}×${regimeMultiplier.toFixed(1)}`);
  if (drawdownMultiplier < 1) {
    reasons.push(`DD×${drawdownMultiplier.toFixed(1)}`);
  }

  return {
    positionSize: Math.max(0.005, positionSize), // Minimum 0.5%
    kellyFraction,
    atrMultiplier,
    regimeMultiplier,
    drawdownMultiplier,
    rawSize,
    reason: reasons.join(" | "),
  };
}

/**
 * Calculate max position size based on portfolio-level caps.
 * Ensures total open positions don't exceed 30% of portfolio.
 */
async function getPortfolioPositionCap(
  db: SupabaseClient<Database>,
  userId: string,
  currentCapital: number,
): Promise<number> {
  try {
    const { data: sessions } = await db
      .from("trading_sessions")
      .select("current_capital, initial_capital")
      .eq("user_id", userId)
      .eq("status", "active")
      .not("open_position", "is", null);

    if (!sessions || sessions.length === 0) {
      return 0.15; // No open positions, can use max
    }

    // Calculate total capital committed to open positions
    const totalCommitted = sessions.reduce(
      (sum, s) => sum + (s.initial_capital - (s.current_capital ?? s.initial_capital)),
      0,
    );

    const committedPct = totalCommitted / currentCapital;
    const maxPortfolioPct = 0.30; // Max 30% of portfolio in positions
    const remaining = Math.max(0, maxPortfolioPct - committedPct);

    return Math.min(0.15, remaining);
  } catch {
    return 0.15;
  }
}
