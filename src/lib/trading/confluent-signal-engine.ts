

/**
 * Confluent Signal Engine
 * Integrerer tekniske indikatorer med Sonar AI-analyse
 */

import { logger } from '@/lib/logger';
import {
  narrativeScanWithFallback,
  regimeScanWithFallback,
  type NarrativeScanResult,
  type RegimeScanResult,
  type MarketRegime,
  FALLBACK_VALUES,
} from '@/lib/ai/sonar';
import { isSonarIntegrationEnabled } from '@/lib/ai/sonar/feature-flags';
import { generateSignal, type Signal } from './signal-generator';
import type { ExplainSignalInput, ExplainSignalResult } from '@/lib/ai/sonar';
import { explainSignalWithFallback } from '@/lib/ai/sonar';
import { createClient } from '@supabase/supabase-js';
import type { Database } from '@/types/database.types';

// ============================================================================
// Types
// ============================================================================

export interface ConfluentSignalFactors {
  trend: number;
  volatility: number;
  ai_signal: number;
  narrative_sentiment?: number;
  event_risk?: number;
  market_regime?: MarketRegime;
}

export interface ConfluentSignal extends Signal {
  score: number; // 0-100
  riskLevel: 1 | 2 | 3 | 4 | 5;
  factors: ConfluentSignalFactors;
  explanationId?: string;
  metadata: {
    narrativeData?: NarrativeScanResult;
    regimeData?: RegimeScanResult;
    usedFallback: boolean;
  };
}

export interface ConfluentSignalOptions {
  symbol: string;
  strategyType: string;
  prices: number[];
  includeNarrative?: boolean;
  includeRegime?: boolean;
  userRiskProfile?: 'conservative' | 'balanced' | 'aggressive';
  userId?: string;
}

// ============================================================================
// Configuration
// ============================================================================

// Weights for different factors in final score calculation
// These are adjusted dynamically based on market regime
function getWeightsByRegime(regime: MarketRegime | 'unclear' = 'unclear'): {
  technical: number;
  narrative: number;
  regime: number;
} {
  // Base weights from environment or defaults
  const baseWeights = {
    technical: parseFloat(process.env.SIGNAL_WEIGHT_TECHNICAL || '0.5'),
    narrative: parseFloat(process.env.SIGNAL_WEIGHT_NARRATIVE || '0.25'),
    regime: parseFloat(process.env.SIGNAL_WEIGHT_REGIME || '0.25'),
  };

  // Dynamic adjustments based on market regime
  switch (regime) {
    case 'bull':
    case 'bear':
      // Trending market: AI/Narrative and Regime matter more (follow the trend)
      return {
        technical: 0.35,
        narrative: 0.35,
        regime: 0.30,
      };
    case 'range':
      // Sideways market: Technicals (RSI/Support/Resistance) are more reliable
      return {
        technical: 0.60,
        narrative: 0.20,
        regime: 0.20,
      };
    case 'unclear':
    default:
      // Default: Use base weights but ensure normalization
      const total = baseWeights.technical + baseWeights.narrative + baseWeights.regime;
      return {
        technical: baseWeights.technical / total,
        narrative: baseWeights.narrative / total,
        regime: baseWeights.regime / total,
      };
  }
}

// Risk thresholds
const RISK_THRESHOLDS = {
  LOW: 0.3,
  MEDIUM: 0.5,
  HIGH: 0.7,
};

// ============================================================================
// Volatility & Trend Calculations
// ============================================================================

/**
 * Beregn historisk volatilitet fra prisrekke
 * Returnerer normalisert verdi 0.0-1.0
 * < 0.3 = lav, 0.3-0.6 = middels, > 0.6 = høy
 */
function calculateVolatility(prices: number[]): number {
  if (prices.length < 2) return 0.5;
  const returns: number[] = [];
  for (let i = 1; i < prices.length; i++) {
    if (prices[i - 1] !== 0) {
      returns.push((prices[i] - prices[i - 1]) / prices[i - 1]);
    }
  }
  if (returns.length === 0) return 0.5;
  const mean = returns.reduce((a, b) => a + b, 0) / returns.length;
  const variance = returns.reduce((sum, r) => sum + Math.pow(r - mean, 2), 0) / returns.length;
  const stdDev = Math.sqrt(variance);
  // Annualiser (daglig -> årlig), normaliser mot 100% vol = 1.0
  const annualizedVol = stdDev * Math.sqrt(252);
  return Math.min(1.0, annualizedVol);
}

/**
 * Beregn EMA-slope som trendindikator
 * Returnerer 0.0-1.0 (0.5 = nøytrål, >0.5 = opptrender, <0.5 = nedtrender)
 */
function calculateTrendStrength(prices: number[], period = 9): number {
  if (prices.length < period + 1) return 0.5;
  const k = 2 / (period + 1);
  let ema = prices[0];
  for (let i = 1; i < prices.length; i++) {
    ema = prices[i] * k + ema * (1 - k);
  }
  // Sammenlign EMA med prisen fra 'period' perioder tilbake
  const oldPrice = prices[prices.length - period - 1];
  if (oldPrice === 0) return 0.5;
  const slopeRatio = (ema - oldPrice) / oldPrice;
  // Normaliser: +10% -> 1.0, -10% -> 0.0, 0% -> 0.5
  return Math.max(0, Math.min(1, 0.5 + slopeRatio * 5));
}

// ============================================================================
// Score Calculation
// ============================================================================

/**
 * Calculate technical score from base signal generator
 * Bruker confidence (0.0-1.0) for dynamisk score-beregning
 */
function calculateTechnicalScore(baseSignal: Signal): number {
  const confidence = baseSignal.confidence ?? 0.5;
  switch (baseSignal.action) {
    case 'BUY':
      // Sterk BUY = 65-80, svak BUY = 55-65 (ved confidence 0.5 = 65)
      return 50 + (confidence * 30);
    case 'SELL':
      // Sterk SELL = 20-35, svak SELL = 35-45 (ved confidence 0.5 = 35)
      return 50 - (confidence * 30);
    case 'HOLD':
    default:
      // Hold nær midten, men litt bias basert på confidence
      return 45 + (confidence * 10);
  }
}

/**
 * Calculate regime-adjusted score
 */
function calculateRegimeScore(
  technicalScore: number,
  regime: MarketRegime,
  regimeConfidence: number
): number {
  const regimeAdjustments: Record<MarketRegime, number> = {
    bull: 10,
    bear: -10,
    range: 0,
    unclear: -5,
  };

  const adjustment = regimeAdjustments[regime] * regimeConfidence;
  return Math.max(0, Math.min(100, technicalScore + adjustment));
}

/**
 * Calculate narrative-adjusted score
 */
function calculateNarrativeScore(
  currentScore: number,
  sentiment: number,
  eventRisk: number
): number {
  // Sentiment contribution: -10 to +10
  const sentimentAdjustment = sentiment * 10;

  // Event risk reduces score: -15 for high risk
  const riskAdjustment = -eventRisk * 15;

  return Math.max(0, Math.min(100, currentScore + sentimentAdjustment + riskAdjustment));
}

/**
 * Calculate final composite score
 */
function calculateCompositeScore(
  technicalScore: number,
  narrativeScore: number,
  regimeScore: number,
  hasNarrative: boolean,
  hasRegime: boolean,
  regime: MarketRegime | 'unclear' = 'unclear',
  narrativeSentiment: number = 0
): number {
  if (!hasNarrative && !hasRegime) {
    return technicalScore;
  }

  const weights = getWeightsByRegime(regime);

  let score: number;

  if (!hasNarrative) {
    // Technical + Regime only
    const totalW = weights.technical + weights.regime;
    const techWeight = weights.technical / totalW;
    const regimeWeight = weights.regime / totalW;
    score = technicalScore * techWeight + regimeScore * regimeWeight;
  } else if (!hasRegime) {
    // Technical + Narrative only
    const totalW = weights.technical + weights.narrative;
    const techWeight = weights.technical / totalW;
    const narrativeWeight = weights.narrative / totalW;
    score = technicalScore * techWeight + narrativeScore * narrativeWeight;
  } else {
    // All three factors
    score = (
      technicalScore * weights.technical +
      narrativeScore * weights.narrative +
      regimeScore * weights.regime
    );
  }

  // Confidence Boost: If Narrative Sentiment and Regime are perfectly aligned
  // Bullish Alignment: sentiment > 0.6 AND regime === 'bull'
  // Bearish Alignment: sentiment < -0.6 AND regime === 'bear'
  const isBullAligned = narrativeSentiment > 0.6 && regime === 'bull';
  const isBearAligned = narrativeSentiment < -0.6 && regime === 'bear';

  if (isBullAligned || isBearAligned) {
    // Boost by 10% (max 100)
    score = Math.min(100, score * 1.1);
  }

  return score;
}

/**
 * Determine risk level based on factors
 */
function calculateRiskLevel(
  eventRisk: number,
  regime: MarketRegime,
  volatility: number
): 1 | 2 | 3 | 4 | 5 {
  let riskScore = 0;

  // Event risk contribution (0-2)
  if (eventRisk > 0.7) riskScore += 2;
  else if (eventRisk > 0.4) riskScore += 1;

  // Regime contribution (0-2)
  if (regime === 'bear') riskScore += 2;
  else if (regime === 'unclear') riskScore += 1;

  // Volatility contribution (0-1)
  if (volatility > 0.8) riskScore += 1;

  return Math.min(5, Math.max(1, riskScore + 1)) as 1 | 2 | 3 | 4 | 5;
}

/**
 * Convert score to decision
 */
function scoreToDecision(score: number): 'STRONG_BUY' | 'BUY' | 'HOLD' | 'SELL' | 'STRONG_SELL' {
  if (score >= 80) return 'STRONG_BUY';
  if (score >= 60) return 'BUY';
  if (score >= 40) return 'HOLD';
  if (score >= 20) return 'SELL';
  return 'STRONG_SELL';
}

// ============================================================================
// Persistence
// ============================================================================

/**
 * Persister et ConfluentSignal til ai_decision_log
 * Feiler stille — signal-generering skal aldri blokkeres av DB-feil
 */
async function persistSignalToLog(
  signal: ConfluentSignal,
  symbol: string,
  userId?: string
): Promise<void> {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY
      || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    if (!supabaseUrl || !supabaseKey) return;

    const supabase = createClient<Database>(supabaseUrl, supabaseKey);

    // Mapping til faktiske kolonner i ai_decision_log:
    // decision_type, symbol, sentiment_score (0-100), analysis_data (jsonb), decision_reason, user_id, executed_at
    await supabase.from('ai_decision_log').insert({
      symbol,
      decision_type: signal.action,           // BUY/SELL/HOLD
      sentiment_score: Math.round(signal.score), // 0-100 (integer)
      analysis_data: {
        factors: signal.factors as unknown as import('@/types/database.types').Json,
        risk_level: signal.riskLevel,
        used_fallback: signal.metadata.usedFallback,
      } as unknown as import('@/types/database.types').Json,
      decision_reason: signal.reason,
      user_id: userId || '00000000-0000-0000-0000-000000000000',
      executed_at: new Date().toISOString(),
    } as any);
  } catch (err) {
    // Logg men kast ikke videre — signal-generering skal ikke feile pga. DB
    logger.warn('[ConfluentSignalEngine] Failed to persist signal to DB:', err);
  }
}

// ============================================================================
// Main Engine
// ============================================================================

/**
 * Generate a confluent signal combining technical, narrative, and regime analysis
 *
 * @param options - Signal generation options
 * @returns ConfluentSignal with comprehensive analysis
 */
export async function generateConfluentSignal(
  options: ConfluentSignalOptions
): Promise<ConfluentSignal> {
  const {
    symbol,
    strategyType,
    prices,
    includeNarrative = true,
    includeRegime = true,
    userId,
  } = options;

  // Check if Sonar integration is enabled
  const sonarEnabled = isSonarIntegrationEnabled();
  
  logger.info(`[ConfluentSignalEngine] Generating signal for ${symbol} (Sonar: ${sonarEnabled ? 'enabled' : 'disabled'})`);
  const startTime = Date.now();

  // 1. Generate base technical signal
  const baseSignal = generateSignal(strategyType, prices);

  // 2. Fetch narrative data (with fallback) - only if Sonar is enabled
  let narrativeResult: NarrativeScanResult | null = null;
  let usedFallback = false;

  if (includeNarrative && sonarEnabled) {
    try {
      narrativeResult = await narrativeScanWithFallback(symbol, {
        tier: 'sonar',
        mode: 'medium',
      });
      usedFallback =
        narrativeResult.sentiment === FALLBACK_VALUES.narrative_sentiment &&
        narrativeResult.event_risk === FALLBACK_VALUES.event_risk;
    } catch (error) {
      logger.error(`[ConfluentSignalEngine] Narrative scan failed for ${symbol}:`, error);
      usedFallback = true;
    }
  } else if (includeNarrative && !sonarEnabled) {
    logger.debug(`[ConfluentSignalEngine] Skipping narrative scan - Sonar disabled`);
    usedFallback = true;
  }

  // 3. Fetch regime data (with fallback) - only if Sonar is enabled
  let regimeResult: RegimeScanResult | null = null;

  if (includeRegime && sonarEnabled) {
    try {
      regimeResult = await regimeScanWithFallback({
        tier: 'sonar-pro',
        mode: 'high',
      });
      usedFallback =
        usedFallback || regimeResult.regime === FALLBACK_VALUES.market_regime;
    } catch (error) {
      logger.error('[ConfluentSignalEngine] Regime scan failed:', error);
      usedFallback = true;
    }
  } else if (includeRegime && !sonarEnabled) {
    logger.debug(`[ConfluentSignalEngine] Skipping regime scan - Sonar disabled`);
    usedFallback = true;
  }

  // 3.5 Beregn volatilitet og trend fra prisdata
  const volatility = calculateVolatility(prices);
  const trendStrength = calculateTrendStrength(prices);

  // 4. Calculate scores
  const technicalScore = calculateTechnicalScore(baseSignal);
  const narrativeScore = narrativeResult
    ? calculateNarrativeScore(
        technicalScore,
        narrativeResult.sentiment,
        narrativeResult.event_risk
      )
    : technicalScore;
  const regimeScore = regimeResult
    ? calculateRegimeScore(technicalScore, regimeResult.regime, regimeResult.confidence)
    : technicalScore;

  // 5. Calculate composite score
  const compositeScore = calculateCompositeScore(
    technicalScore,
    narrativeScore,
    regimeScore,
    narrativeResult !== null,
    regimeResult !== null,
    regimeResult?.regime ?? 'unclear',
    narrativeResult?.sentiment ?? 0
  );

  // 6. Calculate risk level
  const riskLevel = calculateRiskLevel(
    narrativeResult?.event_risk ?? 0,
    regimeResult?.regime ?? 'unclear',
    volatility
  );

  // 7. Determine final action
  const finalDecision = scoreToDecision(compositeScore);
  const action =
    finalDecision === 'STRONG_BUY' || finalDecision === 'BUY'
      ? 'BUY'
      : finalDecision === 'STRONG_SELL' || finalDecision === 'SELL'
        ? 'SELL'
        : 'HOLD';

  // 8. Build enhanced reason
  let enhancedReason = baseSignal.reason;
  if (narrativeResult && narrativeResult.key_events.length > 0) {
    const topEvent = narrativeResult.key_events[0];
    enhancedReason += ` | Nyheter: ${topEvent.title} (${topEvent.impact})`;
  }
  if (regimeResult && regimeResult.regime !== 'unclear') {
    enhancedReason += ` | Regime: ${regimeResult.regime}`;
  }

  const duration = Date.now() - startTime;
  
  const result: ConfluentSignal = {
    action,
    reason: enhancedReason,
    score: Math.round(compositeScore),
    riskLevel,
    factors: {
      trend: trendStrength,
      volatility,
      ai_signal: compositeScore / 100,
      narrative_sentiment: narrativeResult?.sentiment,
      event_risk: narrativeResult?.event_risk,
      market_regime: regimeResult?.regime,
    },
    metadata: {
      narrativeData: narrativeResult ?? undefined,
      regimeData: regimeResult ?? undefined,
      usedFallback,
    },
  };

  // Lagre til DB (feiler stille)
  persistSignalToLog(result, symbol, userId).catch(() => {});

  logger.info(
    `[ConfluentSignalEngine] Generated signal for ${symbol} in ${duration}ms. ` +
      `Score: ${compositeScore.toFixed(1)}, Action: ${action}, Risk: ${riskLevel}`
  );

  return result;
}

// ============================================================================
// Explanation
// ============================================================================

/**
 * Generate explanation for a confluent signal
 *
 * @param signal - The signal to explain
 * @param symbol - Trading symbol
 * @param timeframe - Analysis timeframe
 * @param userRiskProfile - User's risk tolerance
 * @returns ExplainSignalResult with human-readable explanation
 */
export async function explainConfluentSignal(
  signal: ConfluentSignal,
  symbol: string,
  timeframe: 'short' | 'medium' | 'long',
  userRiskProfile: 'conservative' | 'balanced' | 'aggressive' = 'balanced'
): Promise<ExplainSignalResult> {
  const input: ExplainSignalInput = {
    symbol,
    timeframe,
    decision: scoreToDecision(signal.score),
    score: signal.score,
    risk_level: signal.riskLevel,
    factors: {
      trend: signal.factors.trend,
      volatility: signal.factors.volatility,
      ai_signal: signal.factors.ai_signal,
      ...(signal.factors.narrative_sentiment !== undefined && {
        narrative_sentiment: signal.factors.narrative_sentiment,
      }),
      ...(signal.factors.event_risk !== undefined && {
        event_risk: signal.factors.event_risk,
      }),
    },
    userRiskProfile,
    locale: 'nb-NO',
  };

  return explainSignalWithFallback(input, {
    tier: 'sonar',
    mode: 'medium',
  });
}

// ============================================================================
// Batch Processing
// ============================================================================

/**
 * Generate signals for multiple symbols
 *
 * @param symbols - Array of symbols to analyze
 * @param strategyType - Trading strategy type
 * @param priceFetcher - Function to fetch prices for a symbol
 * @returns Array of confluent signals
 */
export async function generateBatchSignals(
  symbols: string[],
  strategyType: string,
  priceFetcher: (symbol: string) => Promise<number[]> | number[]
): Promise<ConfluentSignal[]> {
  logger.info(`[ConfluentSignalEngine] Generating batch signals for ${symbols.length} symbols`);

  const results = await Promise.all(
    symbols.map(async (symbol) => {
      try {
        const prices = await priceFetcher(symbol);
        return await generateConfluentSignal({
          symbol,
          strategyType,
          prices,
        });
      } catch (error) {
        logger.error(`[ConfluentSignalEngine] Failed to generate signal for ${symbol}:`, error);
        // Return a neutral signal on error
        return {
          action: 'HOLD' as const,
          reason: 'Kunne ikke generere signal',
          score: 50,
          riskLevel: 3 as const,
          factors: {
            trend: 0.5,
            volatility: 0.5,
            ai_signal: 0.5,
          },
          metadata: {
            usedFallback: true,
          },
        };
      }
    })
  );

  return results;
}

// ============================================================================
// Health Check
// ============================================================================

/**
 * Check if confluent signal engine is healthy
 */
export async function checkConfluentEngineHealth(): Promise<{
  healthy: boolean;
  factors: {
    technical: boolean;
    narrative: boolean;
    regime: boolean;
  };
  sonarEnabled: boolean;
}> {
  const sonarEnabled = isSonarIntegrationEnabled();
  
  // Technical is always available (local calculation)
  const technical = true;

  // Check narrative by attempting a lightweight call - only if Sonar enabled
  let narrative = false;
  if (sonarEnabled) {
    try {
      const result = await narrativeScanWithFallback('BTC', {
        tier: 'sonar',
        mode: 'low',
      });
      narrative = result.symbol === 'BTC';
    } catch {
      narrative = false;
    }
  }

  // Check regime - only if Sonar enabled
  let regime = false;
  if (sonarEnabled) {
    try {
      const result = await regimeScanWithFallback({
        tier: 'sonar-pro',
        mode: 'low',
      });
      regime = result.regime !== 'unclear' || result.confidence > 0;
    } catch {
      regime = false;
    }
  }

  return {
    healthy: technical && (!sonarEnabled || narrative || regime),
    factors: {
      technical,
      narrative,
      regime,
    },
    sonarEnabled,
  };
}
