/**
 * Balanced Strategy
 * Mean Reversion + Breakout - Moderate risk, top 10 coins
 *
 * Strategy:
 * - Trades top 10 cryptocurrencies
 * - Combines mean reversion (buy dips) with breakout trading
 * - Uses RSI for oversold/overbought conditions
 * - Moderate leverage (1.5x)
 * - Standard stop-loss (8%)
 * - Expected annual return: 30%
 */

import { BaseStrategy, MarketData, TechnicalIndicators } from './base-strategy'
import type { TradingSignal } from '../types'

export class BalancedStrategy extends BaseStrategy {
  private readonly TOP_10_COINS = [
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
  ]

  async analyze(
    marketData: MarketData,
    indicators: TechnicalIndicators
  ): Promise<TradingSignal | null> {
    // Only trade top 10 coins
    if (!this.TOP_10_COINS.includes(marketData.symbol)) {
      return null
    }

    // Require RSI
    if (!indicators.rsi) {
      return null
    }

    const rsi = indicators.rsi
    const priceChange24h = marketData.price_change_24h
    const volatility = this.calculateVolatility(marketData)

    // Strategy 1: Mean Reversion (buy oversold)
    const meanReversionSignal = this.analyzeMeanReversion(
      marketData,
      indicators,
      rsi,
      priceChange24h,
      volatility
    )

    if (meanReversionSignal) {
      return meanReversionSignal
    }

    // Strategy 2: Breakout (buy momentum)
    const breakoutSignal = this.analyzeBreakout(
      marketData,
      indicators,
      rsi,
      priceChange24h,
      volatility
    )

    return breakoutSignal
  }

  private analyzeMeanReversion(
    marketData: MarketData,
    indicators: TechnicalIndicators,
    rsi: number,
    priceChange24h: number,
    volatility: number
  ): TradingSignal | null {
    // Look for oversold conditions (RSI < 35)
    const isOversold = rsi < 35

    // Price has dropped significantly (> 5%)
    const hasDropped = priceChange24h < -5

    // Not in extreme volatility
    const isModerateVolatility = volatility < 15

    if (isOversold && hasDropped && isModerateVolatility) {
      const confidence = this.calculateMeanReversionConfidence(rsi, priceChange24h, volatility)

      return this.createSignal(
        marketData,
        indicators,
        'LONG',
        confidence,
        `Mean reversion: Oversold RSI ${rsi.toFixed(0)}, Price down ${priceChange24h.toFixed(1)}%`
      )
    }

    return null
  }

  private analyzeBreakout(
    marketData: MarketData,
    indicators: TechnicalIndicators,
    rsi: number,
    priceChange24h: number,
    volatility: number
  ): TradingSignal | null {
    // Look for breakout conditions
    const hasStrongMomentum = priceChange24h > 8 // Price up > 8%
    const rsiConfirms = rsi > 50 && rsi < 70 // RSI confirms strength but not overbought
    const hasVolume = marketData.volume_24h > 1000000 // Decent volume

    // Check if price is near 24h high (breakout confirmation)
    const priceNearHigh = marketData.price >= marketData.high_24h * 0.95

    if (hasStrongMomentum && rsiConfirms && hasVolume && priceNearHigh) {
      const confidence = this.calculateBreakoutConfidence(priceChange24h, rsi, volatility)

      return this.createSignal(
        marketData,
        indicators,
        'LONG',
        confidence,
        `Breakout: Strong momentum +${priceChange24h.toFixed(1)}%, RSI ${rsi.toFixed(0)}`
      )
    }

    // Check for short opportunities (if allowed)
    if (this.strategy.allow_short) {
      const hasStrongDownMomentum = priceChange24h < -8
      const rsiConfirmsSell = rsi < 50 && rsi > 30
      const priceNearLow = marketData.price <= marketData.low_24h * 1.05

      if (hasStrongDownMomentum && rsiConfirmsSell && hasVolume && priceNearLow) {
        const confidence = this.calculateBreakoutConfidence(Math.abs(priceChange24h), rsi, volatility)

        return this.createSignal(
          marketData,
          indicators,
          'SHORT',
          confidence,
          `Breakdown: Strong sell momentum ${priceChange24h.toFixed(1)}%, RSI ${rsi.toFixed(0)}`
        )
      }
    }

    return null
  }

  private calculateMeanReversionConfidence(
    rsi: number,
    priceChange24h: number,
    volatility: number
  ): number {
    let confidence = 60

    // More oversold = higher confidence (up to +20)
    if (rsi < 25) {
      confidence += 20
    } else if (rsi < 30) {
      confidence += 15
    } else if (rsi < 35) {
      confidence += 10
    }

    // Bigger drop = higher confidence (up to +15)
    const dropAmount = Math.abs(priceChange24h)
    confidence += Math.min(dropAmount, 15)

    // Lower volatility = higher confidence (up to +5)
    if (volatility < 10) {
      confidence += 5
    }

    return Math.min(confidence, 95)
  }

  private calculateBreakoutConfidence(
    momentumStrength: number,
    rsi: number,
    volatility: number
  ): number {
    let confidence = 65

    // Stronger momentum = higher confidence (up to +20)
    confidence += Math.min(momentumStrength, 20)

    // RSI in sweet spot = higher confidence (up to +10)
    if (rsi >= 55 && rsi <= 65) {
      confidence += 10
    } else if (rsi >= 50 && rsi <= 70) {
      confidence += 5
    }

    // Moderate volatility preferred (up to +5)
    if (volatility >= 8 && volatility <= 15) {
      confidence += 5
    }

    return Math.min(confidence, 95)
  }
}
