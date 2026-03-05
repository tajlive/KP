/**
 * Risk Levels Configuration
 * Central config for all 4 risk levels used across the entire system.
 *
 * To change a risk parameter: edit ONE number here → entire system updates.
 * To add a 5th level: add a new block → done.
 */

import {
  OPTIMIZED_PROFILES,
  RiskLevel as OptRiskLevel,
} from "./../config/optimized-risk-profiles";

export const RISK_LEVELS = {
  safe: {
    label: "Trygg",
    emoji: "🟢",
    daily_loss_limit_pct: OPTIMIZED_PROFILES.conservative.maxDailyLossPercent,
    max_position_size_pct:
      OPTIMIZED_PROFILES.conservative.maxPositionSizePercent,
    stop_loss_pct: OPTIMIZED_PROFILES.conservative.stopLossPercent,
    max_trades_per_day: OPTIMIZED_PROFILES.conservative.maxTradesPerDay,
    trailing_stop_pct: OPTIMIZED_PROFILES.conservative.trailingStopPercent,
    max_drawdown_pct: OPTIMIZED_PROFILES.conservative.maxTotalDrawdownPercent,
    partial_tp_levels: [
      {
        target_pct: OPTIMIZED_PROFILES.conservative.takeProfitPercent * 0.5,
        sell_pct: 50,
      },
      {
        target_pct: OPTIMIZED_PROFILES.conservative.takeProfitPercent,
        sell_pct: 50,
      },
    ],
    optimizedProfile: "conservative" as OptRiskLevel,
  },
  balanced: {
    label: "Balansert",
    emoji: "🔵",
    daily_loss_limit_pct: OPTIMIZED_PROFILES.moderate.maxDailyLossPercent,
    max_position_size_pct: OPTIMIZED_PROFILES.moderate.maxPositionSizePercent,
    stop_loss_pct: OPTIMIZED_PROFILES.moderate.stopLossPercent,
    max_trades_per_day: OPTIMIZED_PROFILES.moderate.maxTradesPerDay,
    trailing_stop_pct: OPTIMIZED_PROFILES.moderate.trailingStopPercent,
    max_drawdown_pct: OPTIMIZED_PROFILES.moderate.maxTotalDrawdownPercent,
    partial_tp_levels: [
      {
        target_pct: OPTIMIZED_PROFILES.moderate.takeProfitPercent * 0.5,
        sell_pct: 30,
      },
      {
        target_pct: OPTIMIZED_PROFILES.moderate.takeProfitPercent,
        sell_pct: 70,
      },
    ],
    optimizedProfile: "moderate" as OptRiskLevel,
  },
  offensive: {
    label: "Offensiv",
    emoji: "🟠",
    daily_loss_limit_pct: OPTIMIZED_PROFILES.aggressive.maxDailyLossPercent,
    max_position_size_pct: OPTIMIZED_PROFILES.aggressive.maxPositionSizePercent,
    stop_loss_pct: OPTIMIZED_PROFILES.aggressive.stopLossPercent,
    max_trades_per_day: OPTIMIZED_PROFILES.aggressive.maxTradesPerDay,
    trailing_stop_pct: OPTIMIZED_PROFILES.aggressive.trailingStopPercent,
    max_drawdown_pct: OPTIMIZED_PROFILES.aggressive.maxTotalDrawdownPercent,
    partial_tp_levels: [
      {
        target_pct: OPTIMIZED_PROFILES.aggressive.takeProfitPercent * 0.5,
        sell_pct: 30,
      },
      {
        target_pct: OPTIMIZED_PROFILES.aggressive.takeProfitPercent,
        sell_pct: 70,
      },
    ],
    optimizedProfile: "aggressive" as OptRiskLevel,
  },
  aggressive: {
    label: "Aggressiv",
    emoji: "🔴",
    daily_loss_limit_pct: OPTIMIZED_PROFILES.dynamic.maxDailyLossPercent,
    max_position_size_pct: OPTIMIZED_PROFILES.dynamic.maxPositionSizePercent,
    stop_loss_pct: OPTIMIZED_PROFILES.dynamic.stopLossPercent,
    max_trades_per_day: OPTIMIZED_PROFILES.dynamic.maxTradesPerDay,
    trailing_stop_pct: OPTIMIZED_PROFILES.dynamic.trailingStopPercent,
    max_drawdown_pct: OPTIMIZED_PROFILES.dynamic.maxTotalDrawdownPercent,
    partial_tp_levels: [
      {
        target_pct: OPTIMIZED_PROFILES.dynamic.takeProfitPercent * 0.5,
        sell_pct: 20,
      },
      {
        target_pct: OPTIMIZED_PROFILES.dynamic.takeProfitPercent,
        sell_pct: 80,
      },
    ],
    optimizedProfile: "dynamic" as OptRiskLevel,
  },
} as const;

export type RiskLevelKey = keyof typeof RISK_LEVELS;

/** Default supported trading pairs */
export const SUPPORTED_PAIRS = [
  "BTCUSDT",
  "ETHUSDT",
  "SOLUSDT",
  "XRPUSDT",
  "BNBUSDT",
] as const;

export type SupportedPair = (typeof SUPPORTED_PAIRS)[number];

import type { RiskConfig } from "@/lib/auto-trading/risk-manager";

/**
 * Konverterer et brukervalg ("safe", "offensive", etc) til
 * det nøyaktige RiskConfig-formatet som kreves av RiskManager i backend.
 */
export function mapRiskLevelToConfig(levelKey?: string): RiskConfig {
  const level =
    levelKey && RISK_LEVELS[levelKey as RiskLevelKey]
      ? RISK_LEVELS[levelKey as RiskLevelKey]
      : RISK_LEVELS["balanced"];

  return {
    maxPositionSizePercent: level.max_position_size_pct,
    stopLossPercent: level.stop_loss_pct,
    trailingStopLossPercent: level.trailing_stop_pct,
    maxDailyLossPercent: level.daily_loss_limit_pct,
    maxDailyTrades: level.max_trades_per_day,
    maxDrawdownPercent: level.max_drawdown_pct,
    maxLeverage: 1, // Default to 1x leverage for paper/basic live
  };
}
