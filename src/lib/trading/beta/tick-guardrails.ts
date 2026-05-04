/**
 * Tick Guardrails — Lightweight beta safety for the tick engine
 *
 * Evaluates user guardrails using DB state (not in-memory).
 * Suitable for stateless cron execution.
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database.types";

export interface GuardrailConfig {
  /** Max daily loss in USD (negative) */
  dailyPnlCap: number;
  /** Max drawdown percentage (0.15 = 15%) */
  maxDrawdownPct: number;
  /** Max consecutive losses before auto-pause */
  maxConsecutiveLosses: number;
  /** Volatility multiplier threshold */
  volatilityThreshold: number;
}

export const DEFAULT_GUARDRAIL_CONFIG: GuardrailConfig = {
  dailyPnlCap: -500,
  maxDrawdownPct: 0.15,
  maxConsecutiveLosses: 5,
  volatilityThreshold: 2.5,
};

export interface GuardrailResult {
  allowed: boolean;
  action: "continue" | "warn" | "pause" | "kill";
  reason?: string;
  metrics: {
    dailyPnl: number;
    dailyTrades: number;
    consecutiveLosses: number;
    drawdownPct: number;
  };
}

/**
 * Fetch today's trades for a user to compute guardrail metrics.
 */
export async function getTodayTradeMetrics(
  db: SupabaseClient<Database>,
  userId: string,
): Promise<{ dailyPnl: number; dailyTrades: number; consecutiveLosses: number }> {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const { data: trades } = await db
    .from("trades")
    .select("realized_pnl, side, created_at")
    .eq("user_id", userId)
    .gte("created_at", today.toISOString())
    .order("created_at", { ascending: false });

  if (!trades || trades.length === 0) {
    return { dailyPnl: 0, dailyTrades: 0, consecutiveLosses: 0 };
  }

  const dailyPnl = trades.reduce((sum, t) => sum + (t.realized_pnl || 0), 0);

  // Count consecutive losses (from most recent)
  let consecutiveLosses = 0;
  for (const trade of trades) {
    const pnl = trade.realized_pnl || 0;
    if (pnl < 0) consecutiveLosses++;
    else break;
  }

  return {
    dailyPnl,
    dailyTrades: trades.length,
    consecutiveLosses,
  };
}

/**
 * Evaluate guardrails for a user before allowing a trade.
 */
export async function evaluateGuardrails(
  db: SupabaseClient<Database>,
  userId: string,
  currentCapital: number,
  initialCapital: number,
  config: GuardrailConfig = DEFAULT_GUARDRAIL_CONFIG,
): Promise<GuardrailResult> {
  const metrics = await getTodayTradeMetrics(db, userId);
  const drawdownPct = initialCapital > 0
    ? (initialCapital - currentCapital) / initialCapital
    : 0;

  // Daily loss cap
  if (metrics.dailyPnl <= config.dailyPnlCap) {
    return {
      allowed: false,
      action: "kill",
      reason: `Daily loss cap reached: $${metrics.dailyPnl.toFixed(2)} (limit: $${config.dailyPnlCap})`,
      metrics: { ...metrics, drawdownPct },
    };
  }

  // Approaching daily loss (warn)
  if (metrics.dailyPnl <= config.dailyPnlCap * 0.8) {
    return {
      allowed: true,
      action: "warn",
      reason: `Daily loss at ${(metrics.dailyPnl / config.dailyPnlCap * 100).toFixed(0)}% of cap`,
      metrics: { ...metrics, drawdownPct },
    };
  }

  // Max drawdown
  if (drawdownPct >= config.maxDrawdownPct) {
    return {
      allowed: false,
      action: "kill",
      reason: `Max drawdown reached: ${(drawdownPct * 100).toFixed(2)}% (limit: ${(config.maxDrawdownPct * 100).toFixed(0)}%)`,
      metrics: { ...metrics, drawdownPct },
    };
  }

  // Consecutive losses
  if (metrics.consecutiveLosses >= config.maxConsecutiveLosses) {
    return {
      allowed: false,
      action: "pause",
      reason: `Consecutive losses: ${metrics.consecutiveLosses} (limit: ${config.maxConsecutiveLosses})`,
      metrics: { ...metrics, drawdownPct },
    };
  }

  return {
    allowed: true,
    action: "continue",
    metrics: { ...metrics, drawdownPct },
  };
}

/**
 * Pause a user's sessions.
 */
export async function pauseUserSessions(
  db: SupabaseClient<Database>,
  userId: string,
  reason: string,
): Promise<void> {
  await db
    .from("trading_sessions")
    .update({ status: "paused" } as never)
    .eq("user_id", userId)
    .eq("status", "active");

  await db.from("trading_logs").insert({
    user_id: userId,
    action: "guardrail_pause",
    details: { reason } as never,
  } as never);
}
