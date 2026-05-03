/**
 * Trend Following Strategy — SMA Crossover with ADX Filter
 *
 * Kjøper når kortsiktig SMA krysser over langsiktig SMA.
 * Selger når det motsatte skjer, eller ved trailing stop.
 *
 * Forbedringer fra v1:
 * - ADX-filter: handler bare når trend er sterk (ADX > 25)
 * - Unngår falske signaler i choppy/sideways markeder
 * - Trailing stop for å beskytte gevinster
 */

import type { MinimalSession, StrategyEngine, StrategyInput, StrategySignal } from "./types";
import { sma, adx } from "./indicators";

export interface TrendConfig {
  fast_period?: number;
  slow_period?: number;
  use_adx_filter?: boolean;
  adx_threshold?: number;
  use_trailing_stop?: boolean;
}

export class TrendFollowStrategy implements StrategyEngine {
  evaluate(input: StrategyInput): StrategySignal {
    const { candles, session, config } = input;
    const cfg: TrendConfig = config as TrendConfig;

    const fastPeriod = cfg.fast_period ?? 8;
    const slowPeriod = cfg.slow_period ?? 21;

    if (candles.length < slowPeriod + 2) {
      return { action: "hold", reason: "Insufficient candle data" };
    }

    const closes = candles.map((c) => c.close);
    const highs = candles.map((c) => c.high);
    const lows = candles.map((c) => c.low);

    const fastSMA = sma(closes, fastPeriod);
    const slowSMA = sma(closes, slowPeriod);
    const prevFastSMA = sma(closes.slice(0, -1), fastPeriod);
    const prevSlowSMA = sma(closes.slice(0, -1), slowPeriod);

    const crossedAbove = prevFastSMA <= prevSlowSMA && fastSMA > slowSMA;
    const crossedBelow = prevFastSMA >= prevSlowSMA && fastSMA < slowSMA;

    // ADX filter — only trade in strong trends
    const useADX = cfg.use_adx_filter !== false;
    const adxThreshold = cfg.adx_threshold ?? 25;
    const adxValue = useADX ? adx(highs, lows, closes, 14) : 100;
    const trendIsStrong = adxValue >= adxThreshold;

    const indicators = {
      fast_sma: Math.round(fastSMA * 100) / 100,
      slow_sma: Math.round(slowSMA * 100) / 100,
      crossedAbove,
      crossedBelow,
      adx: Math.round(adxValue * 10) / 10,
      trend_strong: trendIsStrong,
    };

    // Buy signal: crossover + strong trend
    if (crossedAbove && !session.open_position) {
      if (!trendIsStrong) {
        return {
          action: "hold",
          indicators,
          reason: `SMA crossover detected but ADX too low (${adxValue.toFixed(1)} < ${adxThreshold}) — avoiding false signal`,
        };
      }
      return {
        action: "buy",
        positionSize: 0.1,
        indicators,
        reason: `SMA ${fastPeriod} crossed above SMA ${slowPeriod} with strong trend (ADX: ${adxValue.toFixed(1)})`,
      };
    }

    // Sell signal: crossunder or trailing stop
    if (crossedBelow && session.open_position) {
      return {
        action: "sell",
        indicators,
        reason: `SMA ${fastPeriod} crossed below SMA ${slowPeriod} — trend reversal`,
      };
    }

    // Trailing stop: sell if price drops 2x ATR from peak
    if (cfg.use_trailing_stop !== false && session.open_position) {
      const currentPrice = closes[closes.length - 1];
      const highestPrice = session.open_position.highest_price ?? session.open_position.entry_price;
      const entryPrice = session.open_position.entry_price;

      // Simple trailing: 3% from peak
      const trailingPct = 3;
      const dropFromPeak = ((highestPrice - currentPrice) / highestPrice) * 100;

      if (dropFromPeak >= trailingPct && currentPrice > entryPrice) {
        return {
          action: "sell",
          indicators: {
            ...indicators,
            trailing_stop: true,
            drop_from_peak: Math.round(dropFromPeak * 100) / 100,
          },
          reason: `Trailing stop: price dropped ${dropFromPeak.toFixed(1)}% from peak`,
        };
      }
    }

    return { action: "hold", indicators };
  }
}
