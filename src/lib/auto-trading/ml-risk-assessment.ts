/**
 * Machine Learning Risk Assessment
 * Predicts trade success probability and adjusts sizing accordingly
 */

import type { AutoTradingTrade, TradingSignal } from './types'

export interface TradeFeatures {
  // Market conditions
  trendStrength: number       // ADX or similar
  volatilityRegime: 'low' | 'normal' | 'high' | 'extreme'
  volumeProfile: 'low' | 'normal' | 'high'
  marketRegime: 'bull' | 'bear' | 'sideways' | 'volatile'
  
  // Technical indicators
  rsi: number
  macdSignal: 'bullish' | 'bearish' | 'neutral'
  bollingerPosition: 'lower' | 'middle' | 'upper' | 'outside'
  supportDistance: number     // % from support
  resistanceDistance: number  // % from resistance
  
  // Price action
  recentCandles: number       // Number of recent candles in signal direction
  breakoutStrength: number    // How strong the breakout is
  
  // Time factors
  timeOfDay: number           // Hour (0-23)
  dayOfWeek: number           // 0-6
  
  // Historical context
  symbolWinRate: number       // Historical win rate for this symbol
  recentPerformance: number   // Last 10 trades performance
  consecutiveLosses: number
}

export interface RiskAssessment {
  successProbability: number  // 0-1
  riskScore: number           // 0-100 (higher = riskier)
  expectedReturn: number      // Predicted return %
  confidence: number          // Model confidence 0-1
  
  // Risk breakdown
  marketRisk: number
  technicalRisk: number
  timingRisk: number
  symbolRisk: number
  
  // Recommendations
  recommendedPositionSize: number // % of normal size
  recommendedLeverage: number
  shouldTrade: boolean
  reason: string
}

// ML model simulation (would be replaced with actual model)
class TradeRiskModel {
  /**
   * Predict trade success probability
   */
  predict(features: TradeFeatures): RiskAssessment {
    // Feature weights (simplified model)
    const weights = {
      trendAlignment: 0.20,
      volatility: 0.15,
      rsiQuality: 0.15,
      volume: 0.10,
      supportResistance: 0.15,
      breakoutStrength: 0.10,
      symbolHistory: 0.10,
      timing: 0.05
    }
    
    // Calculate individual scores
    const scores = {
      trendAlignment: this.scoreTrendAlignment(features),
      volatility: this.scoreVolatility(features),
      rsiQuality: this.scoreRSI(features),
      volume: this.scoreVolume(features),
      supportResistance: this.scoreSupportResistance(features),
      breakoutStrength: Math.min(features.breakoutStrength, 1),
      symbolHistory: features.symbolWinRate,
      timing: this.scoreTiming(features)
    }
    
    // Weighted average success probability
    let successProbability = 0
    for (const [key, weight] of Object.entries(weights)) {
      successProbability += scores[key as keyof typeof scores] * weight
    }
    
    // Risk components
    const marketRisk = this.calculateMarketRisk(features)
    const technicalRisk = 1 - scores.rsiQuality
    const timingRisk = 1 - scores.timing
    const symbolRisk = 1 - features.symbolWinRate
    
    const riskScore = (marketRisk + technicalRisk + timingRisk + symbolRisk) / 4 * 100
    
    // Expected return estimate
    const expectedReturn = this.estimateReturn(successProbability, features)
    
    // Position size recommendation
    const { positionSize, leverage, shouldTrade, reason } = this.getPositionRecommendation(
      successProbability,
      riskScore,
      features
    )
    
    return {
      successProbability,
      riskScore,
      expectedReturn,
      confidence: this.calculateConfidence(features),
      marketRisk: marketRisk * 100,
      technicalRisk: technicalRisk * 100,
      timingRisk: timingRisk * 100,
      symbolRisk: symbolRisk * 100,
      recommendedPositionSize: positionSize,
      recommendedLeverage: leverage,
      shouldTrade,
      reason
    }
  }
  
  private scoreTrendAlignment(features: TradeFeatures): number {
    // Score based on how well signal aligns with market regime
    const regimeScores: Record<string, number> = {
      bull: features.recentCandles > 0 ? 0.9 : 0.4,
      bear: features.recentCandles < 0 ? 0.9 : 0.4,
      sideways: 0.6,
      volatile: 0.3
    }
    return regimeScores[features.marketRegime] || 0.5
  }
  
  private scoreVolatility(features: TradeFeatures): number {
    // Prefer normal volatility, penalize extremes
    const scores: Record<string, number> = {
      low: 0.7,
      normal: 1.0,
      high: 0.6,
      extreme: 0.2
    }
    return scores[features.volatilityRegime] || 0.5
  }
  
  private scoreRSI(features: TradeFeatures): number {
    // RSI is good when not extreme
    if (features.rsi > 70 || features.rsi < 30) return 0.4
    if (features.rsi > 60 || features.rsi < 40) return 0.7
    return 0.85
  }
  
  private scoreVolume(features: TradeFeatures): number {
    const scores: Record<string, number> = {
      low: 0.5,
      normal: 0.8,
      high: 1.0
    }
    return scores[features.volumeProfile] || 0.6
  }
  
  private scoreSupportResistance(features: TradeFeatures): number {
    // Higher score when price is at good entry zone
    const totalDistance = features.supportDistance + features.resistanceDistance
    if (totalDistance === 0) return 0.5
    
    // Good if closer to support (for longs) or resistance (for shorts)
    const ratio = features.supportDistance / totalDistance
    return 0.5 + (0.5 - ratio) // Closer to support = higher score
  }
  
  private scoreTiming(features: TradeFeatures): number {
    // Avoid trading at certain times
    const hour = features.timeOfDay
    
    // Best: 9-11 AM, 2-4 PM (market open/close)
    // Worst: 12-1 PM (lunch), overnight
    if (hour >= 9 && hour <= 11) return 0.9
    if (hour >= 14 && hour <= 16) return 0.9
    if (hour >= 12 && hour <= 13) return 0.5
    if (hour < 6 || hour > 22) return 0.4
    
    return 0.7
  }
  
  private calculateMarketRisk(features: TradeFeatures): number {
    let risk = 0.5
    
    // Higher risk in bear/volatile markets
    if (features.marketRegime === 'bear') risk += 0.2
    if (features.marketRegime === 'volatile') risk += 0.3
    if (features.volatilityRegime === 'extreme') risk += 0.2
    
    // Trend strength
    if (features.trendStrength < 20) risk += 0.1 // Weak trend
    
    return Math.min(1, risk)
  }
  
  private estimateReturn(successProbability: number, features: TradeFeatures): number {
    // Conservative estimate based on win probability and market conditions
    const baseReturn = 0.05 // 5% base
    const winBonus = successProbability * 0.10 // Up to 10% bonus
    const volatilityAdjustment = features.volatilityRegime === 'high' ? 0.02 : 0
    
    return baseReturn + winBonus + volatilityAdjustment
  }
  
  private calculateConfidence(features: TradeFeatures): number {
    // How confident is the model in this prediction
    let confidence = 0.7
    
    // More confident with more data
    if (features.symbolWinRate > 0) confidence += 0.1
    
    // Less confident in volatile markets
    if (features.marketRegime === 'volatile') confidence -= 0.15
    if (features.volatilityRegime === 'extreme') confidence -= 0.1
    
    return Math.max(0.5, Math.min(0.95, confidence))
  }
  
  private getPositionRecommendation(
    successProbability: number,
    riskScore: number,
    features: TradeFeatures
  ): { positionSize: number; leverage: number; shouldTrade: boolean; reason: string } {
    // Don't trade if probability too low
    if (successProbability < 0.45) {
      return {
        positionSize: 0,
        leverage: 1,
        shouldTrade: false,
        reason: `Lav suksess-sannsynlighet (${(successProbability * 100).toFixed(0)}%). Vent på bedre setup.`
      }
    }
    
    // Don't trade if risk too high
    if (riskScore > 80) {
      return {
        positionSize: 0,
        leverage: 1,
        shouldTrade: false,
        reason: `For høy risiko (${riskScore.toFixed(0)}/100). Beskyttelse aktivert.`
      }
    }
    
    // Calculate position size based on probability and risk
    let positionSize = successProbability * 0.5 // 0-50% of normal size
    
    // Adjust for risk
    positionSize *= (1 - riskScore / 100)
    
    // Ensure minimum if trade approved
    positionSize = Math.max(0.1, positionSize)
    
    // Leverage recommendation
    let leverage = 1
    if (successProbability > 0.7 && riskScore < 40) {
      leverage = 1.5
    }
    if (successProbability > 0.8 && riskScore < 30 && features.marketRegime === 'bull') {
      leverage = 2
    }
    
    return {
      positionSize,
      leverage,
      shouldTrade: true,
      reason: `Suksess-sannsynlighet: ${(successProbability * 100).toFixed(0)}%. Posisjon: ${(positionSize * 100).toFixed(0)}% av normal.`
    }
  }
}

// Singleton instance
const riskModel = new TradeRiskModel()

/**
 * Assess risk for a potential trade
 */
export function assessTradeRisk(
  signal: TradingSignal,
  features: TradeFeatures
): RiskAssessment {
  return riskModel.predict(features)
}

/**
 * Calculate features from historical data
 */
export function calculateTradeFeatures(
  symbol: string,
  signal: TradingSignal,
  historicalTrades: AutoTradingTrade[]
): TradeFeatures {
  // Calculate symbol-specific win rate
  const symbolTrades = historicalTrades.filter(t => t.symbol === symbol && t.status === 'CLOSED')
  const symbolWinRate = symbolTrades.length > 0
    ? symbolTrades.filter(t => (t.realized_pnl || 0) > 0).length / symbolTrades.length
    : 0.5
  
  // Recent performance (last 10 trades)
  const recentTrades = historicalTrades
    .filter(t => t.status === 'CLOSED')
    .slice(-10)
  const recentPerformance = recentTrades.length > 0
    ? recentTrades.filter(t => (t.realized_pnl || 0) > 0).length / recentTrades.length
    : 0.5
  
  // Count consecutive losses
  let consecutiveLosses = 0
  for (let i = historicalTrades.length - 1; i >= 0; i--) {
    const trade = historicalTrades[i]
    if (trade.status === 'CLOSED') {
      if ((trade.realized_pnl || 0) < 0) consecutiveLosses++
      else break
    }
  }
  
  // Default features (would be calculated from actual market data)
  return {
    trendStrength: 25,
    volatilityRegime: 'normal',
    volumeProfile: 'normal',
    marketRegime: 'bull',
    rsi: 55,
    macdSignal: 'bullish',
    bollingerPosition: 'middle',
    supportDistance: 0.05,
    resistanceDistance: 0.08,
    recentCandles: 3,
    breakoutStrength: 0.6,
    timeOfDay: new Date().getHours(),
    dayOfWeek: new Date().getDay(),
    symbolWinRate,
    recentPerformance,
    consecutiveLosses
  }
}

/**
 * Dynamic position sizing based on ML assessment
 */
export function calculateMLAdjustedPositionSize(
  baseSize: number,
  assessment: RiskAssessment
): {
  finalSize: number
  leverage: number
  shouldProceed: boolean
  reasoning: string
} {
  if (!assessment.shouldTrade) {
    return {
      finalSize: 0,
      leverage: 1,
      shouldProceed: false,
      reasoning: assessment.reason
    }
  }
  
  const finalSize = baseSize * assessment.recommendedPositionSize
  
  return {
    finalSize,
    leverage: assessment.recommendedLeverage,
    shouldProceed: true,
    reasoning: `${assessment.reason} Forventet avkastning: ${(assessment.expectedReturn * 100).toFixed(1)}%`
  }
}

/**
 * Batch risk assessment for multiple signals
 * Returns signals sorted by risk-adjusted expected return
 */
export function rankSignalsByRiskAdjustedReturn(
  signals: TradingSignal[],
  featuresMap: Map<string, TradeFeatures>
): Array<{ signal: TradingSignal; assessment: RiskAssessment; score: number }> {
  const results = signals.map(signal => {
    const features = featuresMap.get(signal.symbol) || calculateTradeFeatures(
      signal.symbol,
      signal,
      []
    )
    
    const assessment = assessTradeRisk(signal, features)
    
    // Risk-adjusted score: expected return / risk
    const score = assessment.successProbability * assessment.expectedReturn / 
                  (assessment.riskScore / 100 + 0.01)
    
    return { signal, assessment, score }
  })
  
  return results.sort((a, b) => b.score - a.score)
}

/**
 * Learning feedback loop - update model with trade outcomes
 */
export interface TradeOutcome {
  tradeId: string
  features: TradeFeatures
  predictedSuccess: number
  actualReturn: number
  wasProfitable: boolean
}

export function recordTradeOutcome(outcome: TradeOutcome): void {
  // In production, this would feed into model retraining
  // For now, just log for analysis
  console.info('Trade outcome recorded:', {
    prediction: outcome.predictedSuccess,
    actual: outcome.wasProfitable ? 'win' : 'loss',
    return: outcome.actualReturn
  })
}

/**
 * Get model performance metrics
 */
export function getModelPerformance(
  outcomes: TradeOutcome[]
): {
  accuracy: number
  precision: number
  recall: number
  calibration: number
} {
  if (outcomes.length === 0) {
    return { accuracy: 0, precision: 0, recall: 0, calibration: 0 }
  }
  
  // Accuracy: how often was prediction correct
  const correct = outcomes.filter(o => 
    (o.predictedSuccess > 0.5) === o.wasProfitable
  ).length
  const accuracy = correct / outcomes.length
  
  // Precision: of predicted wins, how many were actual wins
  const predictedWins = outcomes.filter(o => o.predictedSuccess > 0.5)
  const truePositives = predictedWins.filter(o => o.wasProfitable).length
  const precision = predictedWins.length > 0 ? truePositives / predictedWins.length : 0
  
  // Recall: of actual wins, how many were predicted
  const actualWins = outcomes.filter(o => o.wasProfitable)
  const recall = actualWins.length > 0 ? 
    actualWins.filter(o => o.predictedSuccess > 0.5).length / actualWins.length : 0
  
  // Calibration: how well do probabilities match actual frequencies
  const bins: { predicted: number[]; actual: boolean[] }[] = 
    Array(10).fill(null).map(() => ({ predicted: [], actual: [] }))
  
  for (const o of outcomes) {
    const bin = Math.min(9, Math.floor(o.predictedSuccess * 10))
    bins[bin].predicted.push(o.predictedSuccess)
    bins[bin].actual.push(o.wasProfitable)
  }
  
  let calibrationError = 0
  let validBins = 0
  
  for (const bin of bins) {
    if (bin.predicted.length > 5) {
      const avgPredicted = bin.predicted.reduce((a, b) => a + b, 0) / bin.predicted.length
      const actualRate = bin.actual.filter(a => a).length / bin.actual.length
      calibrationError += Math.abs(avgPredicted - actualRate)
      validBins++
    }
  }
  
  const calibration = validBins > 0 ? 1 - (calibrationError / validBins) : 0
  
  return { accuracy, precision, recall, calibration }
}
