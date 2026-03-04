/**
 * Copy Trading Risk Manager
 * Validates each copy trade against follower's risk parameters before execution.
 */

import type { TradingSignal } from "@/lib/auto-trading/types";
import type { CopyConfig } from "@/store/copy-store";

interface CopyRiskCheck {
  allowed: boolean;
  reason?: string;
  adjustedSignal?: TradingSignal;
}

interface FollowerContext {
  currentCapitalNok: number;
  dailyPnlNok: number;
  currentDrawdownPct: number;
  openPositionCount: number;
  config: CopyConfig;
}

/**
 * Validate whether a copy trade should proceed, and adjust parameters if needed.
 */
export function validateCopyTrade(
  signal: TradingSignal,
  follower: FollowerContext,
): CopyRiskCheck {
  const {
    config,
    currentCapitalNok,
    dailyPnlNok,
    currentDrawdownPct,
    openPositionCount,
  } = follower;

  // Check 1: Auto-stop on drawdown
  if (currentDrawdownPct >= config.autoStopDrawdownPct) {
    return {
      allowed: false,
      reason: `Drawdown ${currentDrawdownPct.toFixed(1)}% exceeds limit of ${config.autoStopDrawdownPct}%`,
    };
  }

  // Check 2: Max allocation
  const positionValueNok = (signal.position_size_pct / 100) * currentCapitalNok;
  if (positionValueNok > config.maxAllocationNok) {
    // Adjust position size to fit within allocation
    const adjustedSizePct = (config.maxAllocationNok / currentCapitalNok) * 100;
    return {
      allowed: true,
      reason: `Position size reduced to fit ${config.maxAllocationNok} NOK allocation`,
      adjustedSignal: {
        ...signal,
        position_size_pct: Math.min(adjustedSizePct, signal.position_size_pct),
      },
    };
  }

  // Check 3: Leverage limit
  if (signal.leverage > config.maxLeverage) {
    return {
      allowed: true,
      reason: `Leverage reduced from ${signal.leverage}x to ${config.maxLeverage}x`,
      adjustedSignal: {
        ...signal,
        leverage: config.maxLeverage,
      },
    };
  }

  // Check 4: Sufficient capital
  const requiredCapital = positionValueNok / signal.leverage;
  if (requiredCapital > currentCapitalNok * 0.9) {
    return {
      allowed: false,
      reason: `Insufficient capital: need ${requiredCapital.toFixed(0)} NOK, have ${currentCapitalNok.toFixed(0)} NOK`,
    };
  }

  // Check 5: Max open positions (hard limit of 10)
  if (openPositionCount >= 10) {
    return {
      allowed: false,
      reason: "Maximum 10 open copy positions",
    };
  }

  // Check 6: Daily loss circuit breaker (-5% of capital)
  const dailyLossLimit = currentCapitalNok * 0.05;
  if (dailyPnlNok < -dailyLossLimit) {
    return {
      allowed: false,
      reason: `Daily loss limit reached: ${dailyPnlNok.toFixed(0)} NOK`,
    };
  }

  return { allowed: true };
}

/**
 * Calculate proportional position size based on follower's capital
 * relative to the leader's capital.
 */
export function calculateProportionalSize(
  leaderPositionPct: number,
  leaderCapitalNok: number,
  followerCapitalNok: number,
  maxAllocationNok: number,
): number {
  const ratio = followerCapitalNok / leaderCapitalNok;
  const proportionalPct = leaderPositionPct * ratio;

  // Cap at max allocation
  const maxPct = (maxAllocationNok / followerCapitalNok) * 100;
  return Math.min(proportionalPct, maxPct);
}
