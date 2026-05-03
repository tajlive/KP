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

import { DCAStrategy } from "./dca";
import { TrendFollowStrategy } from "./trend";
import { MultiSignalStrategy } from "./multi";
import { GridBotStrategy } from "./grid";
import type { StrategyEngine } from "./types";

export const strategyRegistry: Record<string, StrategyEngine> = {
  dca: new DCAStrategy(),
  trend_follow: new TrendFollowStrategy(),
  multi_signal: new MultiSignalStrategy(),
  grid: new GridBotStrategy(),
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
    grid_matic: "grid",
    multi_dot: "multi_signal",
    ai_copy: "multi_signal",
  };
  const mapped = aliases[strategyId];
  return mapped ? strategyRegistry[mapped] : undefined;
}
