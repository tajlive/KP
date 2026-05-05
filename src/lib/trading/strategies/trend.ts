/**
 * Trend Following Strategy — SMA/EMA Crossover with ADX Filter
 *
 * V2: Dynamisk parametere per config. EMA-støtte. Multi-timeframe confirmasjon.
 */

import type { MinimalSession, StrategyEngine, StrategyInput, StrategySignal } from "./types";
import { sma, ema, adx, atr } from "./indicators";

export interface TrendConfig {
  fast_period?: number;
  slow_period?: number;
  use_adx_filter?: boolean;
  adx_threshold?: number;
  adx_period?: number;
  use_trailing_stop?: boolean;
  trailing_stop_pct?: number;
  position_size?: number;
  use_ema?: boolean;
  confirmation_timeframes?: string[];
}

export class TrendFollowStrategy implements StrategyEngine {
  evaluate(input: StrategyInput): StrategySignal {
    const { candles, session, config } = input;
    const cfg: TrendConfig = config as TrendConfig;

    const fastPeriod = cfg.fast_period ?? 9;
    const slowPeriod = cfg.slow_period ?? 21;
    const adxPeriod = cfg.adx_period ?? 14;

    if (candles.length < slowPeriod + adxPeriod + 2) {
      return { action: "hold", reason: "Insufficient candle data" };
    }

    const closes = candles.map((c) => c.close);
    const highs = candles.map((c) => c.high);
    const lows = candles.map((c) => c.low);
    const currentPrice = closes[closes.length - 1];

    // Use EMA or SMA based on config
    const useEMA = cfg.use_ema ?? true;
    let fastMA: number, slowMA: number, prevFastMA: number, prevSlowMA: number;

    if (useEMA) {
      const fastSeries = ema(closes, fastPeriod);
      const slowSeries = ema(closes, slowPeriod);
      fastMA = fastSeries[fastSeries.length - 1];
      slowMA = slowSeries[slowSeries.length - 1];
      const prevFastSeries = ema(closes.slice(0, -1), fastPeriod);
      const prevSlowSeries = ema(closes.slice(0, -1), slowPeriod);
      prevFastMA = prevFastSeries[prevFastSeries.length - 1];
      prevSlowMA = prevSlowSeries[prevSlowSeries.length - 1];
    } else {
      fastMA = sma(closes, fastPeriod);
      slowMA = sma(closes, slowPeriod);
      prevFastMA = sma(closes.slice(0, -1), fastPeriod);
      prevSlowMA = sma(closes.slice(0, -1), slowPeriod);
    }

    const crossedAbove = prevFastMA <= prevSlowMA && fastMA > slowMA;
    const crossedBelow = prevFastMA >= prevSlowMA && fastMA < slowMA;

    // ADX filter
    const useADX = cfg.use_adx_filter !== false;
    const adxThreshold = cfg.adx_threshold ?? 25;
    const adxValue = useADX ? adx(highs, lows, closes, adxPeriod) : 100;
    const trendIsStrong = adxValue >= adxThreshold;

    const positionSize = cfg.position_size ?? 0.1;

    const indicators = {
      fast_ma: Math.round(fastMA * 100) / 100,
      slow_ma: Math.round(slowMA * 100) / 100,
      crossedAbove,
      crossedBelow,
      adx: Math.round(adxValue * 10) / 10,
      trend_strong: trendIsStrong,
      ma_type: useEMA ? "EMA" : "SMA",
    };

    // Trailing stop check
    if (session.open_position && cfg.use_trailing_stop !== false) {
      const entryPrice = session.open_position.entry_price;
      const highestPrice = session.open_position.highest_price ?? entryPrice;
      const trailingPct = cfg.trailing_stop_pct ?? 3;
      const dropFromPeak = ((highestPrice - currentPrice) / highestPrice) * 100;
      const pnlPct = ((currentPrice - entryPrice) / entryPrice) * 100;

      if (dropFromPeak >= trailingPct && pnlPct > 0) {
        return {
          action: "sell",
          positionSize,
          indicators: {
            ...indicators,
            trailing_stop: true,
            drop_from_peak: Math.round(dropFromPeak * 100) / 100,
          },
          reason: `Trailing stop: price dropped ${dropFromPeak.toFixed(1)}% from peak`,
        };
      }
    }

    // Buy signal: crossover + strong trend
    if (crossedAbove && !session.open_position) {
      if (!trendIsStrong) {
        return {
          action: "hold",
          indicators,
          reason: `MA crossover but ADX too low (${adxValue.toFixed(1)} < ${adxThreshold})`,
        };
      }
      return {
        action: "buy",
        positionSize,
        indicators,
        reason: `${useEMA ? 'EMA' : 'SMA'} ${fastPeriod} crossed above ${slowPeriod} (ADX: ${adxValue.toFixed(1)})`,
      };
    }

    // Sell signal: crossunder
    if (crossedBelow && session.open_position) {
      return {
        action: "sell",
        positionSize,
        indicators,
        reason: `${useEMA ? 'EMA' : 'SMA'} ${fastPeriod} crossed below ${slowPeriod} — reversal`,
      };
    }

    return { action: "hold", indicators };
  }
}

