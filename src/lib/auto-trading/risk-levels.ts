/**
 * Risk Levels Configuration
 * Central config for all 4 risk levels used across the entire system.
 *
 * To change a risk parameter: edit ONE number here → entire system updates.
 * To add a 5th level: add a new block → done.
 */

export const RISK_LEVELS = {
  safe: {
    label: "Trygg",
    emoji: "🟢",
    daily_loss_limit_pct: 1,
    max_position_size_pct: 2,
    stop_loss_pct: 5,
    max_trades_per_day: 3,
    trailing_stop_pct: 3,
    max_drawdown_pct: 10,
    partial_tp_levels: [
      { target_pct: 3, sell_pct: 50 },
      { target_pct: 5, sell_pct: 50 },
    ],
  },
  balanced: {
    label: "Balansert",
    emoji: "🔵",
    daily_loss_limit_pct: 3,
    max_position_size_pct: 5,
    stop_loss_pct: 8,
    max_trades_per_day: 5,
    trailing_stop_pct: 5,
    max_drawdown_pct: 15,
    partial_tp_levels: [
      { target_pct: 5, sell_pct: 30 },
      { target_pct: 10, sell_pct: 30 },
      { target_pct: 15, sell_pct: 40 },
    ],
  },
  offensive: {
    label: "Offensiv",
    emoji: "🟠",
    daily_loss_limit_pct: 5,
    max_position_size_pct: 10,
    stop_loss_pct: 12,
    max_trades_per_day: 10,
    trailing_stop_pct: 8,
    max_drawdown_pct: 20,
    partial_tp_levels: [
      { target_pct: 8, sell_pct: 25 },
      { target_pct: 15, sell_pct: 35 },
      { target_pct: 25, sell_pct: 40 },
    ],
  },
  aggressive: {
    label: "Aggressiv",
    emoji: "🔴",
    daily_loss_limit_pct: 10,
    max_position_size_pct: 20,
    stop_loss_pct: 15,
    max_trades_per_day: 20,
    trailing_stop_pct: 10,
    max_drawdown_pct: 25,
    partial_tp_levels: [
      { target_pct: 10, sell_pct: 20 },
      { target_pct: 20, sell_pct: 30 },
      { target_pct: 30, sell_pct: 50 },
    ],
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
