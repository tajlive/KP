/**
 * Custom Strategy
 * User-defined parameters - All parameters can be customized
 *
 * Strategy:
 * - Users can define their own trading rules
 * - Customizable indicators and thresholds
 * - Flexible symbol selection
 * - User-defined leverage and position sizing
 * - Expected return depends on user configuration
 */

import { BaseStrategy, MarketData, TechnicalIndicators } from './base-strategy'
import type { TradingSignal, UserAutoTradingConfig, AutoTradingStrategy } from '../types'

export interface CustomStrategyParams {
  // Trend following
  use_trend_following?: boolean
  trend_sma_short?: number // Default: 20
  trend_sma_long?: number // Default: 50
  trend_min_strength?: number // Default: 2%

  // RSI
  use_rsi?: boolean
  rsi_oversold?: number // Default: 30
  rsi_overbought?: number // Default: 70
  rsi_period?: number // Default: 14

  // Momentum
  use_momentum?: boolean
  momentum_threshold?: number // Default: 10%

  // Volatility
  max_volatility?: number // Default: 15%
  min_volatility?: number // Default: 0%

  // Volume
  min_volume?: number // Default: 1000000

  // Confidence
  min_confidence?: number // Default: 60%
}

export class CustomStrategy extends BaseStrategy {
  private config: UserAutoTradingConfig
  private params: CustomStrategyParams

  constructor(strategy: AutoTradingStrategy, config: UserAutoTradingConfig) {
    super(strategy)
    this.config = config
    this.params = this.loadParams(config.custom_params)
  }

  private loadParams(customParams: unknown): CustomStrategyParams {
    // Load custom params with defaults
    const params = customParams as Record<string, unknown> | undefined
    return {
      use_trend_following: Boolean(params?.use_trend_following ?? true),
      trend_sma_short: Number(params?.trend_sma_short ?? 20),
      trend_sma_long: Number(params?.trend_sma_long ?? 50),
      trend_min_strength: Number(params?.trend_min_strength ?? 2),

      use_rsi: Boolean(params?.use_rsi ?? true),
      rsi_oversold: Number(params?.rsi_oversold ?? 30),
      rsi_overbought: Number(params?.rsi_overbought ?? 70),
      rsi_period: Number(params?.rsi_period ?? 14),

      use_momentum: Boolean(params?.use_momentum ?? false),
      momentum_threshold: Number(params?.momentum_threshold ?? 10),

      max_volatility: Number(params?.max_volatility ?? 15),
      min_volatility: Number(params?.min_volatility ?? 0),

      min_volume: Number(params?.min_volume ?? 1000000),

      min_confidence: Number(params?.min_confidence ?? 60),
    }
  }

  async analyze(
    marketData: MarketData,
    indicators: TechnicalIndicators
  ): Promise<TradingSignal | null> {
    // Check if symbol is allowed
    if (!this.strategy.allowed_symbols.includes(marketData.symbol)) {
      return null
    }

    // Check volume requirement
    if (marketData.volume_24h < (this.params.min_volume ?? 1000000)) {
      return null
    }

    const volatility = this.calculateVolatility(marketData)

    // Check volatility constraints
    if (volatility > (this.params.max_volatility ?? 15) || volatility < (this.params.min_volatility ?? 0)) {
      return null
    }

    const rsi = indicators.rsi || 50
    const priceChange24h = marketData.price_change_24h

    const signals: Array<{ side: 'LONG' | 'SHORT'; confidence: number; reason: string }> = []

    // Strategy 1: Trend Following
    if (this.params.use_trend_following) {
      const trendSignal = this.analyzeTrendFollowing(marketData, indicators)
      if (trendSignal) signals.push(trendSignal)
    }

    // Strategy 2: RSI Mean Reversion
    if (this.params.use_rsi) {
      const rsiSignal = this.analyzeRSI(marketData, indicators, rsi)
      if (rsiSignal) signals.push(rsiSignal)
    }

    // Strategy 3: Momentum
    if (this.params.use_momentum) {
      const momentumSignal = this.analyzeMomentum(marketData, indicators, priceChange24h)
      if (momentumSignal) signals.push(momentumSignal)
    }

    // If no signals, return null
    if (signals.length === 0) {
      return null
    }

    // Combine signals (average confidence, use most confident side)
    const avgConfidence = signals.reduce((sum, s) => sum + s.confidence, 0) / signals.length

    // Check if confidence meets minimum
    if (avgConfidence < (this.params.min_confidence ?? 60)) {
      return null
    }

    // Determine side (majority vote or highest confidence)
    const longSignals = signals.filter(s => s.side === 'LONG')
    const shortSignals = signals.filter(s => s.side === 'SHORT')

    let finalSide: 'LONG' | 'SHORT'
    if (longSignals.length > shortSignals.length) {
      finalSide = 'LONG'
    } else if (shortSignals.length > longSignals.length) {
      finalSide = 'SHORT'
    } else {
      // Tie - use highest confidence
      const maxLong = Math.max(...longSignals.map(s => s.confidence), 0)
      const maxShort = Math.max(...shortSignals.map(s => s.confidence), 0)
      finalSide = maxLong > maxShort ? 'LONG' : 'SHORT'
    }

    const reasons = signals.map(s => s.reason).join('; ')

    return this.createSignal(marketData, indicators, finalSide, avgConfidence, `Custom: ${reasons}`)
  }

  private analyzeTrendFollowing(
    marketData: MarketData,
    indicators: TechnicalIndicators
  ): { side: 'LONG' | 'SHORT'; confidence: number; reason: string } | null {
    if (!indicators.sma_20 || !indicators.sma_50) {
      return null
    }

    const trendStrength = ((indicators.sma_20 - indicators.sma_50) / indicators.sma_50) * 100

    // Check for uptrend
    if (trendStrength > (this.params.trend_min_strength ?? 2)) {
      const confidence = 60 + Math.min(trendStrength * 2, 30)
      return {
        side: 'LONG',
        confidence,
        reason: `Uptrend ${trendStrength.toFixed(1)}%`,
      }
    }

    // Check for downtrend (if shorts allowed)
    if (this.strategy.allow_short && trendStrength < -(this.params.trend_min_strength ?? 2)) {
      const confidence = 60 + Math.min(Math.abs(trendStrength) * 2, 30)
      return {
        side: 'SHORT',
        confidence,
        reason: `Downtrend ${trendStrength.toFixed(1)}%`,
      }
    }

    return null
  }

  private analyzeRSI(
    marketData: MarketData,
    indicators: TechnicalIndicators,
    rsi: number
  ): { side: 'LONG' | 'SHORT'; confidence: number; reason: string } | null {
    // Oversold = buy signal
    if (rsi < (this.params.rsi_oversold ?? 30)) {
      const oversoldStrength = (this.params.rsi_oversold ?? 30) - rsi
      const confidence = 65 + Math.min(oversoldStrength * 2, 30)
      return {
        side: 'LONG',
        confidence,
        reason: `RSI oversold ${rsi.toFixed(0)}`,
      }
    }

    // Overbought = sell signal (if shorts allowed)
    if (this.strategy.allow_short && rsi > (this.params.rsi_overbought ?? 70)) {
      const overboughtStrength = rsi - (this.params.rsi_overbought ?? 70)
      const confidence = 65 + Math.min(overboughtStrength * 2, 30)
      return {
        side: 'SHORT',
        confidence,
        reason: `RSI overbought ${rsi.toFixed(0)}`,
      }
    }

    return null
  }

  private analyzeMomentum(
    marketData: MarketData,
    indicators: TechnicalIndicators,
    priceChange24h: number
  ): { side: 'LONG' | 'SHORT'; confidence: number; reason: string } | null {
    const threshold = this.params.momentum_threshold ?? 10

    // Strong upward momentum
    if (priceChange24h > threshold) {
      const confidence = 65 + Math.min(priceChange24h, 30)
      return {
        side: 'LONG',
        confidence,
        reason: `Momentum +${priceChange24h.toFixed(1)}%`,
      }
    }

    // Strong downward momentum (if shorts allowed)
    if (this.strategy.allow_short && priceChange24h < -threshold) {
      const confidence = 65 + Math.min(Math.abs(priceChange24h), 30)
      return {
        side: 'SHORT',
        confidence,
        reason: `Momentum ${priceChange24h.toFixed(1)}%`,
      }
    }

    return null
  }

  // Allow users to update custom parameters
  updateParams(newParams: Partial<CustomStrategyParams>) {
    this.params = { ...this.params, ...newParams }
  }

  getParams(): CustomStrategyParams {
    return { ...this.params }
  }
}
