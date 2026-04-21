/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * MONTE CARLO SIMULATION — Bootstrap resampling for backtest uncertainty
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * Uses bootstrap resampling (drawing trades with replacement) to estimate
 * the distribution of possible outcomes from a given set of trades.
 *
 * @module lib/trading/monte-carlo
 */

import type { BacktestTrade } from "./backtestEngine";

// ============================================================================
// TYPES
// ============================================================================

export interface MonteCarloConfig {
  /** Number of simulations (default 10_000) */
  simulations: number;
  /** Initial capital for each simulation */
  initialCapital: number;
  /** Ruin threshold as fraction of initial (default 0.5 = 50%) */
  ruinThresholdPct: number;
  /** Number of trades per simulation path (default: same as input trades) */
  pathLength?: number;
}

export interface MonteCarloResult {
  /** P(final equity > initial capital) */
  probabilityOfProfit: number;
  /** P(equity ever < ruinThreshold) */
  probabilityOfRuin: number;
  /** Median final return (50th percentile) */
  medianReturn: number;
  /** Mean final return across all simulations */
  meanReturn: number;
  /** [2.5%, 97.5%] confidence interval for final return */
  confidenceInterval95: [number, number];
  /** [0.5%, 99.5%] confidence interval for final return */
  confidenceInterval99: [number, number];
  /** Percentile map: {5, 10, 25, 50, 75, 90, 95} */
  percentiles: Record<number, number>;
  /** Worst observed max consecutive losses across all sims */
  maxConsecutiveLosses: number;
  /** Average max consecutive losses across all sims */
  avgMaxConsecutiveLosses: number;
  /** Average periods from drawdown to new ATH */
  avgTimeToRecovery: number;
  /** Number of simulations that were run */
  simulationsRun: number;
  /** Total execution time in ms */
  executionTimeMs: number;
}

// ============================================================================
// DEFAULT CONFIG
// ============================================================================

const DEFAULT_CONFIG: MonteCarloConfig = {
  simulations: 10_000,
  initialCapital: 10_000,
  ruinThresholdPct: 0.5,
};

// ============================================================================
// RANDOM SAMPLING
// ============================================================================

/**
 * Generate a random integer in [0, max) using crypto for better distribution.
 * Falls back to Math.random for environments without crypto.
 */
function randomIndex(max: number): number {
  if (typeof globalThis.crypto !== "undefined" && globalThis.crypto.getRandomValues) {
    const arr = new Uint32Array(1);
    globalThis.crypto.getRandomValues(arr);
    return arr[0] % max;
  }
  return Math.floor(Math.random() * max);
}

/**
 * Draw n samples with replacement from the input array.
 */
function bootstrapSample<T>(items: T[], n: number): T[] {
  const samples: T[] = new Array(n);
  for (let i = 0; i < n; i++) {
    samples[i] = items[randomIndex(items.length)];
  }
  return samples;
}

// ============================================================================
// SIMULATION HELPERS
// ============================================================================

interface SimulationStats {
  finalReturn: number;
  hitRuin: boolean;
  maxConsecutiveLosses: number;
  timeToRecovery: number;
  maxDrawdownPct: number;
}

/**
 * Run a single simulation path.
 */
function simulatePath(
  trades: BacktestTrade[],
  pathLength: number,
  initialCapital: number,
  ruinThreshold: number,
): SimulationStats {
  const sampled = bootstrapSample(trades, pathLength);

  let equity = initialCapital;
  let ath = initialCapital;
  let hitRuin = false;
  let consecutiveLosses = 0;
  let maxConsecutiveLosses = 0;
  let maxDrawdownPct = 0;

  // Time-to-recovery tracking
  let drawdownStart: number | null = null;
  const recoveryTimes: number[] = [];

  for (let i = 0; i < sampled.length; i++) {
    const trade = sampled[i];

    // Apply P&L as a fraction of current equity (proportional sizing)
    // Use pnlPct to keep results scale-independent
    const pnlAmount = equity * (trade.pnlPct / 100);
    equity += pnlAmount;

    // Check ruin
    if (equity < ruinThreshold && !hitRuin) {
      hitRuin = true;
    }

    // Prevent equity from going negative
    if (equity < 0) equity = 0;

    // Track consecutive losses
    if (trade.pnl < 0) {
      consecutiveLosses++;
      maxConsecutiveLosses = Math.max(maxConsecutiveLosses, consecutiveLosses);
    } else {
      consecutiveLosses = 0;
    }

    // Track drawdown
    if (equity > ath) {
      if (drawdownStart !== null) {
        recoveryTimes.push(i - drawdownStart);
        drawdownStart = null;
      }
      ath = equity;
    } else if (drawdownStart === null && equity < ath) {
      drawdownStart = i;
    }

    const currentDrawdown = ath > 0 ? (ath - equity) / ath : 0;
    maxDrawdownPct = Math.max(maxDrawdownPct, currentDrawdown);
  }

  const avgRecovery =
    recoveryTimes.length > 0
      ? recoveryTimes.reduce((s, t) => s + t, 0) / recoveryTimes.length
      : 0;

  return {
    finalReturn: ((equity - initialCapital) / initialCapital) * 100,
    hitRuin,
    maxConsecutiveLosses,
    timeToRecovery: avgRecovery,
    maxDrawdownPct: maxDrawdownPct * 100,
  };
}

// ============================================================================
// PERCENTILE CALCULATION
// ============================================================================

/**
 * Calculate a specific percentile from a sorted array.
 * Uses nearest-rank method.
 */
function percentile(sorted: number[], p: number): number {
  if (sorted.length === 0) return 0;
  const idx = Math.max(0, Math.ceil((p / 100) * sorted.length) - 1);
  return sorted[Math.min(idx, sorted.length - 1)];
}

// ============================================================================
// MAIN FUNCTION
// ============================================================================

/**
 * Run Monte Carlo simulation on backtest trades.
 *
 * Performs bootstrap resampling: draws trades with replacement to build
 * simulated equity curves, then aggregates statistics across all simulations.
 *
 * @param trades - Array of BacktestTrade (the actual backtest results)
 * @param config - Simulation configuration (optional, uses sensible defaults)
 * @returns MonteCarloResult with probability distributions and risk metrics
 *
 * @example
 * ```typescript
 * const result = runMonteCarlo(backtest.trades, {
 *   simulations: 10_000,
 *   initialCapital: 10_000,
 *   ruinThresholdPct: 0.5,
 * });
 *
 * console.log(`P(profit): ${(result.probabilityOfProfit * 100).toFixed(1)}%`);
 * console.log(`95% CI: [${result.confidenceInterval95[0].toFixed(1)}%, ${result.confidenceInterval95[1].toFixed(1)}%]`);
 * ```
 */
export function runMonteCarlo(
  trades: BacktestTrade[],
  config?: Partial<MonteCarloConfig>,
): MonteCarloResult {
  const startTime = performance.now();

  // Merge with defaults
  const cfg: MonteCarloConfig = { ...DEFAULT_CONFIG, ...config };

  // Edge case: no trades
  if (trades.length === 0) {
    return createEmptyResult(cfg, performance.now() - startTime);
  }

  const pathLength = cfg.pathLength ?? trades.length;
  const ruinThreshold = cfg.initialCapital * cfg.ruinThresholdPct;

  // Run all simulations
  const results: SimulationStats[] = new Array(cfg.simulations);
  for (let s = 0; s < cfg.simulations; s++) {
    results[s] = simulatePath(trades, pathLength, cfg.initialCapital, ruinThreshold);
  }

  // Aggregate
  const finalReturns = results.map((r) => r.finalReturn);
  finalReturns.sort((a, b) => a - b);

  const profitCount = results.filter((r) => r.finalReturn > 0).length;
  const ruinCount = results.filter((r) => r.hitRuin).length;
  const totalConsecLosses = results.map((r) => r.maxConsecutiveLosses);
  const totalRecoveryTimes = results.map((r) => r.timeToRecovery);

  const meanReturn =
    finalReturns.reduce((s, r) => s + r, 0) / finalReturns.length;

  const percentilesMap: Record<number, number> = {};
  for (const p of [5, 10, 25, 50, 75, 90, 95]) {
    percentilesMap[p] = percentile(finalReturns, p);
  }

  const executionTimeMs = performance.now() - startTime;

  return {
    probabilityOfProfit: profitCount / cfg.simulations,
    probabilityOfRuin: ruinCount / cfg.simulations,
    medianReturn: percentile(finalReturns, 50),
    meanReturn,
    confidenceInterval95: [
      percentile(finalReturns, 2.5),
      percentile(finalReturns, 97.5),
    ],
    confidenceInterval99: [
      percentile(finalReturns, 0.5),
      percentile(finalReturns, 99.5),
    ],
    percentiles: percentilesMap,
    maxConsecutiveLosses: Math.max(...totalConsecLosses),
    avgMaxConsecutiveLosses:
      totalConsecLosses.reduce((s, v) => s + v, 0) / totalConsecLosses.length,
    avgTimeToRecovery:
      totalRecoveryTimes.reduce((s, v) => s + v, 0) /
      Math.max(totalRecoveryTimes.filter((t) => t > 0).length, 1),
    simulationsRun: cfg.simulations,
    executionTimeMs: Math.round(executionTimeMs),
  };
}

/**
 * Create empty result for edge cases (no trades).
 */
function createEmptyResult(
  cfg: MonteCarloConfig,
  executionTimeMs: number,
): MonteCarloResult {
  const emptyPercentiles: Record<number, number> = {};
  for (const p of [5, 10, 25, 50, 75, 90, 95]) {
    emptyPercentiles[p] = 0;
  }

  return {
    probabilityOfProfit: 0,
    probabilityOfRuin: 0,
    medianReturn: 0,
    meanReturn: 0,
    confidenceInterval95: [0, 0],
    confidenceInterval99: [0, 0],
    percentiles: emptyPercentiles,
    maxConsecutiveLosses: 0,
    avgMaxConsecutiveLosses: 0,
    avgTimeToRecovery: 0,
    simulationsRun: cfg.simulations,
    executionTimeMs: Math.round(executionTimeMs),
  };
}
