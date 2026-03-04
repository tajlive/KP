/**
 * Base Trading Strategy
 * Abstract class that all trading strategies extend
 */

import type { AutoTradingStrategy, TradingSignal } from "../types";

export interface MarketData {
  symbol: string;
  price: number;
  volume_24h: number;
  price_change_24h: number;
  high_24h: number;
  low_24h: number;
  timestamp: Date;
}

export interface TechnicalIndicators {
  sma_20?: number; // Simple Moving Average 20 periods
  sma_50?: number; // Simple Moving Average 50 periods
  rsi?: number; // Relative Strength Index
  macd?: { value: number; signal: number; histogram: number };
  bollinger?: { upper: number; middle: number; lower: number };
  atr?: number; // Average True Range (volatility)
}

export abstract class BaseStrategy {
  protected strategy: AutoTradingStrategy;

  constructor(strategy: AutoTradingStrategy) {
    this.strategy = strategy;
  }

  /**
   * Analyze market data and generate trading signal
   * Each strategy implements its own logic
   */
  abstract analyze(
    marketData: MarketData,
    indicators: TechnicalIndicators,
  ): Promise<TradingSignal | null>;

  /**
   * Calculate technical indicators
   * Can be overridden by specific strategies
   */
  async calculateIndicators(
    symbol: string,
    historicalPrices: number[],
  ): Promise<TechnicalIndicators> {
    const indicators: TechnicalIndicators = {};

    if (historicalPrices.length >= 20) {
      indicators.sma_20 = this.calculateSMA(historicalPrices.slice(-20));
    }

    if (historicalPrices.length >= 50) {
      indicators.sma_50 = this.calculateSMA(historicalPrices.slice(-50));
    }

    if (historicalPrices.length >= 14) {
      indicators.rsi = this.calculateRSI(historicalPrices.slice(-14));
    }

    if (historicalPrices.length >= 20) {
      indicators.atr = this.calculateATR(historicalPrices.slice(-14));
      indicators.bollinger = this.calculateBollingerBands(
        historicalPrices.slice(-20),
      );
    }

    return indicators;
  }

  /**
   * Simple Moving Average
   */
  protected calculateSMA(prices: number[]): number {
    const sum = prices.reduce((acc, price) => acc + price, 0);
    return sum / prices.length;
  }

  /**
   * Relative Strength Index (RSI)
   */
  protected calculateRSI(prices: number[]): number {
    if (prices.length < 2) return 50; // Neutral

    const changes = [];
    for (let i = 1; i < prices.length; i++) {
      changes.push(prices[i] - prices[i - 1]);
    }

    const gains = changes.map((c) => (c > 0 ? c : 0));
    const losses = changes.map((c) => (c < 0 ? Math.abs(c) : 0));

    const avgGain = gains.reduce((a, b) => a + b, 0) / gains.length;
    const avgLoss = losses.reduce((a, b) => a + b, 0) / losses.length;

    if (avgLoss === 0) return 100;
    if (avgGain === 0) return 0;

    const rs = avgGain / avgLoss;
    const rsi = 100 - 100 / (1 + rs);

    return rsi;
  }

  /**
   * Average True Range (ATR) - Volatility measure
   */
  protected calculateATR(prices: number[]): number {
    if (prices.length < 2) return 0;

    const ranges = [];
    for (let i = 1; i < prices.length; i++) {
      ranges.push(Math.abs(prices[i] - prices[i - 1]));
    }

    return ranges.reduce((a, b) => a + b, 0) / ranges.length;
  }

  /**
   * Bollinger Bands
   */
  protected calculateBollingerBands(
    prices: number[],
    period: number = 20,
    multiplier: number = 2,
  ): { upper: number; middle: number; lower: number } {
    if (prices.length < period) return { upper: 0, middle: 0, lower: 0 };

    const slice = prices.slice(-period);
    const middle = this.calculateSMA(slice);

    const squareDiffs = slice.map((p) => Math.pow(p - middle, 2));
    const avgSquareDiff =
      squareDiffs.reduce((a, b) => a + b, 0) / squareDiffs.length;
    const stdDev = Math.sqrt(avgSquareDiff);

    return {
      upper: middle + stdDev * multiplier,
      middle: middle,
      lower: middle - stdDev * multiplier,
    };
  }

  /**
   * Calculate volatility percentage
   */
  protected calculateVolatility(marketData: MarketData): number {
    const high = marketData.high_24h;
    const low = marketData.low_24h;
    const current = marketData.price;

    return ((high - low) / current) * 100;
  }

  /**
   * Calculate risk score (0-100)
   * Higher score = higher risk
   */
  protected calculateRiskScore(
    marketData: MarketData,
    indicators: TechnicalIndicators,
  ): number {
    let riskScore = 0;

    // Factor 1: Price volatility (0-40 points)
    const volatility = this.calculateVolatility(marketData);
    riskScore += Math.min(volatility * 2, 40);

    // Factor 2: RSI extremes (0-20 points)
    if (indicators.rsi) {
      if (indicators.rsi > 70 || indicators.rsi < 30) {
        riskScore += 20; // Overbought or oversold
      }
    }

    // Factor 3: Price change (0-20 points)
    const priceChange = Math.abs(marketData.price_change_24h);
    riskScore += Math.min(priceChange * 2, 20);

    // Factor 4: Volume (0-20 points)
    // Low volume = higher risk (simplified)
    if (marketData.volume_24h < 1000000) {
      riskScore += 20;
    }

    return Math.min(riskScore, 100);
  }

  /**
   * Calculate dynamic stop loss based on ATR
   * ATR-multiplikator per risikonivå:
   * - Forsiktig: 1.5x ATR (stram, hyppigere stop-outs)
   * - Balansert: 2.0x ATR (standard)
   * - Offensiv: 2.5x ATR (gir mer rom)
   */
  protected calculateATRStopLoss(
    entryPrice: number,
    atr: number,
    side: "LONG" | "SHORT",
  ): { stopLossPrice: number; dynamicStopPct: number } {
    // ATR multiplikator basert på risikonivå
    const atrMultipliers: Record<string, number> = {
      conservative: 1.5,
      balanced: 2.0,
      aggressive: 2.5,
      custom: 2.0,
    };

    const multiplier = atrMultipliers[this.strategy.risk_level] || 2.0;
    const atrStopDistance = atr * multiplier;
    const dynamicStopPct = (atrStopDistance / entryPrice) * 100;

    // Bruk det STRENGESTE av fast og dynamisk stop-loss
    const finalStopPct = Math.min(this.strategy.stop_loss_pct, dynamicStopPct);

    let stopLossPrice: number;
    if (side === "LONG") {
      stopLossPrice = entryPrice * (1 - finalStopPct / 100);
    } else {
      stopLossPrice = entryPrice * (1 + finalStopPct / 100);
    }

    return { stopLossPrice, dynamicStopPct: finalStopPct };
  }

  /**
   * Get trailing stop configuration based on risk level
   */
  protected getTrailingStopConfig(): {
    enabled: boolean;
    activation_pct: number;
    distance_pct: number;
  } {
    const configs: Record<
      string,
      { enabled: boolean; activation_pct: number; distance_pct: number }
    > = {
      conservative: { enabled: true, activation_pct: 5, distance_pct: 3 },
      balanced: { enabled: true, activation_pct: 8, distance_pct: 5 },
      aggressive: { enabled: true, activation_pct: 12, distance_pct: 8 },
      custom: { enabled: true, activation_pct: 8, distance_pct: 5 },
    };

    return configs[this.strategy.risk_level] || configs["balanced"];
  }

  /**
   * Get partial profit taking levels based on risk level
   */
  protected getPartialTPLevels(): Array<{
    target_pct: number;
    sell_pct: number;
  }> {
    const levels: Record<
      string,
      Array<{ target_pct: number; sell_pct: number }>
    > = {
      conservative: [
        { target_pct: 5, sell_pct: 50 },
        { target_pct: 10, sell_pct: 50 },
      ],
      balanced: [
        { target_pct: 8, sell_pct: 30 },
        { target_pct: 15, sell_pct: 30 },
        { target_pct: 25, sell_pct: 40 }, // Resten med trailing
      ],
      aggressive: [
        { target_pct: 12, sell_pct: 25 },
        { target_pct: 25, sell_pct: 25 },
        { target_pct: 40, sell_pct: 50 }, // Resten med trailing
      ],
      custom: [
        { target_pct: 8, sell_pct: 30 },
        { target_pct: 15, sell_pct: 30 },
      ],
    };

    return levels[this.strategy.risk_level] || levels["balanced"];
  }

  /**
   * Fear & Greed Index — returns neutral (50) until external API is connected.
   */
  protected async getFearAndGreedIndex(): Promise<number> {
    return 50;
  }

  /**
   * Create a trading signal
   */
  protected createSignal(
    marketData: MarketData,
    indicators: TechnicalIndicators,
    side: "LONG" | "SHORT",
    confidence: number,
    reason: string,
  ): TradingSignal {
    const entryPrice = marketData.price;

    // Calculate ATR-based stop loss
    const atr = indicators.atr || this.calculateATR([marketData.price]);
    const { stopLossPrice, dynamicStopPct } = this.calculateATRStopLoss(
      entryPrice,
      atr,
      side,
    );

    // Calculate take profit if defined
    let takeProfitPrice: number | undefined;
    if (this.strategy.take_profit_pct) {
      if (side === "LONG") {
        takeProfitPrice =
          entryPrice * (1 + this.strategy.take_profit_pct / 100);
      } else {
        takeProfitPrice =
          entryPrice * (1 - this.strategy.take_profit_pct / 100);
      }
    }

    const riskScore = this.calculateRiskScore(marketData, indicators);
    const volatility = this.calculateVolatility(marketData);

    // Get trailing stop and partial TP config
    const trailingStop = this.getTrailingStopConfig();
    const partialTpLevels = this.getPartialTPLevels();

    return {
      symbol: marketData.symbol,
      side,
      confidence,
      entry_price: entryPrice,
      stop_loss_price: stopLossPrice,
      take_profit_price: takeProfitPrice,
      position_size_pct: this.strategy.max_position_size_pct,
      leverage: this.strategy.max_leverage,
      risk_score: riskScore,
      market_volatility_pct: volatility,
      reason,
      trailing_stop: trailingStop,
      partial_tp_levels: partialTpLevels,
    };
  }

  /**
   * Get strategy name
   */
  getName(): string {
    return this.strategy.name;
  }

  /**
   * Get risk level
   */
  getRiskLevel(): string {
    return this.strategy.risk_level;
  }
}
