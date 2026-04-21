/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * WALK-FORWARD OPTIMIZATION — Validate strategy parameters against overfitting
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * Splits historical data into rolling windows of in-sample (IS) for parameter
 * optimization and out-of-sample (OOS) for validation. If OOS metrics closely
 * track IS metrics, the strategy parameters are robust (not overfit).
 *
 * Key concept: A strategy that only works on IS data is overfit to noise.
 * Walk-forward analysis detects this before real capital is at risk.
 *
 * @module lib/trading/walk-forward
 */

import type { OHLCV, BacktestTrade, BacktestMetrics, StrategyConfig } from "./backtestEngine";
import { runBacktest } from "./backtestEngine";

// ============================================================================
// TYPES
// ============================================================================

export interface WalkForwardConfig {
  /** Number of walk-forward windows (default 5) */
  numWindows: number;
  /** Fraction of each window used for in-sample training (default 0.7 = 70%) */
  inSamplePct: number;
  /** Minimum candles per window (default 60) */
  minCandlesPerWindow: number;
}

export interface WalkForwardWindow {
  /** Window index (0-based) */
  index: number;
  /** In-sample period */
  inSample: {
    startDate: string;
    endDate: string;
    candles: number;
    metrics: WalkForwardMetrics;
    trades: number;
  };
  /** Out-of-sample period */
  outOfSample: {
    startDate: string;
    endDate: string;
    candles: number;
    metrics: WalkForwardMetrics;
    trades: number;
  };
  /** Efficiency ratio for this window: OOS return / IS return */
  efficiency: number;
}

export interface WalkForwardMetrics {
  totalReturnPct: number;
  maxDrawdownPct: number;
  sharpeRatio: number;
  winRate: number;
  profitFactor: number;
  totalTrades: number;
}

export interface WalkForwardResult {
  /** Individual window results */
  windows: WalkForwardWindow[];
  /** Walk-Forward Efficiency (WFE): mean(OOS return) / mean(IS return) */
  walkForwardEfficiency: number;
  /** OOS Sharpe consistency: stddev of OOS Sharpe ratios */
  oosSharpeSd: number;
  /** Mean OOS return across all windows */
  meanOosReturn: number;
  /** Mean IS return across all windows */
  meanIsReturn: number;
  /** Percentage of windows where OOS was profitable */
  oosProfitablePct: number;
  /** Robustness score: 0-100 composite rating */
  robustnessScore: number;
  /** Human-readable verdict */
  verdict: WalkForwardVerdict;
  /** Total candles analyzed */
  totalCandles: number;
  /** Configuration used */
  config: WalkForwardConfig;
}

export type WalkForwardVerdict =
  | "robust"           // WFE > 0.5, >80% OOS profitable
  | "acceptable"       // WFE > 0.3, >60% OOS profitable
  | "questionable"     // WFE > 0, >40% OOS profitable
  | "overfit"          // WFE ≤ 0 or <40% OOS profitable
  ;

// ============================================================================
// DEFAULT CONFIG
// ============================================================================

const DEFAULT_CONFIG: WalkForwardConfig = {
  numWindows: 5,
  inSamplePct: 0.7,
  minCandlesPerWindow: 60,
};

// ============================================================================
// MAIN FUNCTION
// ============================================================================

/**
 * Run walk-forward analysis on historical candle data.
 *
 * The data is split into `numWindows` sequential windows. Each window
 * is further split into IS (training) and OOS (validation) segments.
 * The strategy is backtested on both segments independently, and
 * Walk-Forward Efficiency (WFE) measures how well IS results predict
 * OOS performance.
 *
 * @example
 * ```typescript
 * const result = runWalkForward(candles, strategyConfig, 10000, {
 *   numWindows: 5,
 *   inSamplePct: 0.7,
 * });
 *
 * if (result.verdict === 'overfit') {
 *   console.warn('Strategy parameters may be overfit to historical data');
 * }
 * ```
 */
export function runWalkForward(
  candles: OHLCV[],
  strategyConfig: StrategyConfig,
  initialCapitalUSD: number,
  config?: Partial<WalkForwardConfig>,
): WalkForwardResult {
  const cfg: WalkForwardConfig = { ...DEFAULT_CONFIG, ...config };

  // Validate inputs
  const minCandles = cfg.numWindows * cfg.minCandlesPerWindow;
  if (candles.length < minCandles) {
    return createEmptyResult(cfg, candles.length,
      `Insufficient data: need ${minCandles} candles, have ${candles.length}`);
  }

  // Calculate window size
  const windowSize = Math.floor(candles.length / cfg.numWindows);
  const isSize = Math.floor(windowSize * cfg.inSamplePct);
  const oosSize = windowSize - isSize;

  if (isSize < cfg.minCandlesPerWindow || oosSize < 10) {
    return createEmptyResult(cfg, candles.length,
      `Windows too small: IS=${isSize}, OOS=${oosSize}`);
  }

  const windows: WalkForwardWindow[] = [];

  for (let w = 0; w < cfg.numWindows; w++) {
    const windowStart = w * windowSize;
    const isEnd = windowStart + isSize;
    const oosEnd = Math.min(windowStart + windowSize, candles.length);

    // Extract window segments
    const isCandles = candles.slice(windowStart, isEnd);
    const oosCandles = candles.slice(isEnd, oosEnd);

    if (isCandles.length < cfg.minCandlesPerWindow || oosCandles.length < 5) {
      continue;
    }

    // Run backtest on both segments
    const isResult = runBacktest(isCandles, strategyConfig, initialCapitalUSD);
    const oosResult = runBacktest(oosCandles, strategyConfig, initialCapitalUSD);

    const isMetrics = extractMetrics(isResult.metrics);
    const oosMetrics = extractMetrics(oosResult.metrics);

    // Calculate window efficiency
    const efficiency = isMetrics.totalReturnPct !== 0
      ? oosMetrics.totalReturnPct / isMetrics.totalReturnPct
      : 0;

    windows.push({
      index: w,
      inSample: {
        startDate: new Date(isCandles[0].timestamp).toISOString(),
        endDate: new Date(isCandles[isCandles.length - 1].timestamp).toISOString(),
        candles: isCandles.length,
        metrics: isMetrics,
        trades: isResult.trades.length,
      },
      outOfSample: {
        startDate: new Date(oosCandles[0].timestamp).toISOString(),
        endDate: new Date(oosCandles[oosCandles.length - 1].timestamp).toISOString(),
        candles: oosCandles.length,
        metrics: oosMetrics,
        trades: oosResult.trades.length,
      },
      efficiency,
    });
  }

  if (windows.length === 0) {
    return createEmptyResult(cfg, candles.length, "No valid windows generated");
  }

  return aggregateResults(windows, cfg, candles.length);
}

// ============================================================================
// ANCHORED WALK-FORWARD (expanding IS window)
// ============================================================================

/**
 * Anchored walk-forward: IS window starts from the beginning and grows.
 * More suitable for strategies that benefit from longer training periods.
 *
 * @example
 * ```
 * Window 1: IS=[0, 60%], OOS=[60%, 70%]
 * Window 2: IS=[0, 70%], OOS=[70%, 80%]
 * Window 3: IS=[0, 80%], OOS=[80%, 90%]
 * Window 4: IS=[0, 90%], OOS=[90%, 100%]
 * ```
 */
export function runAnchoredWalkForward(
  candles: OHLCV[],
  strategyConfig: StrategyConfig,
  initialCapitalUSD: number,
  numWindows: number = 4,
): WalkForwardResult {
  const cfg: WalkForwardConfig = {
    numWindows,
    inSamplePct: 0.7,
    minCandlesPerWindow: 60,
  };

  const oosSize = Math.floor(candles.length * 0.1); // Each OOS is 10% of total
  const firstIsEnd = Math.floor(candles.length * 0.6); // First IS is 60% of total

  if (firstIsEnd < cfg.minCandlesPerWindow || oosSize < 10) {
    return createEmptyResult(cfg, candles.length, "Insufficient data for anchored walk-forward");
  }

  const windows: WalkForwardWindow[] = [];

  for (let w = 0; w < numWindows; w++) {
    const isEnd = firstIsEnd + w * oosSize;
    const oosEnd = Math.min(isEnd + oosSize, candles.length);

    if (isEnd >= candles.length || oosEnd > candles.length) break;

    const isCandles = candles.slice(0, isEnd); // Anchored from start
    const oosCandles = candles.slice(isEnd, oosEnd);

    if (oosCandles.length < 5) continue;

    const isResult = runBacktest(isCandles, strategyConfig, initialCapitalUSD);
    const oosResult = runBacktest(oosCandles, strategyConfig, initialCapitalUSD);

    const isMetrics = extractMetrics(isResult.metrics);
    const oosMetrics = extractMetrics(oosResult.metrics);

    const efficiency = isMetrics.totalReturnPct !== 0
      ? oosMetrics.totalReturnPct / isMetrics.totalReturnPct
      : 0;

    windows.push({
      index: w,
      inSample: {
        startDate: new Date(isCandles[0].timestamp).toISOString(),
        endDate: new Date(isCandles[isCandles.length - 1].timestamp).toISOString(),
        candles: isCandles.length,
        metrics: isMetrics,
        trades: isResult.trades.length,
      },
      outOfSample: {
        startDate: new Date(oosCandles[0].timestamp).toISOString(),
        endDate: new Date(oosCandles[oosCandles.length - 1].timestamp).toISOString(),
        candles: oosCandles.length,
        metrics: oosMetrics,
        trades: oosResult.trades.length,
      },
      efficiency,
    });
  }

  if (windows.length === 0) {
    return createEmptyResult(cfg, candles.length, "No valid anchored windows");
  }

  return aggregateResults(windows, cfg, candles.length);
}

// ============================================================================
// HELPERS
// ============================================================================

function extractMetrics(m: BacktestMetrics): WalkForwardMetrics {
  return {
    totalReturnPct: m.totalReturnPct,
    maxDrawdownPct: m.maxDrawdownPct,
    sharpeRatio: m.sharpeRatio,
    winRate: m.winRate,
    profitFactor: m.profitFactor === Infinity ? 999 : m.profitFactor,
    totalTrades: m.totalTrades,
  };
}

function aggregateResults(
  windows: WalkForwardWindow[],
  cfg: WalkForwardConfig,
  totalCandles: number,
): WalkForwardResult {
  // Calculate aggregate stats
  const isReturns = windows.map(w => w.inSample.metrics.totalReturnPct);
  const oosReturns = windows.map(w => w.outOfSample.metrics.totalReturnPct);
  const oosSharpes = windows.map(w => w.outOfSample.metrics.sharpeRatio);

  const meanIsReturn = mean(isReturns);
  const meanOosReturn = mean(oosReturns);
  const oosSharpeSd = stddev(oosSharpes);

  // Walk-Forward Efficiency: how much of IS performance carries to OOS
  const walkForwardEfficiency = meanIsReturn !== 0 ? meanOosReturn / meanIsReturn : 0;

  // Percentage of OOS windows that were profitable
  const oosProfitable = oosReturns.filter(r => r > 0).length;
  const oosProfitablePct = (oosProfitable / windows.length) * 100;

  // Composite robustness score (0-100)
  const robustnessScore = calculateRobustness(
    walkForwardEfficiency,
    oosProfitablePct,
    oosSharpeSd,
    windows.length,
  );

  const verdict = determineVerdict(walkForwardEfficiency, oosProfitablePct);

  return {
    windows,
    walkForwardEfficiency,
    oosSharpeSd,
    meanOosReturn,
    meanIsReturn,
    oosProfitablePct,
    robustnessScore,
    verdict,
    totalCandles,
    config: cfg,
  };
}

function calculateRobustness(
  wfe: number,
  oosProfitablePct: number,
  oosSharpeSd: number,
  windowCount: number,
): number {
  let score = 0;

  // WFE contribution (0-40 points)
  if (wfe > 0.7) score += 40;
  else if (wfe > 0.5) score += 30;
  else if (wfe > 0.3) score += 20;
  else if (wfe > 0) score += 10;

  // OOS profitability (0-30 points)
  score += Math.min(30, (oosProfitablePct / 100) * 30);

  // Sharpe consistency (0-20 points) — lower SD is better
  if (oosSharpeSd < 0.5) score += 20;
  else if (oosSharpeSd < 1.0) score += 15;
  else if (oosSharpeSd < 2.0) score += 10;
  else score += 5;

  // Window count bonus (0-10 points) — more windows = more confidence
  score += Math.min(10, windowCount * 2);

  return Math.round(Math.min(100, score));
}

function determineVerdict(
  wfe: number,
  oosProfitablePct: number,
): WalkForwardVerdict {
  if (wfe > 0.5 && oosProfitablePct >= 80) return "robust";
  if (wfe > 0.3 && oosProfitablePct >= 60) return "acceptable";
  if (wfe > 0 && oosProfitablePct >= 40) return "questionable";
  return "overfit";
}

function createEmptyResult(
  cfg: WalkForwardConfig,
  totalCandles: number,
  _reason: string,
): WalkForwardResult {
  return {
    windows: [],
    walkForwardEfficiency: 0,
    oosSharpeSd: 0,
    meanOosReturn: 0,
    meanIsReturn: 0,
    oosProfitablePct: 0,
    robustnessScore: 0,
    verdict: "overfit",
    totalCandles,
    config: cfg,
  };
}

function mean(arr: number[]): number {
  if (arr.length === 0) return 0;
  return arr.reduce((s, v) => s + v, 0) / arr.length;
}

function stddev(arr: number[]): number {
  if (arr.length < 2) return 0;
  const m = mean(arr);
  const variance = arr.reduce((s, v) => s + (v - m) ** 2, 0) / arr.length;
  return Math.sqrt(variance);
}
