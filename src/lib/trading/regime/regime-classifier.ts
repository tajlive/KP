/**
 * Regime Classifier – Market State Detection
 * 
 * Detects market regimes for policy selection:
 * - bull: Uptrend, low volatility
 * - bear: Downtrend, low volatility  
 * - chop: Sideways, low volatility
 * - high-vol: Any trend, high volatility
 * 
 * @module trading/regime
 * @version 3.0.1
 */

export type MarketRegime = 'bull' | 'bear' | 'chop' | 'high-vol' | 'unknown';

export interface RegimeFeatures {
  adx: number;
  diPlus: number;
  diMinus: number;
  ema20Slope: number;
  ema50Slope: number;
  atr14: number;
  atrPercent: number;
  bbWidth: number;
  historicalVol: number;
  volumeTrend: number;
  rsi: number;
  momentum: number;
}

export interface RegimeClassification {
  regime: MarketRegime;
  confidence: number;
  features: RegimeFeatures;
  timestamp: Date;
  regimeDuration: number;
  transitionProbability: Record<MarketRegime, number>;
}

export interface RegimeConfig {
  adxThreshold: number;
  volatilityThreshold: number;
  chopAdxMax: number;
  minRegimeBars: number;
  smoothingFactor: number;
}

export const DEFAULT_REGIME_CONFIG: RegimeConfig = {
  adxThreshold: 25,
  volatilityThreshold: 0.05,
  chopAdxMax: 20,
  minRegimeBars: 5,
  smoothingFactor: 0.3
};

export class RegimeClassifier {
  private config: RegimeConfig;
  private currentRegime: MarketRegime = 'unknown';
  private regimeBars: number = 0;
  private regimeHistory: RegimeClassification[] = [];
  private readonly maxHistory = 100;
  
  constructor(config: Partial<RegimeConfig> = {}) {
    this.config = { ...DEFAULT_REGIME_CONFIG, ...config };
  }
  
  classify(features: RegimeFeatures): RegimeClassification {
    const isHighVol = features.atrPercent > this.config.volatilityThreshold ||
                      features.historicalVol > 0.5;
    
    const hasTrend = features.adx > this.config.adxThreshold;
    const isBullish = features.diPlus > features.diMinus && features.ema20Slope > 0;
    const isBearish = features.diMinus > features.diPlus && features.ema20Slope < 0;
    const isChop = features.adx < this.config.chopAdxMax;
    
    let rawRegime: MarketRegime;
    
    if (isHighVol) {
      rawRegime = 'high-vol';
    } else if (hasTrend && isBullish) {
      rawRegime = 'bull';
    } else if (hasTrend && isBearish) {
      rawRegime = 'bear';
    } else if (isChop) {
      rawRegime = 'chop';
    } else {
      rawRegime = 'chop';
    }
    
    const smoothedRegime = this.applyRegimePersistence(rawRegime);
    const confidence = this.calculateConfidence(features, smoothedRegime);
    const transitionProbability = this.calculateTransitionProbabilities(features);
    
    const classification: RegimeClassification = {
      regime: smoothedRegime,
      confidence,
      features,
      timestamp: new Date(),
      regimeDuration: this.regimeBars,
      transitionProbability
    };
    
    this.regimeHistory.push(classification);
    if (this.regimeHistory.length > this.maxHistory) {
      this.regimeHistory.shift();
    }
    
    return classification;
  }
  
  private applyRegimePersistence(rawRegime: MarketRegime): MarketRegime {
    if (rawRegime === this.currentRegime) {
      this.regimeBars++;
      return rawRegime;
    }
    
    if (this.regimeBars < this.config.minRegimeBars) {
      return this.currentRegime;
    }
    
    if (Math.random() > this.config.smoothingFactor) {
      return this.currentRegime;
    }
    
    this.currentRegime = rawRegime;
    this.regimeBars = 1;
    return rawRegime;
  }
  
  private calculateConfidence(features: RegimeFeatures, regime: MarketRegime): number {
    let confidence = 0.5;
    
    switch (regime) {
      case 'bull':
        confidence += (features.adx / 100) * 0.3;
        confidence += (features.diPlus - features.diMinus) / 100 * 0.2;
        confidence += Math.min(features.ema20Slope * 10, 0.2);
        break;
      case 'bear':
        confidence += (features.adx / 100) * 0.3;
        confidence += (features.diMinus - features.diPlus) / 100 * 0.2;
        confidence += Math.min(Math.abs(features.ema20Slope) * 10, 0.2);
        break;
      case 'chop':
        confidence += (1 - features.adx / 50) * 0.3;
        confidence += (1 - Math.abs(features.ema20Slope) * 20) * 0.2;
        break;
      case 'high-vol':
        confidence += Math.min(features.atrPercent / this.config.volatilityThreshold, 1) * 0.4;
        confidence += Math.min(features.historicalVol, 1) * 0.3;
        break;
    }
    
    return Math.min(1, Math.max(0, confidence));
  }
  
  private calculateTransitionProbabilities(features: RegimeFeatures): Record<MarketRegime, number> {
    const probs: Record<MarketRegime, number> = {
      bull: 0.1, bear: 0.1, chop: 0.1, 'high-vol': 0.1, unknown: 0.1
    };
    
    if (features.adx > 30) {
      if (features.diPlus > features.diMinus) {
        probs.bull = 0.5;
        probs.bear = 0.05;
      } else {
        probs.bear = 0.5;
        probs.bull = 0.05;
      }
    } else if (features.adx < 20) {
      probs.chop = 0.5;
    }
    
    if (features.atrPercent > this.config.volatilityThreshold) {
      probs['high-vol'] = 0.4;
    }
    
    const sum = Object.values(probs).reduce((a, b) => a + b, 0);
    for (const key of Object.keys(probs)) {
      probs[key as MarketRegime] /= sum;
    }
    
    return probs;
  }
  
  getRecommendedPolicy(regime: MarketRegime): {
    primary: 'trend' | 'mean-reversion' | 'breakout' | 'no-trade';
    secondary?: 'trend' | 'mean-reversion' | 'breakout';
    confidence: number;
  } {
    switch (regime) {
      case 'bull':
        return { primary: 'trend', secondary: 'breakout', confidence: 0.8 };
      case 'bear':
        return { primary: 'trend', secondary: 'mean-reversion', confidence: 0.75 };
      case 'chop':
        return { primary: 'mean-reversion', secondary: undefined, confidence: 0.7 };
      case 'high-vol':
        return { primary: 'no-trade', secondary: 'breakout', confidence: 0.6 };
      default:
        return { primary: 'no-trade', confidence: 0.5 };
    }
  }
  
  getHistory(): RegimeClassification[] {
    return [...this.regimeHistory];
  }
  
  getStats() {
    const distribution: Record<MarketRegime, number> = {
      bull: 0, bear: 0, chop: 0, 'high-vol': 0, unknown: 0
    };
    
    for (const h of this.regimeHistory) {
      distribution[h.regime]++;
    }
    
    const total = this.regimeHistory.length || 1;
    for (const key of Object.keys(distribution)) {
      distribution[key as MarketRegime] /= total;
    }
    
    const avgConfidence = this.regimeHistory.length > 0
      ? this.regimeHistory.reduce((sum, h) => sum + h.confidence, 0) / this.regimeHistory.length
      : 0;
    
    return {
      currentRegime: this.currentRegime,
      regimeDuration: this.regimeBars,
      regimeDistribution: distribution,
      avgConfidence
    };
  }
  
  reset(): void {
    this.currentRegime = 'unknown';
    this.regimeBars = 0;
    this.regimeHistory = [];
  }
}

export function detectRegime(priceData: number[]): { regime: MarketRegime; confidence: number } {
  if (priceData.length < 20) {
    return { regime: 'unknown', confidence: 0 };
  }
  
  const returns = priceData.slice(1).map((p, i) => (p - priceData[i]) / priceData[i]);
  const mean = returns.reduce((a, b) => a + b, 0) / returns.length;
  const variance = returns.reduce((sum, r) => sum + Math.pow(r - mean, 2), 0) / returns.length;
  const vol = Math.sqrt(variance) * Math.sqrt(252);
  
  const ema20 = calculateEMA(priceData, 20);
  const slope = (ema20[ema20.length - 1] - ema20[0]) / ema20[0];
  
  if (vol > 0.5) {
    return { regime: 'high-vol', confidence: Math.min(vol, 1) };
  } else if (slope > 0.1) {
    return { regime: 'bull', confidence: Math.min(slope * 5, 1) };
  } else if (slope < -0.1) {
    return { regime: 'bear', confidence: Math.min(Math.abs(slope) * 5, 1) };
  } else {
    return { regime: 'chop', confidence: 0.7 };
  }
}

function calculateEMA(prices: number[], period: number): number[] {
  const multiplier = 2 / (period + 1);
  const ema: number[] = [prices[0]];
  
  for (let i = 1; i < prices.length; i++) {
    ema.push((prices[i] - ema[i - 1]) * multiplier + ema[i - 1]);
  }
  
  return ema;
}
