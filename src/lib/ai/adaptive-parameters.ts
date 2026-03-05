/**
 * Adaptive Parameters Service - AI MVP Seksjon 6
 * Justerer strategiparametere basert på markedsforhold og performance
 */

import { SentimentAnalysis, analyzeMarketSentiment } from "./sentiment-service";

export interface StrategyParameters {
  // DCA-parametere
  dcaInterval: number; // Timer mellom DCA-kjøp
  dcaAmount: number; // Beløp per DCA
  dcaMultiplier: number; // Multiplikator ved dipp (f.eks. 2x ved -10%)

  // Risiko-parametere
  maxPositionSize: number; // Maks posisjonsstørrelse %
  stopLossPercent: number; // Stop-loss prosent
  takeProfitPercent: number; // Take-profit prosent

  // Signalfilter
  minConfidence: number; // Minimum konfidens for signal
  volatilityThreshold: number; // Maks volatilitet før pause
}

export interface PerformanceMetrics {
  totalReturn: number; // Total avkastning %
  winRate: number; // Win rate %
  drawdown: number; // Max drawdown %
  sharpeRatio: number; // Sharpe ratio
  volatility: number; // Volatilitet
  last7Days: number; // Avkastning siste 7 dager
  last30Days: number; // Avkastning siste 30 dager
}

export interface AdaptiveAdjustment {
  parameter: keyof StrategyParameters;
  oldValue: number;
  newValue: number;
  reason: string;
  confidence: number;
}

export interface AIDecision {
  timestamp: string;
  strategyId: string;
  userId: string;
  sentiment: SentimentAnalysis;
  performance: PerformanceMetrics;
  adjustments: AdaptiveAdjustment[];
  explanation: string;
}

// Standard parametere for ulike strategier
const DEFAULT_PARAMETERS: Record<string, StrategyParameters> = {
  dca_trygg: {
    dcaInterval: 168, // 1 uke
    dcaAmount: 1000,
    dcaMultiplier: 2,
    maxPositionSize: 10,
    stopLossPercent: 15,
    takeProfitPercent: 25,
    minConfidence: 0.6,
    volatilityThreshold: 50,
  },
  trend_balansert: {
    dcaInterval: 24, // 1 dag
    dcaAmount: 500,
    dcaMultiplier: 1.5,
    maxPositionSize: 15,
    stopLossPercent: 10,
    takeProfitPercent: 20,
    minConfidence: 0.7,
    volatilityThreshold: 40,
  },
  multisignal_aktiv: {
    dcaInterval: 4, // 4 timer
    dcaAmount: 300,
    dcaMultiplier: 1.2,
    maxPositionSize: 20,
    stopLossPercent: 8,
    takeProfitPercent: 15,
    minConfidence: 0.75,
    volatilityThreshold: 35,
  },
  grid_bot: {
    dcaInterval: 1, // 1 time
    dcaAmount: 200,
    dcaMultiplier: 1,
    maxPositionSize: 25,
    stopLossPercent: 5,
    takeProfitPercent: 10,
    minConfidence: 0.5,
    volatilityThreshold: 60,
  },
  ai_copy: {
    dcaInterval: 12, // 12 timer
    dcaAmount: 400,
    dcaMultiplier: 1.3,
    maxPositionSize: 18,
    stopLossPercent: 12,
    takeProfitPercent: 22,
    minConfidence: 0.8,
    volatilityThreshold: 45,
  },
};

/**
 * Henter performance-metrikker fra trades
 * TODO: Implementere faktisk henting fra database
 */
export async function getPerformanceMetrics(userId: string, strategyId: string): Promise<PerformanceMetrics> {
  // Placeholder - skal hentes fra Supabase
  return {
    totalReturn: 12.5,
    winRate: 65,
    drawdown: -8.2,
    sharpeRatio: 1.4,
    volatility: 25,
    last7Days: -3.2,
    last30Days: 8.5,
  };
}

/**
 * Beregner adaptive justeringer basert på sentiment og performance
 */
export async function calculateAdaptiveAdjustments(
  userId: string,
  strategyId: string,
  currentParams: StrategyParameters
): Promise<{ adjustments: AdaptiveAdjustment[]; newParams: StrategyParameters; explanation: string }> {
  const sentiment = await analyzeMarketSentiment();
  const performance = await getPerformanceMetrics(userId, strategyId);

  const adjustments: AdaptiveAdjustment[] = [];
  const newParams = { ...currentParams };
  const reasons: string[] = [];

  // 1. Juster DCA-interval basert på sentiment
  if (sentiment.classification === "extreme_fear" && sentiment.currentValue < 20) {
    // Øk kjøpsfrekvens ved ekstrem frykt (kjøp dippen)
    const oldInterval = newParams.dcaInterval;
    newParams.dcaInterval = Math.max(1, Math.round(newParams.dcaInterval * 0.5));
    adjustments.push({
      parameter: "dcaInterval",
      oldValue: oldInterval,
      newValue: newParams.dcaInterval,
      reason: `Fear & Greed er ekstremt lav (${sentiment.currentValue}). Øker DCA-frekvens for å kjøpe dippen.`,
      confidence: sentiment.confidence,
    });
    reasons.push(`DCA-intervall redusert fra ${oldInterval}t til ${newParams.dcaInterval}t pga. ekstrem frykt`);
  } else if (sentiment.classification === "extreme_greed" && sentiment.currentValue > 80) {
    // Reduser kjøpsfrekvens ved ekstrem grådighet
    const oldInterval = newParams.dcaInterval;
    newParams.dcaInterval = Math.round(newParams.dcaInterval * 1.5);
    adjustments.push({
      parameter: "dcaInterval",
      oldValue: oldInterval,
      newValue: newParams.dcaInterval,
      reason: `Fear & Greed er ekstremt høy (${sentiment.currentValue}). Reduserer DCA-frekvens.`,
      confidence: sentiment.confidence,
    });
    reasons.push(`DCA-intervall økt fra ${oldInterval}t til ${newParams.dcaInterval}t pga. ekstrem grådighet`);
  }

  // 2. Juster posisjonsstørrelse basert på drawdown
  if (performance.drawdown < -10) {
    // Reduser risiko ved høy drawdown
    const oldSize = newParams.maxPositionSize;
    newParams.maxPositionSize = Math.max(5, newParams.maxPositionSize * 0.7);
    adjustments.push({
      parameter: "maxPositionSize",
      oldValue: oldSize,
      newValue: newParams.maxPositionSize,
      reason: `Drawdown er ${performance.drawdown.toFixed(1)}%. Reduserer posisjonsstørrelse for å beskytte kapital.`,
      confidence: 0.8,
    });
    reasons.push(`Maks posisjonsstørrelse redusert fra ${oldSize}% til ${newParams.maxPositionSize.toFixed(1)}% pga. høy drawdown`);
  } else if (performance.drawdown > -5 && performance.winRate > 60) {
    // Øk posisjonsstørrelse ved god performance
    const oldSize = newParams.maxPositionSize;
    newParams.maxPositionSize = Math.min(30, newParams.maxPositionSize * 1.2);
    adjustments.push({
      parameter: "maxPositionSize",
      oldValue: oldSize,
      newValue: newParams.maxPositionSize,
      reason: `God performance (${performance.winRate}% win rate, ${performance.drawdown.toFixed(1)}% drawdown). Øker posisjonsstørrelse.`,
      confidence: 0.7,
    });
    reasons.push(`Maks posisjonsstørrelse økt fra ${oldSize}% til ${newParams.maxPositionSize.toFixed(1)}% pga. god performance`);
  }

  // 3. Juster stop-loss basert på volatilitet
  if (performance.volatility > 40) {
    // Øk stop-loss ved høy volatilitet for å unngå å bli stoppet ut for tidlig
    const oldStopLoss = newParams.stopLossPercent;
    newParams.stopLossPercent = Math.min(20, newParams.stopLossPercent * 1.3);
    adjustments.push({
      parameter: "stopLossPercent",
      oldValue: oldStopLoss,
      newValue: newParams.stopLossPercent,
      reason: `Høy volatilitet (${performance.volatility.toFixed(1)}%). Øker stop-loss for å unngå stopp.`,
      confidence: 0.75,
    });
    reasons.push(`Stop-loss økt fra ${oldStopLoss}% til ${newParams.stopLossPercent.toFixed(1)}% pga. høy volatilitet`);
  }

  // 4. Juster DCA-multiplikator basert på trend
  if (performance.last7Days < -5) {
    // Øk DCA-multiplikator ved nedtrend
    const oldMultiplier = newParams.dcaMultiplier;
    newParams.dcaMultiplier = Math.min(3, newParams.dcaMultiplier * 1.5);
    adjustments.push({
      parameter: "dcaMultiplier",
      oldValue: oldMultiplier,
      newValue: newParams.dcaMultiplier,
      reason: `Nedtrend sist 7 dager (${performance.last7Days.toFixed(1)}%). Øker DCA-multiplikator.`,
      confidence: 0.7,
    });
    reasons.push(`DCA-multiplikator økt fra ${oldMultiplier}x til ${newParams.dcaMultiplier.toFixed(1)}x pga. nedtrend`);
  }

  // Bygg forklaring
  const explanation = reasons.length > 0
    ? `AI justerte strategien basert på: ${reasons.join(". ")}.`
    : "Ingen justeringer nødvendig - strategien fungerer godt i nåværende marked.";

  return {
    adjustments,
    newParams,
    explanation,
  };
}

/**
 * Henter initiale parametere for en strategi
 */
export function getInitialParameters(strategyId: string): StrategyParameters {
  return DEFAULT_PARAMETERS[strategyId] || DEFAULT_PARAMETERS.dca_trygg;
}

/**
 * Logger AI-beslutning til database
 * TODO: Implementere faktisk logging til Supabase
 */
export async function logAIDecision(decision: AIDecision): Promise<void> {
  console.info("[AI Decision]", decision);
  // TODO: Insert into ai_decision_log table
}

/**
 * Henter siste AI-beslutning for en bruker/strategi
 * TODO: Implementere faktisk henting fra database
 */
export async function getLastAIDecision(userId: string, strategyId: string): Promise<AIDecision | null> {
  // Placeholder
  return null;
}
