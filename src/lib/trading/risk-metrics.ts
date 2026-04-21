/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * ADVANCED RISK METRICS — Pure function library for trading risk analysis
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * All functions are pure (no side effects), stateless, and fully testable.
 * Uses precise math for financial calculations.
 *
 * @module lib/trading/risk-metrics
 */

import type { BacktestTrade } from "./backtestEngine";

// ============================================================================
// SORTINO RATIO
// ============================================================================

/**
 * Sortino ratio — risk-adjusted return using only downside volatility.
 * Unlike Sharpe which penalizes ALL volatility, Sortino only penalizes
 * downside deviation (returns below MAR).
 *
 * Formula: (mean_return - risk_free_rate) / downside_deviation
 *
 * @param returns - Array of periodic returns (e.g., daily returns as decimals)
 * @param riskFreeRate - Risk-free rate for the same period (e.g., daily)
 * @returns Sortino ratio, or Infinity if no downside deviation
 */
export function calculateSortino(
  returns: number[],
  riskFreeRate: number = 0,
): number {
  if (returns.length < 2) return 0;

  const meanReturn =
    returns.reduce((sum, r) => sum + r, 0) / returns.length;

  // Downside deviation: sqrt(mean(min(r - MAR, 0)^2))
  // MAR = Minimum Acceptable Return = riskFreeRate
  const downsideSquares = returns.map((r) => {
    const diff = r - riskFreeRate;
    return diff < 0 ? diff * diff : 0;
  });

  const meanDownsideSquare =
    downsideSquares.reduce((sum, d) => sum + d, 0) / downsideSquares.length;

  const downsideDeviation = Math.sqrt(meanDownsideSquare);

  if (downsideDeviation === 0) {
    return meanReturn > riskFreeRate ? Infinity : 0;
  }

  return (meanReturn - riskFreeRate) / downsideDeviation;
}

/**
 * Annualized Sortino ratio from daily returns.
 */
export function calculateAnnualizedSortino(
  dailyReturns: number[],
  annualRiskFreeRate: number = 0.03,
): number {
  const dailyRfr = annualRiskFreeRate / 365;
  const dailySortino = calculateSortino(dailyReturns, dailyRfr);

  // Annualize: multiply by sqrt(365)
  return dailySortino * Math.sqrt(365);
}

// ============================================================================
// CALMAR RATIO
// ============================================================================

/**
 * Calmar ratio — annualized return / maximum drawdown.
 * Higher is better. Measures return per unit of drawdown risk.
 *
 * @param annualizedReturn - Annualized return as decimal (e.g., 0.15 for 15%)
 * @param maxDrawdown - Maximum drawdown as positive decimal (e.g., 0.20 for 20%)
 * @returns Calmar ratio, or Infinity if no drawdown
 */
export function calculateCalmar(
  annualizedReturn: number,
  maxDrawdown: number,
): number {
  const absDrawdown = Math.abs(maxDrawdown);
  if (absDrawdown === 0) {
    return annualizedReturn > 0 ? Infinity : 0;
  }
  return annualizedReturn / absDrawdown;
}

// ============================================================================
// VALUE AT RISK (VaR) — Historical
// ============================================================================

/**
 * Historical Value at Risk.
 * "What is the maximum expected loss at a given confidence level?"
 *
 * Example: VaR(95%) = -2% means "We expect to lose at most 2% on 95% of days."
 *
 * @param returns - Array of periodic returns (decimals)
 * @param confidence - Confidence level (e.g., 0.95 for 95%)
 * @returns VaR as a negative number (loss), or 0 if insufficient data
 */
export function calculateVaR(
  returns: number[],
  confidence: number = 0.95,
): number {
  if (returns.length < 2) return 0;

  const sorted = [...returns].sort((a, b) => a - b);
  const index = Math.floor((1 - confidence) * sorted.length);

  // Edge: if index is 0, use the worst return
  return sorted[Math.max(index, 0)];
}

// ============================================================================
// EXPECTED SHORTFALL (CVaR / Conditional VaR)
// ============================================================================

/**
 * Expected Shortfall (CVaR) — average of all returns below VaR.
 * "Given that we exceeded VaR, what is the average loss?"
 *
 * More conservative than VaR because it captures tail risk.
 *
 * @param returns - Array of periodic returns (decimals)
 * @param confidence - Confidence level (e.g., 0.95)
 * @returns ES as a negative number, or 0 if insufficient data
 */
export function calculateExpectedShortfall(
  returns: number[],
  confidence: number = 0.95,
): number {
  if (returns.length < 2) return 0;

  const sorted = [...returns].sort((a, b) => a - b);
  const varIndex = Math.floor((1 - confidence) * sorted.length);

  // Include all returns at or below the VaR threshold index
  const cutoff = Math.max(varIndex + 1, 1);
  const tailReturns = sorted.slice(0, cutoff);

  if (tailReturns.length === 0) return 0;

  return tailReturns.reduce((sum, r) => sum + r, 0) / tailReturns.length;
}

// ============================================================================
// MAX CONSECUTIVE LOSSES
// ============================================================================

/**
 * Maximum number of consecutive losing trades.
 *
 * @param trades - Array of BacktestTrade objects
 * @returns Maximum consecutive loss streak
 */
export function calculateMaxConsecutiveLosses(
  trades: Pick<BacktestTrade, "pnl">[],
): number {
  if (trades.length === 0) return 0;

  let maxStreak = 0;
  let currentStreak = 0;

  for (const trade of trades) {
    if (trade.pnl < 0) {
      currentStreak++;
      maxStreak = Math.max(maxStreak, currentStreak);
    } else {
      currentStreak = 0;
    }
  }

  return maxStreak;
}

/**
 * Maximum consecutive wins.
 */
export function calculateMaxConsecutiveWins(
  trades: Pick<BacktestTrade, "pnl">[],
): number {
  if (trades.length === 0) return 0;

  let maxStreak = 0;
  let currentStreak = 0;

  for (const trade of trades) {
    if (trade.pnl > 0) {
      currentStreak++;
      maxStreak = Math.max(maxStreak, currentStreak);
    } else {
      currentStreak = 0;
    }
  }

  return maxStreak;
}

// ============================================================================
// TIME TO RECOVERY
// ============================================================================

/**
 * Average number of periods to recover from a drawdown.
 * A "recovery" is when equity returns to or exceeds the previous all-time high.
 *
 * @param equityCurve - Array of equity values over time
 * @returns Average recovery time in periods (0 if no drawdowns)
 */
export function calculateTimeToRecovery(equityCurve: number[]): number {
  if (equityCurve.length < 2) return 0;

  let ath = equityCurve[0];
  let drawdownStart: number | null = null;
  const recoveryTimes: number[] = [];

  for (let i = 1; i < equityCurve.length; i++) {
    const equity = equityCurve[i];

    if (equity >= ath) {
      // New ATH or recovery
      if (drawdownStart !== null) {
        // We recovered — record time
        recoveryTimes.push(i - drawdownStart);
        drawdownStart = null;
      }
      ath = equity;
    } else if (drawdownStart === null) {
      // Entering a new drawdown
      drawdownStart = i;
    }
  }

  // If we ended in a drawdown that never recovered, don't count it
  // (would bias the average)

  if (recoveryTimes.length === 0) return 0;

  return (
    recoveryTimes.reduce((sum, t) => sum + t, 0) / recoveryTimes.length
  );
}

/**
 * Maximum time to recovery (worst case).
 */
export function calculateMaxTimeToRecovery(equityCurve: number[]): number {
  if (equityCurve.length < 2) return 0;

  let ath = equityCurve[0];
  let drawdownStart: number | null = null;
  let maxRecovery = 0;

  for (let i = 1; i < equityCurve.length; i++) {
    const equity = equityCurve[i];

    if (equity >= ath) {
      if (drawdownStart !== null) {
        maxRecovery = Math.max(maxRecovery, i - drawdownStart);
        drawdownStart = null;
      }
      ath = equity;
    } else if (drawdownStart === null) {
      drawdownStart = i;
    }
  }

  // If still in drawdown at end, count from start to end
  if (drawdownStart !== null) {
    maxRecovery = Math.max(
      maxRecovery,
      equityCurve.length - 1 - drawdownStart,
    );
  }

  return maxRecovery;
}

// ============================================================================
// GAIN/PAIN RATIO
// ============================================================================

/**
 * Gain/Pain ratio — sum of all gains / abs(sum of all losses).
 * Also known as "Profit Factor" in some contexts.
 *
 * @param returns - Array of periodic returns
 * @returns Gain/Pain ratio (>1 is profitable)
 */
export function calculateGainPainRatio(returns: number[]): number {
  if (returns.length === 0) return 0;

  const gains = returns.filter((r) => r > 0).reduce((sum, r) => sum + r, 0);
  const pain = Math.abs(
    returns.filter((r) => r < 0).reduce((sum, r) => sum + r, 0),
  );

  if (pain === 0) {
    return gains > 0 ? Infinity : 0;
  }

  return gains / pain;
}

// ============================================================================
// OMEGA RATIO
// ============================================================================

/**
 * Omega ratio — probability-weighted gains over losses relative to a threshold.
 *
 * Omega = sum(max(r - threshold, 0)) / sum(max(threshold - r, 0))
 *
 * @param returns - Array of periodic returns
 * @param threshold - Minimum acceptable return (default 0)
 * @returns Omega ratio (>1 means more gain than pain above threshold)
 */
export function calculateOmega(
  returns: number[],
  threshold: number = 0,
): number {
  if (returns.length === 0) return 0;

  let gains = 0;
  let losses = 0;

  for (const r of returns) {
    if (r > threshold) {
      gains += r - threshold;
    } else {
      losses += threshold - r;
    }
  }

  if (losses === 0) {
    return gains > 0 ? Infinity : 1;
  }

  return gains / losses;
}

// ============================================================================
// COMPOSITE: Calculate all risk metrics at once
// ============================================================================

export interface RiskMetricsSummary {
  sortinoRatio: number;
  calmarRatio: number;
  var95: number;
  var99: number;
  expectedShortfall95: number;
  expectedShortfall99: number;
  maxConsecutiveLosses: number;
  maxConsecutiveWins: number;
  avgTimeToRecoveryPeriods: number;
  maxTimeToRecoveryPeriods: number;
  gainPainRatio: number;
  omegaRatio: number;
}

/**
 * Calculate all risk metrics in one pass.
 *
 * @param dailyReturns - Array of daily returns (decimals)
 * @param trades - Array of trades with P&L data
 * @param equityCurve - Array of equity values
 * @param annualizedReturn - Annualized return (decimal)
 * @param maxDrawdown - Maximum drawdown (positive decimal)
 * @param annualRiskFreeRate - Annual risk-free rate (default 3%)
 */
export function calculateAllRiskMetrics(
  dailyReturns: number[],
  trades: Pick<BacktestTrade, "pnl">[],
  equityCurve: number[],
  annualizedReturn: number,
  maxDrawdown: number,
  annualRiskFreeRate: number = 0.03,
): RiskMetricsSummary {
  return {
    sortinoRatio: calculateAnnualizedSortino(dailyReturns, annualRiskFreeRate),
    calmarRatio: calculateCalmar(annualizedReturn, maxDrawdown),
    var95: calculateVaR(dailyReturns, 0.95),
    var99: calculateVaR(dailyReturns, 0.99),
    expectedShortfall95: calculateExpectedShortfall(dailyReturns, 0.95),
    expectedShortfall99: calculateExpectedShortfall(dailyReturns, 0.99),
    maxConsecutiveLosses: calculateMaxConsecutiveLosses(trades),
    maxConsecutiveWins: calculateMaxConsecutiveWins(trades),
    avgTimeToRecoveryPeriods: calculateTimeToRecovery(equityCurve),
    maxTimeToRecoveryPeriods: calculateMaxTimeToRecovery(equityCurve),
    gainPainRatio: calculateGainPainRatio(dailyReturns),
    omegaRatio: calculateOmega(dailyReturns, 0),
  };
}
