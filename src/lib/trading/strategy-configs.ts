/**
 * Strategy Configs — Per-strategi default-konfigurasjoner
 *
 * Hver strategi i DB får unike parametere som gjør at den oppfører seg
 * annerledes enn andre strategier, selv innen samme engine-type.
 *
 * Mål: Ingen to bots skal ha identiske signaler.
 */

import type { DarkFleetConfig } from "./regime/tick-adapter";

// ============================================================================
// Base configs per strategy engine — tuned for different risk profiles
// ============================================================================

export interface MultiSignalConfig {
  rsi_buy_threshold: number;
  rsi_sell_threshold: number;
  rsi_period: number;
  macd_fast: number;
  macd_slow: number;
  macd_signal: number;
  momentum_period: number;
  use_bollinger: boolean;
  min_confidence: number;
  position_size: number;
  max_position_size: number;
  trailing_stop_atr_mult: number;
  use_volume_filter: boolean;
  use_rsi_divergence: boolean;
  use_adx_filter?: boolean;
  adx_threshold?: number;
  adx_period?: number;
}

export interface TrendFollowConfig {
  fast_period: number;
  slow_period: number;
  use_adx_filter: boolean;
  adx_threshold: number;
  adx_period: number;
  use_trailing_stop: boolean;
  trailing_stop_pct: number;
  position_size: number;
  use_ema: boolean;
  confirmation_timeframes: string[];
}

export interface DCAConfig {
  interval_minutes: number;
  position_size: number;
  use_trailing_stop: boolean;
  partial_tp_levels: Array<{ target_pct: number; sell_pct: number }>;
  dip_multiplier: number;
  fomo_reduction: number;
  max_daily_buys: number;
  use_atr_dip_boost?: boolean;
}

export interface GridConfig {
  grid_levels: number;
  grid_range_pct: number;
  volatility_adjust: boolean;
  atr_period: number;
  position_size: number;
  max_trades_per_day: number;
  rebalance_on_regime_change: boolean;
  atr_based_range?: boolean;
}

export interface AICopyConfig {
  use_bollinger_breakout: boolean;
  bb_period: number;
  bb_std: number;
  momentum_period: number;
  min_momentum_pct: number;
  position_size: number;
  hold_time_max_hours: number;
  use_atr_stop?: boolean;
  atr_stop_mult?: number;
}

export interface HybridArbitrageConfig {
  grid_weight: number;
  trend_weight: number;
  grid_levels: number;
  trend_fast_period: number;
  trend_slow_period: number;
  switch_threshold: number;
  position_size: number;
}

export type StrategyConfig =
  | MultiSignalConfig
  | TrendFollowConfig
  | DCAConfig
  | GridConfig
  | AICopyConfig
  | HybridArbitrageConfig;

// ============================================================================
// Strategy UUID → Config mapping
// ============================================================================

export const STRATEGY_UUID_CONFIGS: Record<
  string,
  { engine: string; config: Record<string, unknown>; darkFleet?: Partial<DarkFleetConfig>; preferredPairs?: string[] }
> = {
  // ── MultiSignal Aktiv Gamma — Aggressive multi-signal (tightened v2) ─────
  "a21f535d-e0f0-4ad5-a1b9-c08a49be12f0": {
    engine: "multi_signal",
    preferredPairs: ["BTCUSDT", "ETHUSDT"],
    config: {
      rsi_buy_threshold: 35,
      rsi_sell_threshold: 65,
      rsi_period: 14,
      macd_fast: 12,
      macd_slow: 26,
      macd_signal: 9,
      momentum_period: 5,
      use_bollinger: true,
      min_confidence: 2,
      position_size: 0.06,
      max_position_size: 0.1,
      trailing_stop_atr_mult: 2,
      use_volume_filter: true,
      use_rsi_divergence: true,
      use_adx_filter: true,
      adx_threshold: 20,
      adx_period: 14,
    } satisfies MultiSignalConfig,
  },

  // ── AI Copy Epsilon — Bollinger breakout + momentum (ETH pivot) ─────────
  "071a6106-ae28-49f2-93e5-cec281e33fc5": {
    engine: "ai_copy",
    preferredPairs: ["ETHUSDT", "SOLUSDT"],
    config: {
      use_bollinger_breakout: true,
      bb_period: 20,
      bb_std: 2,
      momentum_period: 10,
      min_momentum_pct: 1.5,
      position_size: 0.06,
      hold_time_max_hours: 24,
      use_atr_stop: true,
      atr_stop_mult: 2,
    } satisfies AICopyConfig,
  },

  // ── Dark Fleet Champion — Conservative multi-signal (V2 baseline) ─────────
  "39cae21a-7449-43aa-b202-727227d30168": {
    engine: "multi_signal",
    preferredPairs: ["BTCUSDT"],
    config: {
      rsi_buy_threshold: 35,
      rsi_sell_threshold: 65,
      rsi_period: 21,
      macd_fast: 8,
      macd_slow: 21,
      macd_signal: 5,
      momentum_period: 10,
      use_bollinger: true,
      min_confidence: 2.5,
      position_size: 0.06,
      max_position_size: 0.1,
      trailing_stop_atr_mult: 1.5,
      use_volume_filter: true,
      use_rsi_divergence: false,
    } satisfies MultiSignalConfig,
    darkFleet: {
      enabled: false,
      technicalWeight: 0.7,
      narrativeWeight: 0.15,
      regimeWeight: 0.15,
      threshold: 0.4,
      maxPositionSize: 0.08,
    },
  },

  // ── Dark Fleet Challenger — Aggressive ensemble with Dark Fleet ───────────
  "c49a9302-65bd-48ec-b5d6-51dff32e4b0e": {
    engine: "multi_signal",
    preferredPairs: ["BTCUSDT", "ETHUSDT", "SOLUSDT"],
    config: {
      rsi_buy_threshold: 42,
      rsi_sell_threshold: 58,
      rsi_period: 14,
      macd_fast: 12,
      macd_slow: 26,
      macd_signal: 9,
      momentum_period: 5,
      use_bollinger: true,
      min_confidence: 1.5,
      position_size: 0.1,
      max_position_size: 0.15,
      trailing_stop_atr_mult: 2.0,
      use_volume_filter: true,
      use_rsi_divergence: true,
    } satisfies MultiSignalConfig,
    darkFleet: {
      enabled: true,
      technicalWeight: 0.4,
      narrativeWeight: 0.35,
      regimeWeight: 0.25,
      threshold: 0.25,
      maxPositionSize: 0.12,
    },
  },

  // ── Hybrid Arbitrage Eta — Grid + Trend hybrid ────────────────────────────
  "55903760-304a-4824-920b-f5bfc5530c45": {
    engine: "hybrid_arbitrage",
    preferredPairs: ["ETHUSDT", "BTCUSDT"],
    config: {
      grid_weight: 0.6,
      trend_weight: 0.4,
      grid_levels: 12,
      trend_fast_period: 10,
      trend_slow_period: 30,
      switch_threshold: 0.3,
      position_size: 0.07,
    } satisfies HybridArbitrageConfig,
  },

  // ── Beta Guardrail Test — Minimal trading, max safety ─────────────────────
  "d238229f-b837-4816-a846-9655b3f77e28": {
    engine: "multi_signal",
    preferredPairs: ["BTCUSDT"],
    config: {
      rsi_buy_threshold: 30,
      rsi_sell_threshold: 70,
      rsi_period: 14,
      macd_fast: 12,
      macd_slow: 26,
      macd_signal: 9,
      momentum_period: 10,
      use_bollinger: true,
      min_confidence: 3,
      position_size: 0.03,
      max_position_size: 0.05,
      trailing_stop_atr_mult: 1.0,
      use_volume_filter: true,
      use_rsi_divergence: false,
    } satisfies MultiSignalConfig,
  },

  // ── DCA Trygg — Standard DCA (altcoin-tuned) ────────────────────────────
  "9fab4471-a0d4-4870-9611-44bd69403775": {
    engine: "dca",
    config: {
      interval_minutes: 240,
      position_size: 0.04,
      use_trailing_stop: true,
      partial_tp_levels: [
        { target_pct: 5, sell_pct: 25 },
        { target_pct: 10, sell_pct: 25 },
        { target_pct: 15, sell_pct: 25 },
        { target_pct: 25, sell_pct: 25 },
      ],
      dip_multiplier: 2,
      fomo_reduction: 0.5,
      max_daily_buys: 3,
      use_atr_dip_boost: true,
    } satisfies DCAConfig,
  },

  // ── Trend Balansert — Standard trend follow ───────────────────────────────
  "9febe734-d40e-4a78-b65d-2b346899ca17": {
    engine: "trend_follow",
    config: {
      fast_period: 9,
      slow_period: 21,
      use_adx_filter: true,
      adx_threshold: 25,
      adx_period: 14,
      use_trailing_stop: true,
      trailing_stop_pct: 3,
      position_size: 0.08,
      use_ema: true,
      confirmation_timeframes: ["1h", "4h"],
    } satisfies TrendFollowConfig,
  },

  // ── Grid Bot — Volatility-adjusted grid ──────────────────────────────────
  "3caad63a-a043-48fa-82f8-c54b3065130a": {
    engine: "grid",
    config: {
      grid_levels: 10,
      grid_range_pct: 30,
      volatility_adjust: true,
      atr_period: 14,
      position_size: 0.05,
      max_trades_per_day: 6,
      rebalance_on_regime_change: true,
      atr_based_range: true,
    } satisfies GridConfig,
  },
};

// ============================================================================
// Helpers
// ============================================================================

/**
 * Get strategy config by UUID. Falls back to engine defaults if UUID not found.
 */
export function getStrategyConfig(
  strategyId: string,
): { engine: string; config: Record<string, unknown>; darkFleet?: Partial<DarkFleetConfig> } | null {
  const direct = STRATEGY_UUID_CONFIGS[strategyId];
  if (direct) return direct;

  // Fallback: check if strategyId is an engine name directly
  const engineDefaults: Record<string, { engine: string; config: Record<string, unknown>; darkFleet?: Partial<DarkFleetConfig> }> = {
    multi_signal: {
      engine: "multi_signal",
      config: {
        rsi_buy_threshold: 40,
        rsi_sell_threshold: 60,
        rsi_period: 14,
        macd_fast: 12,
        macd_slow: 26,
        macd_signal: 9,
        momentum_period: 5,
        use_bollinger: true,
        min_confidence: 2,
        position_size: 0.06,
        max_position_size: 0.1,
        trailing_stop_atr_mult: 2.0,
        use_volume_filter: false,
        use_rsi_divergence: false,
        use_adx_filter: true,
        adx_threshold: 20,
        adx_period: 14,
      },
    },
    trend_follow: {
      engine: "trend_follow",
      config: {
        fast_period: 8,
        slow_period: 21,
        use_adx_filter: true,
        adx_threshold: 25,
        adx_period: 14,
        use_trailing_stop: true,
        trailing_stop_pct: 3,
        position_size: 0.1,
        use_ema: false,
        confirmation_timeframes: ["1h"],
      },
    },
    dca: {
      engine: "dca",
      config: {
        interval_minutes: 30,
        position_size: 0.05,
        use_trailing_stop: true,
        partial_tp_levels: [
          { target_pct: 3, sell_pct: 33 },
          { target_pct: 7, sell_pct: 33 },
          { target_pct: 12, sell_pct: 34 },
        ],
        dip_multiplier: 3,
        fomo_reduction: 0.5,
        max_daily_buys: 5,
      },
      darkFleet: { enabled: false },
    },
    grid: {
      engine: "grid",
      config: {
        grid_levels: 10,
        grid_range_pct: 20,
        volatility_adjust: true,
        atr_period: 14,
        position_size: 0.05,
        max_trades_per_day: 5,
        rebalance_on_regime_change: false,
      },
    },
    max_aggressive: {
      engine: "max_aggressive",
      config: {
        symbol: "SOLUSDC",
        leverage: 5,
        grid_range_pct: 1.5,
        grid_levels: 20,
        capital: 100,
        kill_switch_loss_pct: 3,
        auto_reduce_after_loss_days: 2,
        rebalance_interval_hours: 2,
        exchange: "okx",
        quote: "USDC",
      },
      // Dark Fleet skal IKKE overstyre max_aggressive — strategien er mekanisk grid
      darkFleet: { enabled: false },
    },
  };

  return engineDefaults[strategyId] ?? null;
}

/**
 * Resolve engine key from strategy UUID or alias.
 * Replaces the old UUID_TO_ENGINE mapping with config-aware resolution.
 */
export function resolveStrategyEngine(strategyId: string): string {
  const config = getStrategyConfig(strategyId);
  return config?.engine ?? "multi_signal";
}

/**
 * Check if a strategy should use Dark Fleet.
 */
export function shouldUseDarkFleet(strategyId: string): boolean {
  const config = getStrategyConfig(strategyId);
  return config?.darkFleet?.enabled ?? false;
}

/**
 * Get Dark Fleet config override for a strategy.
 */
export function getDarkFleetConfig(strategyId: string): Partial<DarkFleetConfig> | undefined {
  const config = getStrategyConfig(strategyId);
  return config?.darkFleet;
}
