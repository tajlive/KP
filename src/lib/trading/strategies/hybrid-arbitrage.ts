/**
 * Hybrid Arbitrage Strategy — Grid + Trend Dynamic Blend
 *
 * Bytter mellom grid-trading (ranging) og trend-following (trending)
 * basert på markedsregime. Grid-dominated i chop, trend-dominated i bull/bear.
 */

import type { MinimalSession, StrategyEngine, StrategyInput, StrategySignal } from "./types";
import { detectMarketRegime, bollingerBands, sma, ema as calcEMA, atr } from "./indicators";

export interface HybridArbitrageConfig {
  grid_weight?: number;
  trend_weight?: number;
  grid_levels?: number;
  trend_fast_period?: number;
  trend_slow_period?: number;
  switch_threshold?: number;
  position_size?: number;
}

export class HybridArbitrageStrategy implements StrategyEngine {
  evaluate(input: StrategyInput): StrategySignal {
    const { candles, session, config } = input;
    const cfg: HybridArbitrageConfig = config as HybridArbitrageConfig;

    const gridWeight = cfg.grid_weight ?? 0.6;
    const trendWeight = cfg.trend_weight ?? 0.4;
    const gridLevels = cfg.grid_levels ?? 12;
    const trendFast = cfg.trend_fast_period ?? 10;
    const trendSlow = cfg.trend_slow_period ?? 30;
    const switchThreshold = cfg.switch_threshold ?? 0.3;
    const positionSize = cfg.position_size ?? 0.07;

    const highs = candles.map((c) => c.high);
    const lows = candles.map((c) => c.low);
    const closes = candles.map((c) => c.close);
    const currentPrice = closes[closes.length - 1];

    if (candles.length < trendSlow + 5) {
      return { action: "hold", reason: "Insufficient data" };
    }

    // Detect regime
    const regime = detectMarketRegime(highs, lows, closes);

    // Calculate blended score: -1 (pure grid sell) to +1 (pure trend buy)
    let gridScore = 0;
    let trendScore = 0;

    // ── Grid component ──────────────────────────────────────────────────────
    const bb = bollingerBands(closes, 20, 2);
    const gridRange = bb.upper - bb.lower;
    const gridSize = gridRange / gridLevels;
    const gridBuyPrice = bb.lower + gridSize * Math.floor((currentPrice - bb.lower) / gridSize);
    const gridSellPrice = gridBuyPrice + gridSize;

    if (currentPrice <= gridBuyPrice * 1.005) {
      gridScore = 1; // Grid says buy
    } else if (currentPrice >= gridSellPrice * 0.995) {
      gridScore = -1; // Grid says sell
    }

    // Disable grid in strong trends
    if (regime === "trending_up" || regime === "trending_down") {
      gridScore = 0;
    }

    // ── Trend component ─────────────────────────────────────────────────────
    const fastEMA = calcEMA(closes, trendFast);
    const slowEMA = calcEMA(closes, trendSlow);
    const fastNow = fastEMA[fastEMA.length - 1];
    const slowNow = slowEMA[slowEMA.length - 1];
    const fastPrev = fastEMA[fastEMA.length - 2];
    const slowPrev = slowEMA[slowEMA.length - 2];

    if (fastNow > slowNow && fastPrev <= slowPrev) {
      trendScore = 1; // Trend says buy
    } else if (fastNow < slowNow && fastPrev >= slowPrev) {
      trendScore = -1; // Trend says sell
    } else if (fastNow > slowNow) {
      trendScore = 0.3; // Weak buy bias
    } else if (fastNow < slowNow) {
      trendScore = -0.3; // Weak sell bias
    }

    // ── Blend scores ────────────────────────────────────────────────────────
    const regimeMultiplier = this.getRegimeMultiplier(regime);
    const blendedScore =
      (gridScore * gridWeight * regimeMultiplier.grid +
        trendScore * trendWeight * regimeMultiplier.trend);

    const indicators = {
      regime,
      grid_score: Math.round(gridScore * 100) / 100,
      trend_score: Math.round(trendScore * 100) / 100,
      blended_score: Math.round(blendedScore * 100) / 100,
      grid_weight: gridWeight,
      trend_weight: trendWeight,
      ema_fast: Math.round(fastNow * 100) / 100,
      ema_slow: Math.round(slowNow * 100) / 100,
    };

    // ── Decision ────────────────────────────────────────────────────────────
    const absScore = Math.abs(blendedScore);

    // Need strong signal to act
    if (absScore < switchThreshold) {
      return { action: "hold", indicators };
    }

    if (blendedScore > 0 && !session.open_position) {
      return {
        action: "buy",
        positionSize,
        indicators,
        reason: `Hybrid buy: ${regime} regime (grid=${gridScore.toFixed(1)}, trend=${trendScore.toFixed(1)}, blended=${blendedScore.toFixed(2)})`,
      };
    }

    if (blendedScore < 0 && session.open_position) {
      return {
        action: "sell",
        positionSize,
        indicators,
        reason: `Hybrid sell: ${regime} regime (grid=${gridScore.toFixed(1)}, trend=${trendScore.toFixed(1)}, blended=${blendedScore.toFixed(2)})`,
      };
    }

    return { action: "hold", indicators };
  }

  private getRegimeMultiplier(regime: string): { grid: number; trend: number } {
    switch (regime) {
      case "ranging":
        return { grid: 1.5, trend: 0.3 };
      case "trending_up":
      case "trending_down":
        return { grid: 0.2, trend: 1.5 };
      case "volatile":
        return { grid: 0.5, trend: 0.5 };
      default:
        return { grid: 1.0, trend: 1.0 };
    }
  }
}

// EMA helper (duplicated from trend.ts to avoid circular dep)
function ema(prices: number[], period: number): number[] {
  const multiplier = 2 / (period + 1);
  const result: number[] = [prices[0]];
  for (let i = 1; i < prices.length; i++) {
    result.push((prices[i] - result[i - 1]) * multiplier + result[i - 1]);
  }
  return result;
}
