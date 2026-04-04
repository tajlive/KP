/**
 * Market Regime Detector
 * Detects market regimes (BULL, BEAR, SIDEWAYS, UNCERTAIN) using EMA/ADX/RSI
 * 
 * Regime Detection Pipeline:
 * 1. EMA Analysis (21/55/200) - Primary trend direction
 * 2. ADX Analysis - Trend strength confirmation
 * 3. RSI Analysis - Momentum confirmation
 * 4. Confidence scoring based on indicator alignment
 */

import {
  OHLCV,
  extractArrays,
  getEMAValues,
  getRSIValue,
  calculateADX,
  hasEnoughData,
  EMAResult,
  ADXResult,
  RSIResult,
} from './indicators';

// ============================================================================
// Types
// ============================================================================

export type MarketRegime = 'BULL' | 'BEAR' | 'SIDEWAYS' | 'UNCERTAIN';
export type ConfidenceLevel = 'HIGH' | 'MEDIUM' | 'LOW';

export interface RegimeResult {
  regime: MarketRegime;
  confidence: ConfidenceLevel;
  confidenceScore: number; // 0-1
  reasoning: string;
  indicators: {
    ema: EMAResult | null;
    adx: ADXResult | null;
    rsi: RSIResult | null;
  };
  timestamp: string;
  symbol: string;
}

export interface RegimeStrategy {
  regime: MarketRegime;
  positionSizeMul: number; // 0.0 to 1.0
  maxOpenPositions: number;
  stopLossMul: number; // Multiplier for stop loss
  approach: 'aggressive' | 'normal' | 'cautious' | 'defensive' | 'halt';
  description: string;
  allowNewPositions: boolean;
}

export interface RegimeCacheEntry {
  symbol: string;
  regime_data: RegimeResult;
  created_at: string;
}

// ============================================================================
// Constants
// ============================================================================

const REGIME_CACHE_TTL_MS = 4 * 60 * 60 * 1000; // 4 hours

// Regime strategy mapping
export const REGIME_STRATEGY_MAP: Record<MarketRegime, RegimeStrategy> = {
  BULL: {
    regime: 'BULL',
    positionSizeMul: 1.0,
    maxOpenPositions: 3,
    stopLossMul: 1.0,
    approach: 'aggressive',
    description: 'Bull market: Full position size, normal stops',
    allowNewPositions: true,
  },
  BEAR: {
    regime: 'BEAR',
    positionSizeMul: 0.0, // BLOCK NEW BUYS
    maxOpenPositions: 0,
    stopLossMul: 0.8,
    approach: 'halt',
    description: 'Bear market: NO new positions, protect capital',
    allowNewPositions: false,
  },
  SIDEWAYS: {
    regime: 'SIDEWAYS',
    positionSizeMul: 0.6,
    maxOpenPositions: 2,
    stopLossMul: 1.5, // Wider stops in chop
    approach: 'cautious',
    description: 'Sideways: Reduced size, wider stops, range trading',
    allowNewPositions: true,
  },
  UNCERTAIN: {
    regime: 'UNCERTAIN',
    positionSizeMul: 0.3,
    maxOpenPositions: 1,
    stopLossMul: 1.2,
    approach: 'defensive',
    description: 'Uncertain: Minimal exposure, tight risk control',
    allowNewPositions: true,
  },
};

// ============================================================================
// Regime Detection Core
// ============================================================================

/**
 * Detect market regime from OHLCV data
 */
export function detectRegime(ohlcv: OHLCV[], symbol: string): RegimeResult {
  if (!hasEnoughData(ohlcv, 200)) {
    return createUncertainResult(symbol, 'Insufficient data (need 200+ candles)');
  }

  const { highs, lows, closes } = extractArrays(ohlcv);

  // Calculate indicators
  const ema = getEMAValues(closes);
  const adx = calculateADX(highs, lows, closes);
  const rsi = getRSIValue(closes);

  if (!ema || !adx) {
    return createUncertainResult(symbol, 'Indicator calculation failed');
  }

  // Analyze regime based on indicators
  const analysis = analyzeRegime(ema, adx, rsi);

  return {
    regime: analysis.regime,
    confidence: analysis.confidence,
    confidenceScore: analysis.confidenceScore,
    reasoning: analysis.reasoning,
    indicators: { ema, adx, rsi },
    timestamp: new Date().toISOString(),
    symbol,
  };
}

/**
 * Analyze indicators to determine regime
 */
function analyzeRegime(
  ema: EMAResult,
  adx: ADXResult,
  rsi: RSIResult | null
): { regime: MarketRegime; confidence: ConfidenceLevel; confidenceScore: number; reasoning: string } {
  const reasons: string[] = [];
  let bullScore = 0;
  let bearScore = 0;
  let sidewaysScore = 0;

  // EMA Analysis (highest weight)
  if (ema.trend === 'above_21') {
    bullScore += 3;
    reasons.push('Price above EMA21 (strong uptrend)');
  } else if (ema.trend === 'between_21_55') {
    bullScore += 1;
    reasons.push('Price between EMA21/55 (moderate uptrend)');
  } else if (ema.trend === 'between_55_200') {
    bearScore += 1;
    reasons.push('Price between EMA55/200 (weakening)');
  } else {
    bearScore += 3;
    reasons.push('Price below EMA200 (downtrend)');
  }

  // EMA alignment check
  if (ema.ema21 > ema.ema55 && ema.ema55 > ema.ema200) {
    bullScore += 2;
    reasons.push('Bullish EMA alignment (21>55>200)');
  } else if (ema.ema21 < ema.ema55 && ema.ema55 < ema.ema200) {
    bearScore += 2;
    reasons.push('Bearish EMA alignment (21<55<200)');
  }

  // ADX Analysis (trend strength)
  if (adx.trendStrength === 'strong' || adx.trendStrength === 'very_strong') {
    if (adx.trendDirection === 'up') {
      bullScore += 2;
      reasons.push(`Strong uptrend (ADX: ${adx.adx.toFixed(1)})`);
    } else if (adx.trendDirection === 'down') {
      bearScore += 2;
      reasons.push(`Strong downtrend (ADX: ${adx.adx.toFixed(1)})`);
    }
  } else if (adx.trendStrength === 'weak') {
    sidewaysScore += 2;
    reasons.push(`Weak trend, likely ranging (ADX: ${adx.adx.toFixed(1)})`);
  }

  // RSI Analysis (momentum confirmation)
  if (rsi) {
    if (rsi.value > 60) {
      bullScore += 1;
      reasons.push(`Bullish momentum (RSI: ${rsi.value.toFixed(1)})`);
    } else if (rsi.value < 40) {
      bearScore += 1;
      reasons.push(`Bearish momentum (RSI: ${rsi.value.toFixed(1)})`);
    } else {
      sidewaysScore += 1;
      reasons.push(`Neutral momentum (RSI: ${rsi.value.toFixed(1)})`);
    }
  }

  // Determine regime
  let regime: MarketRegime;
  let confidenceScore: number;

  const totalScore = bullScore + bearScore + sidewaysScore;
  const bullPct = bullScore / totalScore;
  const bearPct = bearScore / totalScore;

  if (bullScore > bearScore && bullScore > sidewaysScore) {
    regime = 'BULL';
    confidenceScore = bullPct;
  } else if (bearScore > bullScore && bearScore > sidewaysScore) {
    regime = 'BEAR';
    confidenceScore = bearPct;
  } else if (sidewaysScore >= bullScore && sidewaysScore >= bearScore) {
    regime = 'SIDEWAYS';
    confidenceScore = sidewaysScore / totalScore;
  } else {
    regime = 'UNCERTAIN';
    confidenceScore = 0.3;
  }

  // Confidence level
  let confidence: ConfidenceLevel;
  if (confidenceScore >= 0.7) {
    confidence = 'HIGH';
  } else if (confidenceScore >= 0.4) {
    confidence = 'MEDIUM';
  } else {
    confidence = 'LOW';
  }

  return {
    regime,
    confidence,
    confidenceScore,
    reasoning: reasons.join('; '),
  };
}

/**
 * Create uncertain result when data is insufficient
 */
function createUncertainResult(symbol: string, reason: string): RegimeResult {
  return {
    regime: 'UNCERTAIN',
    confidence: 'LOW',
    confidenceScore: 0.1,
    reasoning: reason,
    indicators: { ema: null, adx: null, rsi: null },
    timestamp: new Date().toISOString(),
    symbol,
  };
}

// ============================================================================
// Caching Functions
// ============================================================================

/**
 * Get cached regime or compute new
 */
export async function getOrComputeRegime(
  symbol: string,
  ohlcvFetcher: () => Promise<OHLCV[]>,
  cacheGetter: (symbol: string) => Promise<RegimeCacheEntry | null>,
  cacheSetter: (entry: RegimeCacheEntry) => Promise<void>
): Promise<RegimeResult> {
  // Check cache first
  const cached = await cacheGetter(symbol);
  if (cached && isCacheValid(cached.created_at)) {
    return cached.regime_data;
  }

  // Fetch OHLCV and compute regime
  const ohlcv = await ohlcvFetcher();
  const regime = detectRegime(ohlcv, symbol);

  // Cache the result
  await cacheSetter({
    symbol,
    regime_data: regime,
    created_at: new Date().toISOString(),
  });

  return regime;
}

/**
 * Check if cache entry is still valid (4 hours)
 */
function isCacheValid(createdAt: string): boolean {
  const age = Date.now() - new Date(createdAt).getTime();
  return age < REGIME_CACHE_TTL_MS;
}

// ============================================================================
// Strategy Helpers
// ============================================================================

/**
 * Get strategy for a given regime
 */
export function getStrategyForRegime(regime: MarketRegime): RegimeStrategy {
  return REGIME_STRATEGY_MAP[regime];
}

/**
 * Check if new positions are allowed in this regime
 */
export function canOpenNewPositions(regime: MarketRegime): boolean {
  return REGIME_STRATEGY_MAP[regime].allowNewPositions;
}

/**
 * Get position size multiplier
 */
export function getPositionSizeMultiplier(regime: MarketRegime): number {
  return REGIME_STRATEGY_MAP[regime].positionSizeMul;
}

// ============================================================================
// UI Helpers
// ============================================================================

export function regimeToEmoji(regime: MarketRegime): string {
  const emoji: Record<MarketRegime, string> = {
    BULL: '🟢',
    BEAR: '🔴',
    SIDEWAYS: '🟡',
    UNCERTAIN: '⚪',
  };
  return emoji[regime];
}

export function regimeToLabel(regime: MarketRegime): string {
  const labels: Record<MarketRegime, string> = {
    BULL: 'Bull Market',
    BEAR: 'Bear Market',
    SIDEWAYS: 'Sideways',
    UNCERTAIN: 'Uncertain',
  };
  return labels[regime];
}

export function regimeToColor(regime: MarketRegime): string {
  const colors: Record<MarketRegime, string> = {
    BULL: 'text-green-600 dark:text-green-400',
    BEAR: 'text-red-600 dark:text-red-400',
    SIDEWAYS: 'text-yellow-600 dark:text-yellow-400',
    UNCERTAIN: 'text-gray-500 dark:text-gray-400',
  };
  return colors[regime];
}

export function regimeToBgColor(regime: MarketRegime): string {
  const colors: Record<MarketRegime, string> = {
    BULL: 'bg-green-100 dark:bg-green-950/50',
    BEAR: 'bg-red-100 dark:bg-red-950/50',
    SIDEWAYS: 'bg-yellow-100 dark:bg-yellow-950/50',
    UNCERTAIN: 'bg-gray-100 dark:bg-gray-950/50',
  };
  return colors[regime];
}

export function confidenceToLabel(confidence: ConfidenceLevel): string {
  const labels: Record<ConfidenceLevel, string> = {
    HIGH: 'Høy konfidens',
    MEDIUM: 'Middels konfidens',
    LOW: 'Lav konfidens',
  };
  return labels[confidence];
}

// ============================================================================
// Edge Function Helpers (for Supabase Edge Functions)
// ============================================================================

/**
 * Simple regime detection for Edge Functions (without external API calls)
 */
export function detectRegimeEdge(
  ohlcv: Array<{ high: number; low: number; close: number }>,
  symbol: string
): RegimeResult {
  const mapped: OHLCV[] = ohlcv.map((c, i) => ({
    timestamp: i,
    open: c.close, // Not used
    high: c.high,
    low: c.low,
    close: c.close,
    volume: 0,
  }));

  return detectRegime(mapped, symbol);
}

/**
 * Check if BUY should be blocked by regime
 */
export function shouldBlockBuyByRegime(regime: MarketRegime): {
  blocked: boolean;
  reason?: string;
} {
  const strategy = REGIME_STRATEGY_MAP[regime];
  
  if (!strategy.allowNewPositions) {
    return {
      blocked: true,
      reason: `Trade blocked: ${strategy.description}`,
    };
  }

  return { blocked: false };
}

/**
 * Calculate final position size with regime adjustment
 */
export function calculatePositionSize(
  baseSize: number,
  regime: MarketRegime,
  sentimentMultiplier: number = 1.0
): number {
  const regimeMul = REGIME_STRATEGY_MAP[regime].positionSizeMul;
  return baseSize * regimeMul * sentimentMultiplier;
}
