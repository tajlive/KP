/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * PORTFOLIO ALLOCATOR — Multi-strategy capital allocation using Kelly + MPT
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * Allocates capital across multiple strategies using a combination of:
 * - Kelly Criterion (per-strategy optimal fraction)
 * - Correlation penalties (reduce allocation to correlated strategies)
 * - Risk-parity weighting (equalize risk contribution)
 *
 * This module provides the mathematical engine. The UI integration calls
 * this with strategy performance data from backtests or live trades.
 *
 * @module lib/trading/portfolio-allocator
 */

import type { BacktestTrade } from "./backtestEngine";

// ============================================================================
// TYPES
// ============================================================================

export interface StrategyPerformance {
  /** Strategy identifier */
  strategyId: string;
  /** Strategy display name */
  name: string;
  /** Historical returns as decimal (e.g., 0.02 for 2%) */
  returns: number[];
  /** Win rate [0, 1] */
  winRate: number;
  /** Average winning trade (decimal) */
  avgWin: number;
  /** Average losing trade (decimal, positive value) */
  avgLoss: number;
  /** Annual volatility (decimal) */
  annualVolatility: number;
  /** Sharpe ratio */
  sharpeRatio: number;
  /** Maximum drawdown (decimal, positive value) */
  maxDrawdown: number;
  /** Number of sample trades */
  sampleSize: number;
}

export interface AllocationResult {
  /** Per-strategy allocations */
  allocations: StrategyAllocation[];
  /** Total Kelly fraction before normalization */
  rawTotalKelly: number;
  /** Portfolio expected return (weighted) */
  expectedReturnPct: number;
  /** Portfolio expected volatility (weighted) */
  expectedVolatilityPct: number;
  /** Portfolio Sharpe ratio */
  portfolioSharpe: number;
  /** Diversification ratio */
  diversificationRatio: number;
  /** Correlation matrix (strategy × strategy) */
  correlationMatrix: number[][];
}

export interface StrategyAllocation {
  /** Strategy ID */
  strategyId: string;
  /** Strategy name */
  name: string;
  /** Raw Kelly fraction (before portfolio adjustment) */
  rawKellyFraction: number;
  /** Adjusted allocation fraction (after correlation + normalization) */
  allocationPct: number;
  /** Amount in base currency */
  allocationAmount: number;
  /** Contribution to portfolio risk */
  riskContributionPct: number;
}

export interface PortfolioConfig {
  /** Total capital to allocate */
  totalCapital: number;
  /** Maximum allocation to any single strategy (default 0.30 = 30%) */
  maxSingleAllocation: number;
  /** Minimum allocation (strategies below this are excluded, default 0.02 = 2%) */
  minAllocation: number;
  /** Kelly multiplier: 0.5 = half-Kelly (default), 0.25 = quarter-Kelly */
  kellyMultiplier: number;
  /** Target total utilization (default 0.80 = 80%, keep 20% cash buffer) */
  targetUtilization: number;
  /** Risk-free rate (annual, default 0.03 = 3%) */
  riskFreeRate: number;
}

// ============================================================================
// DEFAULT CONFIG
// ============================================================================

const DEFAULT_CONFIG: PortfolioConfig = {
  totalCapital: 100000,
  maxSingleAllocation: 0.30,
  minAllocation: 0.02,
  kellyMultiplier: 0.50, // Half-Kelly
  targetUtilization: 0.80,
  riskFreeRate: 0.03,
};

// ============================================================================
// MAIN FUNCTION
// ============================================================================

/**
 * Allocate capital across multiple strategies using Kelly + correlation adjustments.
 *
 * Steps:
 * 1. Calculate raw Kelly fraction per strategy
 * 2. Build correlation matrix from return series
 * 3. Apply correlation penalty (correlated strategies get less)
 * 4. Normalize to target utilization
 * 5. Enforce per-strategy min/max constraints
 *
 * @example
 * ```typescript
 * const result = allocatePortfolio([btcStrategy, ethStrategy, solStrategy], {
 *   totalCapital: 100000,
 *   kellyMultiplier: 0.5,
 * });
 * // result.allocations[0].allocationPct = 28.5
 * // result.allocations[1].allocationPct = 22.3
 * // ...
 * ```
 */
export function allocatePortfolio(
  strategies: StrategyPerformance[],
  config?: Partial<PortfolioConfig>,
): AllocationResult {
  const cfg: PortfolioConfig = { ...DEFAULT_CONFIG, ...config };

  if (strategies.length === 0) {
    return createEmptyResult(cfg);
  }

  // 1. Calculate raw Kelly fractions
  const kellyFractions = strategies.map(s => calculateKellyFraction(s, cfg));

  // 2. Build correlation matrix
  const correlationMatrix = buildCorrelationMatrix(strategies);

  // 3. Apply correlation penalty
  const adjustedFractions = applyCorrelationPenalty(kellyFractions, correlationMatrix);

  // 4. Normalize to target utilization
  const rawTotal = adjustedFractions.reduce((s, f) => s + f, 0);
  let normalizedFractions: number[];

  if (rawTotal > cfg.targetUtilization) {
    const scale = cfg.targetUtilization / rawTotal;
    normalizedFractions = adjustedFractions.map(f => f * scale);
  } else {
    normalizedFractions = [...adjustedFractions];
  }

  // 5. Enforce min/max constraints
  normalizedFractions = enforceConstraints(normalizedFractions, cfg);

  // 6. Calculate risk contributions
  const riskContributions = calculateRiskContributions(
    normalizedFractions,
    strategies,
    correlationMatrix,
  );

  // 7. Build result
  const allocations: StrategyAllocation[] = strategies.map((s, i) => ({
    strategyId: s.strategyId,
    name: s.name,
    rawKellyFraction: kellyFractions[i],
    allocationPct: normalizedFractions[i] * 100,
    allocationAmount: cfg.totalCapital * normalizedFractions[i],
    riskContributionPct: riskContributions[i] * 100,
  }));

  // Portfolio-level metrics
  const expectedReturn = strategies.reduce(
    (sum, s, i) => sum + normalizedFractions[i] * mean(s.returns) * 365,
    0,
  );

  const portfolioVol = calculatePortfolioVolatility(
    normalizedFractions,
    strategies,
    correlationMatrix,
  );

  const portfolioSharpe = portfolioVol > 0
    ? (expectedReturn - cfg.riskFreeRate) / portfolioVol
    : 0;

  // Diversification ratio: weighted sum of individual vols / portfolio vol
  const weightedIndividualVol = strategies.reduce(
    (sum, s, i) => sum + normalizedFractions[i] * s.annualVolatility,
    0,
  );
  const diversificationRatio = portfolioVol > 0
    ? weightedIndividualVol / portfolioVol
    : 1;

  return {
    allocations,
    rawTotalKelly: rawTotal,
    expectedReturnPct: expectedReturn * 100,
    expectedVolatilityPct: portfolioVol * 100,
    portfolioSharpe,
    diversificationRatio,
    correlationMatrix,
  };
}

// ============================================================================
// KELLY FRACTION
// ============================================================================

/**
 * Calculate raw Kelly fraction for a single strategy.
 * Kelly% = W - [(1 - W) / R]   where W = win rate, R = win/loss ratio
 */
function calculateKellyFraction(
  strategy: StrategyPerformance,
  cfg: PortfolioConfig,
): number {
  if (strategy.avgLoss === 0 || strategy.sampleSize < 5) {
    return 0;
  }

  const winLossRatio = strategy.avgWin / strategy.avgLoss;
  const rawKelly = strategy.winRate - (1 - strategy.winRate) / winLossRatio;

  // Apply Kelly multiplier (half-Kelly by default for safety)
  let fraction = rawKelly * cfg.kellyMultiplier;

  // Clamp to [0, maxSingle]
  fraction = Math.max(0, Math.min(fraction, cfg.maxSingleAllocation));

  // Downscale if insufficient sample size (fade toward 0 for small samples)
  const samplePenalty = Math.min(1, strategy.sampleSize / 30);
  fraction *= samplePenalty;

  return fraction;
}

// ============================================================================
// CORRELATION MATRIX
// ============================================================================

/**
 * Build Pearson correlation matrix from return series.
 */
function buildCorrelationMatrix(strategies: StrategyPerformance[]): number[][] {
  const n = strategies.length;
  const matrix: number[][] = Array.from({ length: n }, () => Array(n).fill(0));

  for (let i = 0; i < n; i++) {
    matrix[i][i] = 1.0; // Self-correlation = 1

    for (let j = i + 1; j < n; j++) {
      const corr = pearsonCorrelation(strategies[i].returns, strategies[j].returns);
      matrix[i][j] = corr;
      matrix[j][i] = corr; // Symmetric
    }
  }

  return matrix;
}

/**
 * Pearson correlation coefficient between two series.
 * Returns 0 if insufficient overlap.
 */
function pearsonCorrelation(a: number[], b: number[]): number {
  const n = Math.min(a.length, b.length);
  if (n < 5) return 0;

  const meanA = a.slice(0, n).reduce((s, v) => s + v, 0) / n;
  const meanB = b.slice(0, n).reduce((s, v) => s + v, 0) / n;

  let cov = 0;
  let varA = 0;
  let varB = 0;

  for (let i = 0; i < n; i++) {
    const dA = a[i] - meanA;
    const dB = b[i] - meanB;
    cov += dA * dB;
    varA += dA * dA;
    varB += dB * dB;
  }

  const denom = Math.sqrt(varA * varB);
  if (denom === 0) return 0;

  return cov / denom;
}

// ============================================================================
// CORRELATION PENALTY
// ============================================================================

/**
 * Reduce allocations for highly correlated strategies.
 *
 * For each strategy, compute the average pairwise correlation with all
 * other strategies (weighted by their Kelly fractions). Higher correlation
 * → more penalty.
 *
 * Penalty formula: adjustedKelly_i = rawKelly_i × (1 - avgCorr_i × penaltyFactor)
 */
function applyCorrelationPenalty(
  kellyFractions: number[],
  correlationMatrix: number[][],
): number[] {
  const n = kellyFractions.length;
  if (n <= 1) return [...kellyFractions];

  const penaltyFactor = 0.3; // How aggressively to penalize correlation

  return kellyFractions.map((kelly, i) => {
    if (kelly <= 0) return 0;

    // Compute weighted average correlation with other strategies
    let totalWeight = 0;
    let weightedCorr = 0;

    for (let j = 0; j < n; j++) {
      if (i === j || kellyFractions[j] <= 0) continue;

      const corr = Math.max(0, correlationMatrix[i][j]); // Only penalize positive correlation
      weightedCorr += corr * kellyFractions[j];
      totalWeight += kellyFractions[j];
    }

    const avgCorr = totalWeight > 0 ? weightedCorr / totalWeight : 0;
    const penalty = 1 - avgCorr * penaltyFactor;

    return kelly * Math.max(0.3, penalty); // Never reduce by more than 70%
  });
}

// ============================================================================
// CONSTRAINTS
// ============================================================================

function enforceConstraints(
  fractions: number[],
  cfg: PortfolioConfig,
): number[] {
  return fractions.map(f => {
    if (f < cfg.minAllocation) return 0; // Below minimum → exclude
    return Math.min(f, cfg.maxSingleAllocation); // Cap at max
  });
}

// ============================================================================
// RISK CONTRIBUTIONS
// ============================================================================

/**
 * Calculate marginal risk contribution of each strategy.
 * Using variance decomposition: RC_i = w_i × (Σ × w)_i / σ_p²
 */
function calculateRiskContributions(
  weights: number[],
  strategies: StrategyPerformance[],
  correlationMatrix: number[][],
): number[] {
  const n = weights.length;
  if (n === 0) return [];

  // Build covariance matrix from correlation + volatilities
  const covMatrix: number[][] = Array.from({ length: n }, (_, i) =>
    Array.from({ length: n }, (_, j) =>
      correlationMatrix[i][j] * strategies[i].annualVolatility * strategies[j].annualVolatility
    )
  );

  // Portfolio variance: w' * Σ * w
  let portfolioVar = 0;
  for (let i = 0; i < n; i++) {
    for (let j = 0; j < n; j++) {
      portfolioVar += weights[i] * weights[j] * covMatrix[i][j];
    }
  }

  if (portfolioVar === 0) return weights.map(() => 1 / n);

  // Marginal contribution: RC_i = w_i × Σ_j(w_j × Cov_ij) / σ_p²
  const riskContributions = weights.map((wi, i) => {
    let marginal = 0;
    for (let j = 0; j < n; j++) {
      marginal += weights[j] * covMatrix[i][j];
    }
    return (wi * marginal) / portfolioVar;
  });

  // Normalize to sum to 1
  const total = riskContributions.reduce((s, r) => s + Math.abs(r), 0);
  if (total === 0) return weights.map(() => 1 / n);

  return riskContributions.map(r => Math.abs(r) / total);
}

// ============================================================================
// PORTFOLIO VOLATILITY
// ============================================================================

function calculatePortfolioVolatility(
  weights: number[],
  strategies: StrategyPerformance[],
  correlationMatrix: number[][],
): number {
  const n = weights.length;
  let portfolioVar = 0;

  for (let i = 0; i < n; i++) {
    for (let j = 0; j < n; j++) {
      portfolioVar += weights[i] * weights[j]
        * strategies[i].annualVolatility * strategies[j].annualVolatility
        * correlationMatrix[i][j];
    }
  }

  return Math.sqrt(Math.max(0, portfolioVar));
}

// ============================================================================
// HELPERS
// ============================================================================

function mean(arr: number[]): number {
  if (arr.length === 0) return 0;
  return arr.reduce((s, v) => s + v, 0) / arr.length;
}

function createEmptyResult(cfg: PortfolioConfig): AllocationResult {
  return {
    allocations: [],
    rawTotalKelly: 0,
    expectedReturnPct: 0,
    expectedVolatilityPct: 0,
    portfolioSharpe: 0,
    diversificationRatio: 1,
    correlationMatrix: [],
  };
}

// ============================================================================
// UTILITY: Convert backtest trades to StrategyPerformance
// ============================================================================

/**
 * Build a StrategyPerformance from backtest results.
 * Useful for feeding backtest output directly into the allocator.
 */
export function backtestToStrategyPerformance(
  strategyId: string,
  name: string,
  trades: BacktestTrade[],
  equityCurve: Array<{ equity: number }>,
): StrategyPerformance {
  if (trades.length === 0) {
    return {
      strategyId,
      name,
      returns: [],
      winRate: 0,
      avgWin: 0,
      avgLoss: 0,
      annualVolatility: 0,
      sharpeRatio: 0,
      maxDrawdown: 0,
      sampleSize: 0,
    };
  }

  const returns = trades.map(t => t.pnlPct / 100);
  const wins = returns.filter(r => r > 0);
  const losses = returns.filter(r => r < 0);

  // Calculate daily returns from equity curve for volatility
  const dailyReturns = equityCurve.map((e, i) =>
    i === 0 ? 0 : (e.equity - equityCurve[i - 1].equity) / equityCurve[i - 1].equity
  ).slice(1);

  const dailyMean = mean(dailyReturns);
  const dailyStd = dailyReturns.length > 1
    ? Math.sqrt(
        dailyReturns.reduce((s, r) => s + (r - dailyMean) ** 2, 0) / dailyReturns.length
      )
    : 0;

  // Max drawdown
  let maxDD = 0;
  let peak = equityCurve[0]?.equity ?? 0;
  for (const point of equityCurve) {
    if (point.equity > peak) peak = point.equity;
    const dd = peak > 0 ? (peak - point.equity) / peak : 0;
    maxDD = Math.max(maxDD, dd);
  }

  return {
    strategyId,
    name,
    returns: dailyReturns,
    winRate: wins.length / returns.length,
    avgWin: wins.length > 0 ? mean(wins) : 0,
    avgLoss: losses.length > 0 ? Math.abs(mean(losses)) : 0,
    annualVolatility: dailyStd * Math.sqrt(365),
    sharpeRatio: dailyStd > 0 ? (dailyMean / dailyStd) * Math.sqrt(365) : 0,
    maxDrawdown: maxDD,
    sampleSize: trades.length,
  };
}
