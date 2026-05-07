/**
 * Risk Management System - UNIFIED VERSION
 * Uses trading_sessions and trades tables only
 */

import { createClient } from "@/lib/supabase/server";

export interface RiskConfig {
  maxPositionSizePercent: number;
  stopLossPercent: number;
  trailingStopLossPercent?: number;
  maxDailyLossPercent: number;
  maxDailyTrades: number;
  maxDrawdownPercent: number;
  maxLeverage: number;
  kellyFraction?: number;
  volatilityAdjustment?: boolean;
}

export interface RiskCheckResult {
  allowed: boolean;
  reason?: string;
  suggestedAmount?: number;
  currentExposure?: number;
}

export class RiskManager {
  private config: RiskConfig;

  constructor(config: RiskConfig) {
    this.config = config;
  }

  async canExecuteTrade(params: {
    userId: string;
    sessionId: string;
    tradeAmount: number;
    currentCapital: number;
    direction: "LONG" | "SHORT";
    symbol?: string;
  }): Promise<RiskCheckResult> {
    const { sessionId, tradeAmount, currentCapital, symbol } = params;

    // 1. Check position size limit
    const positionSizePercent = (tradeAmount / currentCapital) * 100;
    if (positionSizePercent > this.config.maxPositionSizePercent) {
      const suggestedAmount =
        (currentCapital * this.config.maxPositionSizePercent) / 100;
      return {
        allowed: false,
        reason: `Posisjonsstørrelse (${positionSizePercent.toFixed(2)}%) overstiger maksimum (${this.config.maxPositionSizePercent}%)`,
        suggestedAmount,
        currentExposure: await this.getCurrentExposure(sessionId),
      };
    }

    // 2. Check daily loss limit
    const todayPnL = await this.getTodayPnL(sessionId);
    const todayLossPercent =
      (Math.abs(Math.min(todayPnL, 0)) / currentCapital) * 100;
    if (todayLossPercent >= this.config.maxDailyLossPercent) {
      return {
        allowed: false,
        reason: `Daglig tapsgrense nådd (${todayLossPercent.toFixed(2)}% / ${this.config.maxDailyLossPercent}%). Trading er deaktivert for i dag.`,
        currentExposure: await this.getCurrentExposure(sessionId),
      };
    }

    // 3. Check daily trade count
    const todayTradeCount = await this.getTodayTradeCount(sessionId);
    if (todayTradeCount >= this.config.maxDailyTrades) {
      return {
        allowed: false,
        reason: `Daglig handelsgrense nådd (${todayTradeCount} / ${this.config.maxDailyTrades})`,
        currentExposure: await this.getCurrentExposure(sessionId),
      };
    }

    // 4. Check max drawdown
    const drawdown = await this.getCurrentDrawdown(sessionId);
    if (drawdown >= this.config.maxDrawdownPercent) {
      return {
        allowed: false,
        reason: `Maks drawdown overskredet (${drawdown.toFixed(2)}% / ${this.config.maxDrawdownPercent}%). Trading stoppet for å beskytte kapital.`,
        currentExposure: await this.getCurrentExposure(sessionId),
      };
    }

    // 5. Check symbol exposure (only for BUY/LONG — sell reduces exposure)
    if (symbol && params.direction === "LONG") {
      const symbolExposure = await this.getSymbolExposure(sessionId, symbol);
      const maxSymbolExposure = this.config.maxPositionSizePercent * 2;
      if (symbolExposure + positionSizePercent > maxSymbolExposure) {
        return {
          allowed: false,
          reason: `For høy eksponering mot ${symbol} (${symbolExposure.toFixed(2)}% + ${positionSizePercent.toFixed(2)}%). Diversifiser risiko.`,
          currentExposure: symbolExposure,
        };
      }
    }

    // 6. Correlation guard: check total exposure across all active sessions for this user
    const userId = params.userId;
    if (symbol && params.direction === "LONG") {
      const totalSymbolExposure = await this.getTotalUserSymbolExposure(userId, symbol);
      const correlationCap = 30; // Max 30% of total portfolio in one coin
      if (totalSymbolExposure + positionSizePercent > correlationCap) {
        return {
          allowed: false,
          reason: `Porteføljegrense for ${symbol} nådd (${totalSymbolExposure.toFixed(2)}% + ${positionSizePercent.toFixed(2)}% > ${correlationCap}%). Diversifiser for å redusere korrelasjonsrisiko.`,
          currentExposure: totalSymbolExposure,
        };
      }
    }

    return {
      allowed: true,
      currentExposure: await this.getCurrentExposure(sessionId),
    };
  }

  calculateStopLoss(params: {
    entryPrice: number;
    direction: "LONG" | "SHORT";
    useTrailing?: boolean;
    atr?: number;
  }): number {
    const { entryPrice, direction } = params;
    if (direction === "LONG") {
      return entryPrice * (1 - this.config.stopLossPercent / 100);
    } else {
      return entryPrice * (1 + this.config.stopLossPercent / 100);
    }
  }

  calculateTakeProfit(params: {
    entryPrice: number;
    stopLossPrice: number;
    direction: "LONG" | "SHORT";
    riskRewardRatio?: number;
  }): number {
    const {
      entryPrice,
      stopLossPrice,
      direction,
      riskRewardRatio = 2,
    } = params;
    const risk = Math.abs(entryPrice - stopLossPrice);
    const reward = risk * riskRewardRatio;
    return direction === "LONG" ? entryPrice + reward : entryPrice - reward;
  }

  // Private helpers - all using unified trades table
  private async getTodayPnL(sessionId: string): Promise<number> {
    const supabase = createClient();
    const today = new Date().toISOString().split("T")[0];

    const { data } = await supabase
      .from("trades")
      .select("realized_pnl")
      .eq("session_id", sessionId)
      .gte("executed_at", today)
      .not("realized_pnl", "is", null);

    return data?.reduce((sum, t) => sum + (t.realized_pnl || 0), 0) || 0;
  }

  private async getTodayTradeCount(sessionId: string): Promise<number> {
    const supabase = createClient();
    const today = new Date().toISOString().split("T")[0];

    const { count } = await supabase
      .from("trades")
      .select("*", { count: "exact", head: true })
      .eq("session_id", sessionId)
      .gte("executed_at", today);

    return count || 0;
  }

  private async getCurrentDrawdown(sessionId: string): Promise<number> {
    const supabase = createClient();

    const { data: trades } = await supabase
      .from("trades")
      .select("realized_pnl, executed_at")
      .eq("session_id", sessionId)
      .order("executed_at", { ascending: true });

    if (!trades || trades.length === 0) return 0;

    const { data: session } = await supabase
      .from("trading_sessions")
      .select("initial_capital")
      .eq("id", sessionId)
      .single();

    const startingCapital = session?.initial_capital || 100000;
    let runningEquity = startingCapital;
    let peak = startingCapital;
    let maxDrawdown = 0;

    for (const trade of trades) {
      runningEquity += trade.realized_pnl || 0;
      peak = Math.max(peak, runningEquity);
      const drawdown = ((peak - runningEquity) / peak) * 100;
      maxDrawdown = Math.max(maxDrawdown, drawdown);
    }

    return maxDrawdown;
  }

  private async getCurrentExposure(sessionId: string): Promise<number> {
    const supabase = createClient();

    const { data: session } = await supabase
      .from("trading_sessions")
      .select("open_position")
      .eq("id", sessionId)
      .single();

    if (!session?.open_position) return 0;

    // Calculate exposure from open position
    const position = session.open_position as {
      quantity: number;
      entry_price: number;
    };
    return (position.quantity || 0) * (position.entry_price || 0);
  }

  private async getSymbolExposure(
    sessionId: string,
    symbol: string,
  ): Promise<number> {
    const supabase = createClient();

    const { data: session } = await supabase
      .from("trading_sessions")
      .select("open_position, trading_pair")
      .eq("id", sessionId)
      .single();

    // If there's an open position in the same symbol
    if (session?.open_position && session.trading_pair === symbol) {
      const position = session.open_position as {
        quantity: number;
        entry_price: number;
      };
      const exposure = (position.quantity || 0) * (position.entry_price || 0);
      const { data: sessionData } = await supabase
        .from("trading_sessions")
        .select("current_capital")
        .eq("id", sessionId)
        .single();

      if (sessionData?.current_capital) {
        return (exposure / sessionData.current_capital) * 100;
      }
    }

    return 0;
  }

  private async getTotalUserSymbolExposure(
    userId: string,
    symbol: string,
  ): Promise<number> {
    const supabase = createClient();

    const { data: sessions } = await supabase
      .from("trading_sessions")
      .select("open_position, current_capital, trading_pair, initial_capital")
      .eq("user_id", userId)
      .eq("status", "active")
      .eq("trading_pair", symbol)
      .not("open_position", "is", null);

    if (!sessions || sessions.length === 0) return 0;

    let totalExposureUsd = 0;
    let totalCapital = 0;
    for (const s of sessions) {
      const pos = s.open_position as { quantity?: number; entry_price?: number } | null;
      if (pos) {
        totalExposureUsd += (pos.quantity || 0) * (pos.entry_price || 0);
      }
      totalCapital += (s.current_capital ?? s.initial_capital ?? 0);
    }

    return totalCapital > 0 ? (totalExposureUsd / totalCapital) * 100 : 0;
  }
}

import {
  OPTIMIZED_PROFILES,
  RiskLevel as OptRiskLevel,
} from "../config/optimized-risk-profiles";

export const DEFAULT_RISK_CONFIGS: Record<OptRiskLevel, RiskConfig> = {
  conservative: {
    maxPositionSizePercent:
      OPTIMIZED_PROFILES.conservative.maxPositionSizePercent,
    stopLossPercent: OPTIMIZED_PROFILES.conservative.stopLossPercent,
    trailingStopLossPercent:
      OPTIMIZED_PROFILES.conservative.trailingStopPercent,
    maxDailyLossPercent: OPTIMIZED_PROFILES.conservative.maxDailyLossPercent,
    maxDailyTrades: OPTIMIZED_PROFILES.conservative.maxTradesPerDay,
    maxDrawdownPercent: OPTIMIZED_PROFILES.conservative.maxTotalDrawdownPercent,
    maxLeverage: OPTIMIZED_PROFILES.conservative.maxLeverage,
    kellyFraction: OPTIMIZED_PROFILES.conservative.kellyFraction,
    volatilityAdjustment: OPTIMIZED_PROFILES.conservative.volatilityAdjustment,
  },
  moderate: {
    maxPositionSizePercent: OPTIMIZED_PROFILES.moderate.maxPositionSizePercent,
    stopLossPercent: OPTIMIZED_PROFILES.moderate.stopLossPercent,
    trailingStopLossPercent: OPTIMIZED_PROFILES.moderate.trailingStopPercent,
    maxDailyLossPercent: OPTIMIZED_PROFILES.moderate.maxDailyLossPercent,
    maxDailyTrades: OPTIMIZED_PROFILES.moderate.maxTradesPerDay,
    maxDrawdownPercent: OPTIMIZED_PROFILES.moderate.maxTotalDrawdownPercent,
    maxLeverage: OPTIMIZED_PROFILES.moderate.maxLeverage,
    kellyFraction: OPTIMIZED_PROFILES.moderate.kellyFraction,
    volatilityAdjustment: OPTIMIZED_PROFILES.moderate.volatilityAdjustment,
  },
  aggressive: {
    maxPositionSizePercent:
      OPTIMIZED_PROFILES.aggressive.maxPositionSizePercent,
    stopLossPercent: OPTIMIZED_PROFILES.aggressive.stopLossPercent,
    trailingStopLossPercent: OPTIMIZED_PROFILES.aggressive.trailingStopPercent,
    maxDailyLossPercent: OPTIMIZED_PROFILES.aggressive.maxDailyLossPercent,
    maxDailyTrades: OPTIMIZED_PROFILES.aggressive.maxTradesPerDay,
    maxDrawdownPercent: OPTIMIZED_PROFILES.aggressive.maxTotalDrawdownPercent,
    maxLeverage: OPTIMIZED_PROFILES.aggressive.maxLeverage,
    kellyFraction: OPTIMIZED_PROFILES.aggressive.kellyFraction,
    volatilityAdjustment: OPTIMIZED_PROFILES.aggressive.volatilityAdjustment,
  },
  dynamic: {
    maxPositionSizePercent: OPTIMIZED_PROFILES.dynamic.maxPositionSizePercent,
    stopLossPercent: OPTIMIZED_PROFILES.dynamic.stopLossPercent,
    trailingStopLossPercent: OPTIMIZED_PROFILES.dynamic.trailingStopPercent,
    maxDailyLossPercent: OPTIMIZED_PROFILES.dynamic.maxDailyLossPercent,
    maxDailyTrades: OPTIMIZED_PROFILES.dynamic.maxTradesPerDay,
    maxDrawdownPercent: OPTIMIZED_PROFILES.dynamic.maxTotalDrawdownPercent,
    maxLeverage: OPTIMIZED_PROFILES.dynamic.maxLeverage,
    kellyFraction: OPTIMIZED_PROFILES.dynamic.kellyFraction,
    volatilityAdjustment: OPTIMIZED_PROFILES.dynamic.volatilityAdjustment,
  },
};

export function createRiskManager(riskLevel: string): RiskManager {
  // Map our UI risk strings to the OptimizedProfile keys
  // Supports: safe/balanced/offensive/aggressive/dynamic + low/medium/high + conservative/moderate
  let optLevel: OptRiskLevel = "moderate";
  if (riskLevel === "safe" || riskLevel === "conservative" || riskLevel === "low")
    optLevel = "conservative";
  else if (riskLevel === "balanced" || riskLevel === "moderate" || riskLevel === "medium")
    optLevel = "moderate";
  else if (riskLevel === "offensive" || riskLevel === "aggressive" || riskLevel === "high")
    optLevel = "aggressive";
  else if (riskLevel === "dynamic")
    optLevel = "dynamic";

  const config =
    DEFAULT_RISK_CONFIGS[optLevel] || DEFAULT_RISK_CONFIGS.moderate;
  return new RiskManager(config);
}
