/**
 * Aggressive Strategy
 * Momentum + Volatility Breakout - High risk, leverage
 *
 * Strategy:
 * - Trades top 20 cryptocurrencies
 * - Focuses on high-momentum moves and volatility breakouts
 * - Uses higher leverage (2x)
 * - Wider stop-loss (12%)
 * - Both long and short positions
 * - Expected annual return: 60%
 */

import { BaseStrategy, MarketData, TechnicalIndicators } from './base-strategy'
import type { TradingSignal } from '../types'

export class AggressiveStrategy extends BaseStrategy {
  private readonly TOP_20_COINS = [
    'BTCUSDT',
    'ETHUSDT',
    'BNBUSDT',
    'SOLUSDT',
    'XRPUSDT',
    'ADAUSDT',
    'DOGEUSDT',
    'AVAXUSDT',
    'DOTUSDT',
    'MATICUSDT',
    'LINKUSDT',
    'LTCUSDT',
    'UNIUSDT',
    'ATOMUSDT',
    'NEARUSDT',
    'APTUSDT',
    'ARBUSDT',
    'OPUSDT',
    'SUIUSDT',
    'INJUSDT',
  ]

  async analyze(
    marketData: MarketData,
    indicators: TechnicalIndicators
  ): Promise<TradingSignal | null> {
    // Only trade top 20 coins
    if (!this.TOP_20_COINS.includes(marketData.symbol)) {
      return null
    }

    const rsi = indicators.rsi || 50
    const priceChange24h = marketData.price_change_24h
    const volatility = this.calculateVolatility(marketData)

    // Strategy 1: Momentum trading (chase strong moves)
    const momentumSignal = this.analyzeMomentum(
      marketData,
      indicators,
      rsi,
      priceChange24h,
      volatility
    )

    if (momentumSignal) {
      return momentumSignal
    }

    // Strategy 2: Volatility breakout (trade high volatility)
    const volatilitySignal = this.analyzeVolatilityBreakout(
      marketData,
      indicators,
      rsi,
      priceChange24h,
      volatility
    )

    return volatilitySignal
  }

  private analyzeMomentum(
    marketData: MarketData,
    indicators: TechnicalIndicators,
    rsi: number,
    priceChange24h: number,
    volatility: number
  ): TradingSignal | null {
    // LONG: Strong upward momentum
    const hasStrongUpMomentum = priceChange24h > 12 // Price up > 12%
    const rsiConfirmsUp = rsi > 60 && rsi < 80
    const hasHighVolume = marketData.volume_24h > 5000000

    if (hasStrongUpMomentum && rsiConfirmsUp && hasHighVolume) {
      const confidence = this.calculateMomentumConfidence(priceChange24h, rsi, marketData.volume_24h)

      return this.createSignal(
        marketData,
        indicators,
        'LONG',
        confidence,
        `Aggressive momentum: +${priceChange24h.toFixed(1)}%, RSI ${rsi.toFixed(0)}, High volume`
      )
    }

    // SHORT: Strong downward momentum (if allowed)
    if (this.strategy.allow_short) {
      const hasStrongDownMomentum = priceChange24h < -12
      const rsiConfirmsDown = rsi < 40 && rsi > 20

      if (hasStrongDownMomentum && rsiConfirmsDown && hasHighVolume) {
        const confidence = this.calculateMomentumConfidence(
          Math.abs(priceChange24h),
          100 - rsi,
          marketData.volume_24h
        )

        return this.createSignal(
          marketData,
          indicators,
          'SHORT',
          confidence,
          `Aggressive sell momentum: ${priceChange24h.toFixed(1)}%, RSI ${rsi.toFixed(0)}, High volume`
        )
      }
    }

    return null
  }

  private analyzeVolatilityBreakout(
    marketData: MarketData,
    indicators: TechnicalIndicators,
    rsi: number,
    priceChange24h: number,
    volatility: number
  ): TradingSignal | null {
    // Look for high volatility with directional bias
    const isHighVolatility = volatility > 15 // > 15% daily range
    const hasVolume = marketData.volume_24h > 2000000

    if (!isHighVolatility || !hasVolume) {
      return null
    }

    // Determine direction based on price position in range
    const rangePosition = (marketData.price - marketData.low_24h) / (marketData.high_24h - marketData.low_24h)

    // LONG: Price in upper 25% of range + positive change
    if (rangePosition > 0.75 && priceChange24h > 5) {
      const confidence = this.calculateVolatilityConfidence(volatility, rangePosition, priceChange24h)

      return this.createSignal(
        marketData,
        indicators,
        'LONG',
        confidence,
        `Volatility breakout UP: ${volatility.toFixed(1)}% range, price at ${(rangePosition * 100).toFixed(0)}% of range`
      )
    }

    // SHORT: Price in lower 25% of range + negative change (if allowed)
    if (this.strategy.allow_short && rangePosition < 0.25 && priceChange24h < -5) {
      const confidence = this.calculateVolatilityConfidence(volatility, 1 - rangePosition, Math.abs(priceChange24h))

      return this.createSignal(
        marketData,
        indicators,
        'SHORT',
        confidence,
        `Volatility breakout DOWN: ${volatility.toFixed(1)}% range, price at ${(rangePosition * 100).toFixed(0)}% of range`
      )
    }

    return null
  }

  private calculateMomentumConfidence(
    momentumStrength: number,
    rsi: number,
    volume: number
  ): number {
    let confidence = 65

    // Stronger momentum = higher confidence (up to +25)
    confidence += Math.min(momentumStrength * 1.5, 25)

    // RSI in momentum zone = higher confidence (up to +10)
    if (rsi >= 60 && rsi <= 75) {
      confidence += 10
    } else if (rsi >= 55 && rsi <= 80) {
      confidence += 5
    }

    // Higher volume = higher confidence (up to +5)
    if (volume > 10000000) {
      confidence += 5
    } else if (volume > 5000000) {
      confidence += 3
    }

    return Math.min(confidence, 90) // Cap at 90% for aggressive
  }

  private calculateVolatilityConfidence(
    volatility: number,
    rangePosition: number,
    priceChange: number
  ): number {
    let confidence = 60

    // Higher volatility = higher potential (up to +20)
    confidence += Math.min(volatility, 20)

    // Strong position in range = higher confidence (up to +10)
    if (rangePosition > 0.8) {
      confidence += 10
    } else if (rangePosition > 0.75) {
      confidence += 5
    }

    // Strong price change confirms direction (up to +10)
    confidence += Math.min(Math.abs(priceChange), 10)

    return Math.min(confidence, 85)
  }
}
