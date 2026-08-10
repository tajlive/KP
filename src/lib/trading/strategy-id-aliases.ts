/**
 * Strategy ID Aliases — Maps strategy IDs (product keys, UUIDs, legacy aliases)
 * to tick engine keys and per-strategy configurations.
 *
 * V2: Config-aware resolution. Each UUID has unique parameters.
 */

import type { TickStrategyEngineKey } from "./strategies/types";
import { getStrategyConfig, shouldUseDarkFleet, getDarkFleetConfig } from "./strategy-configs";

// Legacy product key → engine mapping (for non-UUID strategy IDs)
export const STRATEGY_ID_TO_TICK_ENGINE = {
  dca_trygg: "dca",
  trend_balansert: "trend_follow",
  multisignal_aktiv: "multi_signal",
  grid_bot: "grid",
  simple_grid: "simple_grid",
  ensemble_ai: "ensemble_ai",
  ai_copy: "ai_copy",
} as const;

export type ProductStrategyId = keyof typeof STRATEGY_ID_TO_TICK_ENGINE;

/**
 * Resolve strategy engine key from any strategy identifier.
 * Supports: UUIDs, product keys, legacy aliases, engine names.
 */
export function resolveTickStrategyEngineKey(
  strategyId: string | null | undefined,
): TickStrategyEngineKey | null {
  if (!strategyId) return null;

  // 1. Try UUID-based config resolution first (V2)
  const config = getStrategyConfig(strategyId);
  if (config) {
    return config.engine as TickStrategyEngineKey;
  }

  // 2. Try legacy product key mapping
  const productKey = STRATEGY_ID_TO_TICK_ENGINE[strategyId as ProductStrategyId];
  if (productKey) {
    return productKey as TickStrategyEngineKey;
  }

  // 3. Legacy aliases
  const legacyAliases: Record<string, TickStrategyEngineKey> = {
    dca: "dca",
    trend_follow: "trend_follow",
    multi_signal: "multi_signal",
    grid: "grid",
    ensemble_ai: "ensemble_ai",
    multi: "multi_signal",
    trend: "trend_follow",
    "ai-copy": "multi_signal",
  };
  if (legacyAliases[strategyId]) {
    return legacyAliases[strategyId];
  }

  // 4. Direct engine name
  const validEngines: TickStrategyEngineKey[] = [
    "dca", "trend_follow", "multi_signal", "grid", "ai_copy", "hybrid_arbitrage", "ensemble_ai", "max_aggressive", "simple_grid",
  ];
  if (validEngines.includes(strategyId as TickStrategyEngineKey)) {
    return strategyId as TickStrategyEngineKey;
  }

  return null;
}

/**
 * Get full strategy config (engine + parameters + darkFleet) for a strategy ID.
 */
export { getStrategyConfig, shouldUseDarkFleet, getDarkFleetConfig };
