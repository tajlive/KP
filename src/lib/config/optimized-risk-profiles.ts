/**
 * ═══════════════════════════════════════════════════════════════════════════
 * KLARPAKKE: OPTIMALISERTE RISK PROFILES
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Basert pa:
 * - Konkurrentanalyse: 3Commas (87% win rate, 29.4% ROI)[1]
 * - Freqtrade community (65% win rate, optimal Kelly f*=0.37)[2][3]
 * - Pionex Grid (84% win rate, 22.1% ROI)[4]
 * - Akademisk research: Kelly Criterion, volatility-adjusted sizing[5][6]
 * - Institutional risk management practices[7]
 *
 * Sist oppdatert: 2026-02-24
 */

export type RiskLevel = "conservative" | "moderate" | "aggressive" | "dynamic";

export interface OptimizedRiskProfile {
  name: RiskLevel;
  description: string;

  // Position Sizing
  kellyFraction: number;
  maxPositionSizePercent: number;
  minPositionSizeUsd: number;
  volatilityAdjustment: boolean;

  // Stop Loss / Take Profit
  stopLossPercent: number;
  takeProfitPercent: number;
  trailingStopPercent: number;
  riskRewardRatio: number;

  // Leverage
  maxLeverage: number;
  defaultLeverage: number;

  // Portfolio Limits
  maxOpenPositions: number;
  maxDailyLossPercent: number;
  maxTotalDrawdownPercent: number;

  // Trading Frequency
  minTradeIntervalMinutes: number;
  maxTradesPerDay: number;

  // Filters
  minLiquidityUsd24h: number;
  allowedPairs: string[];
  maxSpreadPercent: number;

  // Performance Targets
  targetWinRate: number;
  targetProfitFactor: number;
  targetSharpeRatio: number;
  maxAcceptableDrawdown: number;
}

// KONSERVATIV: Kapitalpreservering
export const CONSERVATIVE_PROFILE: OptimizedRiskProfile = {
  name: "conservative",
  description:
    "Kapitalpreservering med steady growth. Lav risiko, konsistente gevinster.",

  kellyFraction: 0.3,
  maxPositionSizePercent: 2.0, // User recommendation: 2%
  minPositionSizeUsd: 20,
  volatilityAdjustment: true,

  stopLossPercent: 1.5,
  takeProfitPercent: 3.5,
  trailingStopPercent: 0.8,
  riskRewardRatio: 2.3,

  maxLeverage: 1,
  defaultLeverage: 1,

  maxOpenPositions: 3,
  maxDailyLossPercent: 1.0,
  maxTotalDrawdownPercent: 5,

  minTradeIntervalMinutes: 60,
  maxTradesPerDay: 5,

  minLiquidityUsd24h: 100_000_000,
  allowedPairs: ["BTC/USDT", "ETH/USDT", "BNB/USDT", "SOL/USDT"],
  maxSpreadPercent: 0.05,

  targetWinRate: 0.62,
  targetProfitFactor: 1.8,
  targetSharpeRatio: 1.5,
  maxAcceptableDrawdown: 0.05,
};

// MODERAT: Balansert vekst
export const MODERATE_PROFILE: OptimizedRiskProfile = {
  name: "moderate",
  description:
    "Balansert risiko/vekst. Moderat volatilitet for bedre avkastning.",

  kellyFraction: 0.5,
  maxPositionSizePercent: 5.0, // User recommendation: 5%
  minPositionSizeUsd: 15,
  volatilityAdjustment: true,

  stopLossPercent: 3.0,
  takeProfitPercent: 7.5,
  trailingStopPercent: 1.2,
  riskRewardRatio: 2.5,

  maxLeverage: 1,
  defaultLeverage: 1,

  maxOpenPositions: 5,
  maxDailyLossPercent: 2.0,
  maxTotalDrawdownPercent: 15,

  minTradeIntervalMinutes: 30,
  maxTradesPerDay: 10,

  minLiquidityUsd24h: 50_000_000,
  allowedPairs: [
    "BTC/USDT",
    "ETH/USDT",
    "BNB/USDT",
    "SOL/USDT",
    "ADA/USDT",
    "DOT/USDT",
    "POL/USDT",
    "AVAX/USDT",
  ],
  maxSpreadPercent: 0.1,

  targetWinRate: 0.65,
  targetProfitFactor: 2.0,
  targetSharpeRatio: 1.5,
  maxAcceptableDrawdown: 0.15,
};

// AGGRESSIV: Maksimal vekst
export const AGGRESSIVE_PROFILE: OptimizedRiskProfile = {
  name: "aggressive",
  description:
    "Maksimal vekst med akseptert høy volatilitet. Kun for erfarne tradere.",

  kellyFraction: 0.75,
  maxPositionSizePercent: 10.0, // User recommendation: 10%
  minPositionSizeUsd: 10,
  volatilityAdjustment: true,

  stopLossPercent: 5.0,
  takeProfitPercent: 15.0,
  trailingStopPercent: 2.0,
  riskRewardRatio: 3.0,

  maxLeverage: 2,
  defaultLeverage: 1,

  maxOpenPositions: 10,
  maxDailyLossPercent: 5.0,
  maxTotalDrawdownPercent: 25,

  minTradeIntervalMinutes: 5,
  maxTradesPerDay: 50,

  minLiquidityUsd24h: 20_000_000,
  allowedPairs: [
    "BTC/USDT",
    "ETH/USDT",
    "BNB/USDT",
    "SOL/USDT",
    "ADA/USDT",
    "DOT/USDT",
    "POL/USDT",
    "AVAX/USDT",
    "LINK/USDT",
    "UNI/USDT",
    "ATOM/USDT",
    "FTM/USDT",
  ],
  maxSpreadPercent: 0.2,

  targetWinRate: 0.68,
  targetProfitFactor: 2.5,
  targetSharpeRatio: 1.8,
  maxAcceptableDrawdown: 0.25,
};

// DYNAMISK: Maksimal vekst (High Frequency)
export const DYNAMIC_PROFILE: OptimizedRiskProfile = {
  name: "dynamic",
  description:
    "Ekstrem vekst via kraftig Kelly-sizing. Kun for risikovillige kapitalforvaltere.",

  kellyFraction: 1.0,
  maxPositionSizePercent: 20.0, // User recommendation: 20%
  minPositionSizeUsd: 10,
  volatilityAdjustment: true,

  stopLossPercent: 7.0,
  takeProfitPercent: 25.0,
  trailingStopPercent: 3.0,
  riskRewardRatio: 3.5,

  maxLeverage: 3,
  defaultLeverage: 2,

  maxOpenPositions: 15,
  maxDailyLossPercent: 10.0,
  maxTotalDrawdownPercent: 35,

  minTradeIntervalMinutes: 1,
  maxTradesPerDay: 100,

  minLiquidityUsd24h: 10_000_000,
  allowedPairs: [
    "BTC/USDT",
    "ETH/USDT",
    "BNB/USDT",
    "SOL/USDT",
    "ADA/USDT",
    "DOT/USDT",
    "POL/USDT",
    "AVAX/USDT",
    "LINK/USDT",
    "UNI/USDT",
    "ATOM/USDT",
    "FTM/USDT",
    "XRP/USDT",
    "DOGE/USDT",
  ],
  maxSpreadPercent: 0.3,

  targetWinRate: 0.72,
  targetProfitFactor: 2.8,
  targetSharpeRatio: 2.0,
  maxAcceptableDrawdown: 0.35,
};

export const OPTIMIZED_PROFILES: Record<RiskLevel, OptimizedRiskProfile> = {
  conservative: CONSERVATIVE_PROFILE,
  moderate: MODERATE_PROFILE,
  aggressive: AGGRESSIVE_PROFILE,
  dynamic: DYNAMIC_PROFILE,
};

export function getOptimizedRiskProfile(
  level: RiskLevel,
): OptimizedRiskProfile {
  return OPTIMIZED_PROFILES[level] || MODERATE_PROFILE;
}
