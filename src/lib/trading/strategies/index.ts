/**
 * Trading Strategies — Single source of truth.
 *
 * Used by BOTH the tick engine (real trading) and backtest engine (simulation).
 * This guarantees backtest results MATCH actual bot behavior exactly.
 */

export * from "./types";
export * from "./indicators";
export { DCAStrategy } from "./dca";
export { TrendFollowStrategy } from "./trend";
export { MultiSignalStrategy } from "./multi";
export { GridBotStrategy } from "./grid";
export { SimpleGridStrategy, SIMPLE_GRID_DEFAULTS } from "./simple-grid";
export { AICopyStrategy } from "./ai-copy";
export { HybridArbitrageStrategy } from "./hybrid-arbitrage";

import { DCAStrategy } from "./dca";
import { TrendFollowStrategy } from "./trend";
import { MultiSignalStrategy } from "./multi";
import { GridBotStrategy } from "./grid";
import { AICopyStrategy } from "./ai-copy";
import { HybridArbitrageStrategy } from "./hybrid-arbitrage";
import { MaxAggressiveGridStrategy } from "./max-aggressive-grid";
import { SimpleGridStrategy } from "./simple-grid";
import type { StrategyEngine } from "./types";

/** Default-konfig for Max Aggressive (5x SOL leveraged grid) */
export const MAX_AGGRESSIVE_DEFAULT_CONFIG = {
  symbol: "SOLUSDT",
  leverage: 5,
  grid_range_pct: 1.5,
  grid_levels: 20,
  capital: 100,
  kill_switch_loss_pct: 3,
  auto_reduce_after_loss_days: 2,
  rebalance_interval_hours: 2,
};

export const strategyRegistry: Record<string, StrategyEngine> = {
  dca: new DCAStrategy(),
  trend_follow: new TrendFollowStrategy(),
  multi_signal: new MultiSignalStrategy(),
  grid: new GridBotStrategy(),
  simple_grid: new SimpleGridStrategy(),
  ai_copy: new AICopyStrategy(),
  hybrid_arbitrage: new HybridArbitrageStrategy(),
  max_aggressive: new MaxAggressiveGridStrategy(MAX_AGGRESSIVE_DEFAULT_CONFIG),
};

/**
 * Resolve strategy by ID alias
 */
export function resolveStrategy(strategyId: string): StrategyEngine | undefined {
  // Direct match
  if (strategyRegistry[strategyId]) {
    return strategyRegistry[strategyId];
  }
  // Alias mappings
  const aliases: Record<string, string> = {
    ensemble_ai: "multi_signal",
    ai_signals: "multi_signal",
    trend: "trend_follow",
    sma_crossover: "trend_follow",
    dca_doge: "dca",
    "eth-dca": "dca",
    "btc-sma-20-50": "trend_follow",
    "btc-sma-10-30": "trend_follow",
    grid_matic: "grid",
    multi_dot: "multi_signal",
    ai_copy: "ai_copy",
    hybrid_arbitrage: "hybrid_arbitrage",
  };
  const mapped = aliases[strategyId];
  return mapped ? strategyRegistry[mapped] : undefined;
}
