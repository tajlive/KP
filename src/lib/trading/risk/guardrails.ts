/**
 * Risk Guardrails - Additional safety layer for trading strategies
 * 
 * Implements:
 * - Daily drawdown cap per strategy (-2% default)
 * - Edge filter (expected edge after fees)
 * - Global account risk limit enforcement
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database.types";

export interface GuardrailConfig {
  /** Max daily drawdown % per strategy (default: 2%) */
  maxDailyDrawdownPercent: number;
  /** Minimum expected edge after fees % (default: 0.1%) */
  minEdgeAfterFeesPercent: number;
  /** Trading fee % (default: 0.1% per side) */
  tradingFeePercent: number;
  /** Global account risk limit % (default: 2% per day) */
  globalAccountRiskLimitPercent: number;
}

export const DEFAULT_GUARDRAIL_CONFIG: GuardrailConfig = {
  maxDailyDrawdownPercent: 2.0,
  minEdgeAfterFeesPercent: 0.1,
  tradingFeePercent: 0.1,
  globalAccountRiskLimitPercent: 2.0,
};

export interface GuardrailCheck {
  allowed: boolean;
  reason?: string;
  currentDrawdown?: number;
  expectedEdge?: number;
  globalRiskUsed?: number;
}

/**
 * Calculate expected edge after fees for a potential trade
 */
export function calculateExpectedEdge(
  entryPrice: number,
  targetPrice: number,
  feePercent: number = 0.1,
): number {
  const grossEdge = (targetPrice - entryPrice) / entryPrice * 100;
  const totalFees = feePercent * 2; // Entry + exit
  return grossEdge - totalFees;
}

/**
 * Risk Guardrails - Additional safety checks beyond basic RiskManager
 */
export class RiskGuardrails {
  private config: GuardrailConfig;
  private db: SupabaseClient<Database>;

  constructor(
    db: SupabaseClient<Database>,
    config: Partial<GuardrailConfig> = {},
  ) {
    this.db = db;
    this.config = { ...DEFAULT_GUARDRAIL_CONFIG, ...config };
  }

  /**
   * Check all guardrails before executing trade
   */
  async checkTrade(
    sessionId: string,
    userId: string,
    entryPrice: number,
    signalConfidence?: number,
  ): Promise<GuardrailCheck> {
    // 1. Check daily drawdown per strategy
    const drawdownCheck = await this.checkDailyDrawdown(sessionId);
    if (!drawdownCheck.allowed) {
      return drawdownCheck;
    }

    // 2. Check edge filter (if we have signal confidence)
    if (signalConfidence !== undefined) {
      const edgeCheck = this.checkEdgeFilter(entryPrice, signalConfidence);
      if (!edgeCheck.allowed) {
        return edgeCheck;
      }
    }

    // 3. Check global account risk limit
    const globalRiskCheck = await this.checkGlobalAccountRisk(userId);
    if (!globalRiskCheck.allowed) {
      return globalRiskCheck;
    }

    return { allowed: true };
  }

  /**
   * Check if daily drawdown for this strategy exceeds limit
   */
  private async checkDailyDrawdown(sessionId: string): Promise<GuardrailCheck> {
    const today = new Date().toISOString().split("T")[0];

    const { data: session } = await this.db
      .from("trading_sessions")
      .select("initial_capital, current_capital, strategy_id")
      .eq("id", sessionId)
      .single();

    if (!session) {
      return { allowed: false, reason: "Session not found" };
    }

    const initialCapital = parseFloat(String(session.initial_capital ?? 0));
    const currentCapital = parseFloat(String(session.current_capital ?? 0));

    if (initialCapital <= 0) {
      return { allowed: true }; // Can't calculate drawdown without initial capital
    }

    const pnl = currentCapital - initialCapital;
    const drawdownPercent = (Math.min(pnl, 0) / initialCapital) * 100;
    const absoluteDrawdown = Math.abs(drawdownPercent);

    if (absoluteDrawdown >= this.config.maxDailyDrawdownPercent) {
      return {
        allowed: false,
        reason: `GUARDRAIL: Daily drawdown cap reached for ${session.strategy_id} strategy (${absoluteDrawdown.toFixed(2)}% / ${this.config.maxDailyDrawdownPercent}%). Trading paused for today.`,
        currentDrawdown: absoluteDrawdown,
      };
    }

    return { allowed: true, currentDrawdown: absoluteDrawdown };
  }

  /**
   * Check if expected edge after fees meets minimum threshold
   */
  private checkEdgeFilter(
    entryPrice: number,
    signalConfidence: number,
  ): GuardrailCheck {
    // Estimate target based on signal confidence
    // Higher confidence = higher expected move
    const expectedMovePercent = signalConfidence * 0.5; // Max 0.5% expected move
    const targetPrice = entryPrice * (1 + expectedMovePercent / 100);

    const expectedEdge = calculateExpectedEdge(
      entryPrice,
      targetPrice,
      this.config.tradingFeePercent,
    );

    if (expectedEdge < this.config.minEdgeAfterFeesPercent) {
      return {
        allowed: false,
        reason: `GUARDRAIL: Expected edge (${expectedEdge.toFixed(3)}%) below threshold (${this.config.minEdgeAfterFeesPercent}%) after fees. Skipping trade.`,
        expectedEdge,
      };
    }

    return { allowed: true, expectedEdge };
  }

  /**
   * Check global account risk limit across all strategies
   * Ensures 5% bot position doesn't break global 2% account limit
   */
  private async checkGlobalAccountRisk(userId: string): Promise<GuardrailCheck> {
    const today = new Date().toISOString().split("T")[0];

    // Get all active sessions for this user
    const { data: sessions } = await this.db
      .from("trading_sessions")
      .select("initial_capital, current_capital, id")
      .eq("user_id", userId)
      .eq("status", "active");

    if (!sessions || sessions.length === 0) {
      return { allowed: true };
    }

    // Calculate total account equity and PnL
    let totalInitial = 0;
    let totalCurrent = 0;

    for (const session of sessions) {
      totalInitial += parseFloat(String(session.initial_capital ?? 0));
      totalCurrent += parseFloat(String(session.current_capital ?? 0));
    }

    if (totalInitial <= 0) {
      return { allowed: true };
    }

    // Calculate total account drawdown
    const totalPnL = totalCurrent - totalInitial;
    const globalDrawdownPercent = (Math.min(totalPnL, 0) / totalInitial) * 100;
    const absoluteGlobalDrawdown = Math.abs(globalDrawdownPercent);

    // Calculate today's risk usage (open positions + today's trades)
    const { data: todayTrades } = await this.db
      .from("trades")
      .select("total_value, side, status")
      .eq("user_id", userId)
      .gte("created_at", `${today}T00:00:00Z`);

    let todayRiskExposure = 0;
    if (todayTrades) {
      for (const trade of todayTrades) {
        if (trade.status === "filled" || trade.status === "open") {
          todayRiskExposure += parseFloat(String(trade.total_value ?? 0));
        }
      }
    }

    const globalRiskUsed = (todayRiskExposure / totalCurrent) * 100;

    if (absoluteGlobalDrawdown >= this.config.globalAccountRiskLimitPercent) {
      return {
        allowed: false,
        reason: `GUARDRAIL: Global account drawdown limit reached (${absoluteGlobalDrawdown.toFixed(2)}% / ${this.config.globalAccountRiskLimitPercent}%). All trading paused.`,
        globalRiskUsed,
      };
    }

    if (globalRiskUsed >= this.config.globalAccountRiskLimitPercent) {
      return {
        allowed: false,
        reason: `GUARDRAIL: Global daily risk limit reached (${globalRiskUsed.toFixed(2)}% / ${this.config.globalAccountRiskLimitPercent}%). Wait for positions to close.`,
        globalRiskUsed,
      };
    }

    return { allowed: true, globalRiskUsed };
  }
}

/**
 * Calculate position size respecting both bot-level and global limits
 */
export function calculateSafePositionSize(
  botCapital: number,
  accountEquity: number,
  botPositionPercent: number = 5, // 5% of bot capital
  globalRiskLimitPercent: number = 2, // 2% of account
): number {
  // Bot-level position size
  const botPosition = botCapital * (botPositionPercent / 100);

  // Global account-level limit
  const globalLimit = accountEquity * (globalRiskLimitPercent / 100);

  // Take the minimum to respect both limits
  const safePosition = Math.min(botPosition, globalLimit);

  return safePosition;
}
