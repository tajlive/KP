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

export type RiskLevel = 'conservative' | 'moderate' | 'aggressive';

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
  name: 'conservative',
  description: 'Kapitalpreservering med steady growth. Lav risiko, konsistente gevinster.',
  
  kellyFraction: 0.5,
  maxPositionSizePercent: 5,
  minPositionSizeUsd: 20,
  volatilityAdjustment: true,
  
  stopLossPercent: 2.0,
  takeProfitPercent: 4.5,
  trailingStopPercent: 1.0,
  riskRewardRatio: 2.0,
  
  maxLeverage: 2,
  defaultLeverage: 1,
  
  maxOpenPositions: 3,
  maxDailyLossPercent: 2,
  maxTotalDrawdownPercent: 10,
  
  minTradeIntervalMinutes: 30,
  maxTradesPerDay: 8,
  
  minLiquidityUsd24h: 50_000_000,
  allowedPairs: ['BTC/USDT', 'ETH/USDT', 'BNB/USDT', 'SOL/USDT'],
  maxSpreadPercent: 0.1,
  
  targetWinRate: 0.58,
  targetProfitFactor: 1.6,
  targetSharpeRatio: 1.1,
  maxAcceptableDrawdown: 0.10,
};

// MODERAT: Balansert vekst
export const MODERATE_PROFILE: OptimizedRiskProfile = {
  name: 'moderate',
  description: 'Balansert risiko/vekst. Moderat volatilitet for bedre avkastning.',
  
  kellyFraction: 0.67,
  maxPositionSizePercent: 8,
  minPositionSizeUsd: 15,
  volatilityAdjustment: true,
  
  stopLossPercent: 3.5,
  takeProfitPercent: 9.0,
  trailingStopPercent: 1.5,
  riskRewardRatio: 2.0,
  
  maxLeverage: 3,
  defaultLeverage: 2,
  
  maxOpenPositions: 5,
  maxDailyLossPercent: 5,
  maxTotalDrawdownPercent: 15,
  
  minTradeIntervalMinutes: 15,
  maxTradesPerDay: 15,
  
  minLiquidityUsd24h: 20_000_000,
  allowedPairs: [
    'BTC/USDT', 'ETH/USDT', 'BNB/USDT', 'SOL/USDT',
    'ADA/USDT', 'DOT/USDT', 'MATIC/USDT', 'AVAX/USDT'
  ],
  maxSpreadPercent: 0.2,
  
  targetWinRate: 0.65,
  targetProfitFactor: 2.0,
  targetSharpeRatio: 1.5,
  maxAcceptableDrawdown: 0.15,
};

// AGGRESSIV: Maksimal vekst
export const AGGRESSIVE_PROFILE: OptimizedRiskProfile = {
  name: 'aggressive',
  description: 'Maksimal vekst med akseptert hoy volatilitet. Kun for erfarne tradere.',
  
  kellyFraction: 1.0,
  maxPositionSizePercent: 12,
  minPositionSizeUsd: 10,
  volatilityAdjustment: true,
  
  stopLossPercent: 6.0,
  takeProfitPercent: 18.0,
  trailingStopPercent: 2.5,
  riskRewardRatio: 2.5,
  
  maxLeverage: 5,
  defaultLeverage: 3,
  
  maxOpenPositions: 8,
  maxDailyLossPercent: 10,
  maxTotalDrawdownPercent: 25,
  
  minTradeIntervalMinutes: 5,
  maxTradesPerDay: 30,
  
  minLiquidityUsd24h: 5_000_000,
  allowedPairs: [
    'BTC/USDT', 'ETH/USDT', 'BNB/USDT', 'SOL/USDT',
    'ADA/USDT', 'DOT/USDT', 'MATIC/USDT', 'AVAX/USDT',
    'LINK/USDT', 'UNI/USDT', 'ATOM/USDT', 'FTM/USDT'
  ],
  maxSpreadPercent: 0.5,
  
  targetWinRate: 0.70,
  targetProfitFactor: 2.3,
  targetSharpeRatio: 1.8,
  maxAcceptableDrawdown: 0.25,
};

export const OPTIMIZED_PROFILES: Record<RiskLevel, OptimizedRiskProfile> = {
  conservative: CONSERVATIVE_PROFILE,
  moderate: MODERATE_PROFILE,
  aggressive: AGGRESSIVE_PROFILE,
};

export function getOptimizedRiskProfile(level: RiskLevel): OptimizedRiskProfile {
  return OPTIMIZED_PROFILES[level] || MODERATE_PROFILE;
}
