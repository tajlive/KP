/**
 * ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 * MARKET REGIME DETECTOR
 * ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 * 
 * Analyzes market conditions using technical indicators:
 * - RSI (Relative Strength Index)
 * - ADX (Average Directional Index)
 * - ATR (Average True Range)
 * - Volatility
 * - Trend analysis
 * 
 * Detects regimes: TRENDING_UP, TRENDING_DOWN, RANGING, VOLATILE, UNCERTAIN
 * 
 * ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 */

import { BinanceHistoricalDataFetcher, TimeInterval, BinanceCandle } from './binance-historical-data';

export type MarketRegime = 
  | 'TRENDING_UP' 
  | 'TRENDING_DOWN' 
  | 'RANGING' 
  | 'VOLATILE' 
  | 'UNCERTAIN';

export interface MarketMetrics {
  rsi: number;           // 0-100
  adx: number;           // 0-100
  atr: number;           // Absolute price
  atrPercent: number;    // ATR as % of price
  volatility: number;    // Standard deviation of returns
  trend: number;         // -1 to 1 (negative = downtrend, positive = uptrend)
  volumeTrend: number;   // Volume change %
  priceVsSMA20: number;  // % distance from SMA20
  priceVsSMA50: number;  // % distance from SMA50
}

export interface MarketAnalysis {
  regime: MarketRegime;
  confidence: number;              // 0-1
  metrics: MarketMetrics;
  reasoning: string;               // Norwegian explanation
  recommendedStrategies: string[]; // Strategy recommendations
  timestamp: string;               // ISO date
  symbol: string;
  timeframe: string;
}

// Cache for market analysis (5 minutes)
const analysisCache = new Map<string, { analysis: MarketAnalysis; timestamp: number }>();
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

/**
 * Market Regime Detector
 * Identifies current market conditions for optimal strategy selection
 */
export class MarketRegimeDetector {
  private fetcher: BinanceHistoricalDataFetcher;

  constructor() {
    this.fetcher = new BinanceHistoricalDataFetcher();
  }

  /**
   * Analyze market conditions for a symbol
   * Uses cached data if available and fresh
   */
  async analyzeMarket(
    symbol: string,
    timeframe: TimeInterval = '1h'
  ): Promise<MarketAnalysis> {
    const cacheKey = `${symbol}-${timeframe}`;
    const cached = analysisCache.get(cacheKey);
    
    // Return cached result if still fresh
    if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
      console.info(`[Cache HIT] Market analysis for ${symbol} ${timeframe}`);
      return cached.analysis;
    }

    console.info(`[Cache MISS] Analyzing ${symbol} ${timeframe}...`);
    const startTime = Date.now();

    // Fetch historical data (need 100 candles for accurate indicators)
    const endTime = new Date();
    const startTimeData = new Date(endTime.getTime() - 100 * this.getIntervalMs(timeframe));
    
    const candles = await this.fetcher.fetchCandles(
      symbol,
      timeframe,
      startTimeData,
      endTime,
      { useCache: true, validateData: true }
    );

    if (candles.length < 50) {
      throw new Error(`Insufficient data: only ${candles.length} candles available`);
    }

    // Calculate indicators
    const metrics = this.calculateMetrics(candles);
    
    // Detect regime
    const { regime, confidence, reasoning } = this.detectRegime(metrics);
    
    // Get strategy recommendations
    const recommendedStrategies = this.getRecommendedStrategies(regime, metrics);

    const analysis: MarketAnalysis = {
      regime,
      confidence,
      metrics,
      reasoning,
      recommendedStrategies,
      timestamp: new Date().toISOString(),
      symbol: symbol.toUpperCase(),
      timeframe,
    };

    // Cache result
    analysisCache.set(cacheKey, { analysis, timestamp: Date.now() });

    const elapsed = Date.now() - startTime;
    console.info(`✅ Analysis complete in ${elapsed}ms: ${regime} (${(confidence * 100).toFixed(0)}% confidence)`);

    return analysis;
  }

  /**
   * Calculate all technical metrics
   */
  private calculateMetrics(candles: BinanceCandle[]): MarketMetrics {
    const closes = candles.map(c => c.close);
    const highs = candles.map(c => c.high);
    const lows = candles.map(c => c.low);
    const volumes = candles.map(c => c.volume);
    const currentPrice = closes[closes.length - 1];

    // RSI (14 periods)
    const rsi = this.calculateRSI(closes, 14);

    // ADX (14 periods) - requires 27 candles minimum
    const adx = closes.length >= 27 ? this.calculateADX(highs, lows, closes, 14) : 25;

    // ATR (14 periods)
    const atr = this.calculateATR(highs, lows, closes, 14);
    const atrPercent = (atr / currentPrice) * 100;

    // Volatility (20-period standard deviation of returns)
    const volatility = this.calculateVolatility(closes, 20);

    // Trend (-1 to 1)
    const trend = this.calculateTrend(closes);

    // Volume trend (comparing last 5 periods to previous 5)
    const volumeTrend = this.calculateVolumeTrend(volumes);

    // Price vs moving averages
    const sma20 = this.calculateSMA(closes, 20);
    const sma50 = this.calculateSMA(closes, 50);
    const priceVsSMA20 = ((currentPrice - sma20) / sma20) * 100;
    const priceVsSMA50 = ((currentPrice - sma50) / sma50) * 100;

    return {
      rsi,
      adx,
      atr,
      atrPercent,
      volatility,
      trend,
      volumeTrend,
      priceVsSMA20,
      priceVsSMA50,
    };
  }

  /**
   * Detect market regime based on metrics
   */
  private detectRegime(metrics: MarketMetrics): {
    regime: MarketRegime;
    confidence: number;
    reasoning: string;
  } {
    const { rsi, adx, atrPercent, volatility, trend, priceVsSMA20, priceVsSMA50 } = metrics;

    // High volatility check first
    if (atrPercent > 5 || volatility > 0.05) {
      return {
        regime: 'VOLATILE',
        confidence: Math.min(0.95, 0.7 + (atrPercent / 10)),
        reasoning: `Ekstrem volatilitet påvist (ATR: ${atrPercent.toFixed(2)}%). Markedet beveger seg uforutsigbart. Reduser posisjonsstørrelse eller vent på stabilisering.`,
      };
    }

    // Strong trend detection (ADX > 25 indicates trending)
    if (adx > 25) {
      if (trend > 0.3 && priceVsSMA20 > 1 && priceVsSMA50 > 0) {
        return {
          regime: 'TRENDING_UP',
          confidence: Math.min(0.95, 0.6 + (adx / 100) + (trend * 0.2)),
          reasoning: `Sterk opptrend påvist (ADX: ${adx.toFixed(1)}). Prisen er ${priceVsSMA20.toFixed(1)}% over SMA20. Trend-following strategier anbefales.`,
        };
      }
      
      if (trend < -0.3 && priceVsSMA20 < -1 && priceVsSMA50 < 0) {
        return {
          regime: 'TRENDING_DOWN',
          confidence: Math.min(0.95, 0.6 + (adx / 100) + (Math.abs(trend) * 0.2)),
          reasoning: `Sterk nedtrend påvist (ADX: ${adx.toFixed(1)}). Prisen er ${Math.abs(priceVsSMA20).toFixed(1)}% under SMA20. Vurder short-posisjoner eller hold deg unna.`,
        };
      }
    }

    // Ranging market (low ADX, price near SMAs)
    if (adx < 20 && Math.abs(priceVsSMA20) < 2 && Math.abs(trend) < 0.2) {
      return {
        regime: 'RANGING',
        confidence: Math.min(0.9, 0.7 + ((20 - adx) / 40)),
        reasoning: `Sideways marked påvist (ADX: ${adx.toFixed(1)}). Prisen beveger seg innenfor et område. Mean-reversion eller range-trading strategier kan fungere bra.`,
      };
    }

    // Moderate volatility without clear trend
    if (atrPercent > 2.5 || volatility > 0.025) {
      return {
        regime: 'VOLATILE',
        confidence: Math.min(0.85, 0.6 + (atrPercent / 8)),
        reasoning: `Økt volatilitet (ATR: ${atrPercent.toFixed(2)}%) uten klar trend. Vær forsiktig med posisjonsstørrelse.`,
      };
    }

    // Uncertain - no clear signal
    return {
      regime: 'UNCERTAIN',
      confidence: 0.5,
      reasoning: `Usikkert marked. Ingen klare tekniske signaler (ADX: ${adx.toFixed(1)}, Trend: ${trend.toFixed(2)}). Vent på bedre setups.`,
    };
  }

  /**
   * Get strategy recommendations based on regime
   */
  private getRecommendedStrategies(regime: MarketRegime, metrics: MarketMetrics): string[] {
    const strategies: Record<MarketRegime, string[]> = {
      'TRENDING_UP': [
        'Trend Following - Kjøp på pullbacks til SMA20',
        'Momentum - Følg styrken med økende volum',
        'Breakout Trading - Vent på nye høyder',
      ],
      'TRENDING_DOWN': [
        'Trend Following (Short) - Selg på oppsving',
        'Defensive Hold Cash - Beskytt kapital',
        'Mean Reversion - VENT til oversold nivåer',
      ],
      'RANGING': [
        'Range Trading - Kjøp støtte, selg motstand',
        'Mean Reversion - RSI under 30 = kjøp, over 70 = selg',
        'Grid Trading - Automatiske kjøp/salg innenfor range',
      ],
      'VOLATILE': [
        'Redusere posisjonsstørrelse - Halv risiko',
        'Breakout Trading - Store moves kan gi gevinster',
        'Defensive - Vent på stabilisering',
      ],
      'UNCERTAIN': [
        'Hold Cash - Ingen klar edge',
        'Scalping - Små, raske trades med tight stops',
        'Vent - Bedre muligheter kommer',
      ],
    };

    return strategies[regime];
  }

  // ==================== TECHNICAL INDICATORS ====================

  /**
   * Calculate Simple Moving Average
   */
  private calculateSMA(data: number[], period: number): number {
    if (data.length < period) {
      return data[data.length - 1];
    }
    const sum = data.slice(-period).reduce((a, b) => a + b, 0);
    return sum / period;
  }

  /**
   * Calculate Exponential Moving Average
   */
  private calculateEMA(data: number[], period: number): number {
    if (data.length < period) {
      return data[data.length - 1];
    }
    
    const multiplier = 2 / (period + 1);
    let ema = this.calculateSMA(data.slice(0, period), period);
    
    for (let i = period; i < data.length; i++) {
      ema = (data[i] - ema) * multiplier + ema;
    }
    
    return ema;
  }

  /**
   * Calculate RSI (Relative Strength Index)
   */
  private calculateRSI(closes: number[], period: number = 14): number {
    if (closes.length < period + 1) {
      return 50; // Neutral
    }

    let gains = 0;
    let losses = 0;

    // Calculate initial averages
    for (let i = 1; i <= period; i++) {
      const change = closes[closes.length - i] - closes[closes.length - i - 1];
      if (change > 0) {
        gains += change;
      } else {
        losses += Math.abs(change);
      }
    }

    let avgGain = gains / period;
    let avgLoss = losses / period;

    // Calculate smoothed RSI
    for (let i = period + 1; i < closes.length; i++) {
      const change = closes[closes.length - i] - closes[closes.length - i - 1];
      if (change > 0) {
        avgGain = (avgGain * (period - 1) + change) / period;
        avgLoss = (avgLoss * (period - 1)) / period;
      } else {
        avgGain = (avgGain * (period - 1)) / period;
        avgLoss = (avgLoss * (period - 1) + Math.abs(change)) / period;
      }
    }

    if (avgLoss === 0) {
      return 100;
    }

    const rs = avgGain / avgLoss;
    return 100 - (100 / (1 + rs));
  }

  /**
   * Calculate ADX (Average Directional Index)
   */
  private calculateADX(
    highs: number[],
    lows: number[],
    closes: number[],
    period: number = 14
  ): number {
    if (highs.length < period * 2 + 1) {
      return 25; // Neutral
    }

    let trSum = 0;
    let plusDMSum = 0;
    let minusDMSum = 0;

    // Calculate initial values
    for (let i = 1; i <= period; i++) {
      const idx = highs.length - i;
      
      const tr = Math.max(
        highs[idx] - lows[idx],
        Math.abs(highs[idx] - closes[idx - 1]),
        Math.abs(lows[idx] - closes[idx - 1])
      );
      
      const plusDM = highs[idx] - highs[idx - 1] > lows[idx - 1] - lows[idx]
        ? Math.max(highs[idx] - highs[idx - 1], 0)
        : 0;
      
      const minusDM = lows[idx - 1] - lows[idx] > highs[idx] - highs[idx - 1]
        ? Math.max(lows[idx - 1] - lows[idx], 0)
        : 0;
      
      trSum += tr;
      plusDMSum += plusDM;
      minusDMSum += minusDM;
    }

    let tr14 = trSum;
    let plusDI14 = (plusDMSum / trSum) * 100;
    let minusDI14 = (minusDMSum / trSum) * 100;

    // Smooth remaining values
    for (let i = period + 1; i < highs.length; i++) {
      const idx = highs.length - i;
      
      const tr = Math.max(
        highs[idx] - lows[idx],
        Math.abs(highs[idx] - closes[idx - 1]),
        Math.abs(lows[idx] - closes[idx - 1])
      );
      
      const plusDM = highs[idx] - highs[idx - 1] > lows[idx - 1] - lows[idx]
        ? Math.max(highs[idx] - highs[idx - 1], 0)
        : 0;
      
      const minusDM = lows[idx - 1] - lows[idx] > highs[idx] - highs[idx - 1]
        ? Math.max(lows[idx - 1] - lows[idx], 0)
        : 0;
      
      tr14 = tr14 - (tr14 / period) + tr;
      plusDI14 = (plusDI14 * (period - 1) + (plusDM / tr14) * 100) / period;
      minusDI14 = (minusDI14 * (period - 1) + (minusDM / tr14) * 100) / period;
    }

    const dx = (Math.abs(plusDI14 - minusDI14) / (plusDI14 + minusDI14)) * 100;
    return dx;
  }

  /**
   * Calculate ATR (Average True Range)
   */
  private calculateATR(
    highs: number[],
    lows: number[],
    closes: number[],
    period: number = 14
  ): number {
    if (highs.length < period + 1) {
      return highs[highs.length - 1] - lows[lows.length - 1];
    }

    let trSum = 0;

    for (let i = 1; i <= period; i++) {
      const idx = highs.length - i;
      const tr = Math.max(
        highs[idx] - lows[idx],
        Math.abs(highs[idx] - closes[idx - 1]),
        Math.abs(lows[idx] - closes[idx - 1])
      );
      trSum += tr;
    }

    return trSum / period;
  }

  /**
   * Calculate volatility (standard deviation of returns)
   */
  private calculateVolatility(closes: number[], period: number = 20): number {
    if (closes.length < period + 1) {
      return 0;
    }

    // Calculate returns
    const returns: number[] = [];
    for (let i = closes.length - period; i < closes.length; i++) {
      returns.push((closes[i] - closes[i - 1]) / closes[i - 1]);
    }

    // Calculate mean
    const mean = returns.reduce((a, b) => a + b, 0) / returns.length;

    // Calculate standard deviation
    const variance = returns.reduce((sum, r) => sum + Math.pow(r - mean, 2), 0) / returns.length;
    return Math.sqrt(variance);
  }

  /**
   * Calculate trend strength (-1 to 1)
   */
  private calculateTrend(closes: number[]): number {
    if (closes.length < 50) {
      return 0;
    }

    const sma20 = this.calculateSMA(closes, 20);
    const sma50 = this.calculateSMA(closes, 50);
    const currentPrice = closes[closes.length - 1];

    // Trend based on moving average alignment
    const priceVsSMA20 = (currentPrice - sma20) / sma20;
    const sma20VsSMA50 = (sma20 - sma50) / sma50;

    // Combine signals
    return Math.max(-1, Math.min(1, (priceVsSMA20 * 5) + (sma20VsSMA50 * 5)));
  }

  /**
   * Calculate volume trend (% change)
   */
  private calculateVolumeTrend(volumes: number[]): number {
    if (volumes.length < 10) {
      return 0;
    }

    const recent = volumes.slice(-5).reduce((a, b) => a + b, 0) / 5;
    const previous = volumes.slice(-10, -5).reduce((a, b) => a + b, 0) / 5;

    if (previous === 0) return 0;
    return ((recent - previous) / previous) * 100;
  }

  /**
   * Convert interval to milliseconds
   */
  private getIntervalMs(interval: TimeInterval): number {
    const map: Record<TimeInterval, number> = {
      '1m': 60 * 1000,
      '5m': 5 * 60 * 1000,
      '15m': 15 * 60 * 1000,
      '30m': 30 * 60 * 1000,
      '1h': 60 * 60 * 1000,
      '4h': 4 * 60 * 60 * 1000,
      '1d': 24 * 60 * 60 * 1000,
      '1w': 7 * 24 * 60 * 60 * 1000,
    };
    return map[interval];
  }

  /**
   * Clear cache (useful for testing)
   */
  clearCache(): void {
    analysisCache.clear();
    console.info('🗑️ Market analysis cache cleared');
  }
}

/**
 * Convenience function for quick analysis
 */
export async function analyzeMarket(
  symbol: string,
  timeframe: TimeInterval = '1h'
): Promise<MarketAnalysis> {
  const detector = new MarketRegimeDetector();
  return detector.analyzeMarket(symbol, timeframe);
}
