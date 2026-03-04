/**
 * Conservative Strategy
 * DCA + Trend Following - Low risk, stable coins
 *
 * Strategy:
 * - Only trades BTC and ETH
 * - Follows strong uptrends (SMA 20 > SMA 50)
 * - Uses Dollar Cost Averaging approach
 * - Low leverage (1x)
 * - Tight stop-loss (5%)
 * - Expected annual return: 15%
 */

import { BaseStrategy, MarketData, TechnicalIndicators } from './base-strategy'
import type { TradingSignal } from '../types'

export class ConservativeStrategy extends BaseStrategy {
  async analyze(
    marketData: MarketData,
    indicators: TechnicalIndicators
  ): Promise<TradingSignal | null> {
    // Conservative strategy only trades BTC and ETH
    if (!['BTCUSDT', 'ETHUSDT'].includes(marketData.symbol)) {
      return null
    }

    // Require both moving averages
    if (!indicators.sma_20 || !indicators.sma_50) {
      return null
    }

    // Check for strong uptrend: SMA 20 > SMA 50
    const isUptrend = indicators.sma_20 > indicators.sma_50
    const trendStrength = ((indicators.sma_20 - indicators.sma_50) / indicators.sma_50) * 100

    // Require RSI in neutral zone (not overbought)
    const rsi = indicators.rsi || 50
    const isNotOverbought = rsi < 70

    // Check volatility (conservative strategy prefers low volatility)
    const volatility = this.calculateVolatility(marketData)
    const isLowVolatility = volatility < 10 // Less than 10% daily range

    // Generate LONG signal if conditions met
    if (isUptrend && trendStrength > 2 && isNotOverbought && isLowVolatility) {
      const confidence = this.calculateConfidence(trendStrength, rsi, volatility)

      return this.createSignal(
        marketData,
        indicators,
        'LONG',
        confidence,
        `Conservative uptrend: SMA20 ${trendStrength.toFixed(2)}% above SMA50, RSI ${rsi.toFixed(0)}`
      )
    }

    return null
  }

  private calculateConfidence(
    trendStrength: number,
    rsi: number,
    volatility: number
  ): number {
    let confidence = 60 // Base confidence

    // Stronger trend = higher confidence (up to +20)
    confidence += Math.min(trendStrength * 2, 20)

    // RSI in sweet spot (40-60) = higher confidence (up to +10)
    if (rsi >= 40 && rsi <= 60) {
      confidence += 10
    }

    // Lower volatility = higher confidence (up to +10)
    if (volatility < 5) {
      confidence += 10
    } else if (volatility < 8) {
      confidence += 5
    }

    return Math.min(confidence, 95) // Cap at 95%
  }
}
