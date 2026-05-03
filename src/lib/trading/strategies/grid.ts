/**
 * Grid Bot Strategy — Dynamic Price Grid
 *
 * Setter opp et gitter av kjøps- og salgsnivåer rundt nåværende pris.
 * Kjøper når prisen treffer et nedre nivå, selger når den treffer et øvre.
 *
 * Forbedringer fra v1:
 * - Volatilitetsjustert grid-range (bredere i volatile markeder)
 * - Regime detection: deaktiveres i sterke trender
 */

import type { MinimalSession, StrategyEngine, StrategyInput, StrategySignal } from "./types";
import { detectMarketRegime, atr } from "./indicators";

export interface GridConfig {
  upper_price?: number;
  upperPrice?: number;
  lower_price?: number;
  lowerPrice?: number;
  grid_levels?: number;
  levels?: number;
  volatility_adjust?: boolean;
}

export class GridBotStrategy implements StrategyEngine {
  evaluate(input: StrategyInput): StrategySignal {
    const { candles, session, config } = input;
    const cfg: GridConfig = config as GridConfig;

    const currentPrice = candles[candles.length - 1].close;

    // Regime detection: disable grid in strong trends
    const highs = candles.map((c) => c.high);
    const lows = candles.map((c) => c.low);
    const closes = candles.map((c) => c.close);
    const regime = detectMarketRegime(highs, lows, closes);

    if (regime === "trending_up" || regime === "trending_down") {
      return {
        action: "hold",
        reason: `Grid disabled: market is ${regime.replace("_", " ")} (ADX too high). Grid works best in ranging markets.`,
        indicators: { regime, grid_disabled: true },
      };
    }

    // Volatility-adjusted range
    let upper =
      cfg.upper_price ?? cfg.upperPrice ?? currentPrice * 1.1;
    let lower =
      cfg.lower_price ?? cfg.lowerPrice ?? currentPrice * 0.9;

    if (cfg.volatility_adjust !== false && candles.length >= 14) {
      const atrValue = atr(highs, lows, closes, 14);
      const volatilityPct = (atrValue / currentPrice) * 100;
      // Widen range in volatile markets
      const multiplier = Math.max(1, volatilityPct / 5);
      const mid = (upper + lower) / 2;
      const halfRange = ((upper - lower) / 2) * multiplier;
      upper = mid + halfRange;
      lower = mid - halfRange;
    }

    const levels = cfg.grid_levels ?? cfg.levels ?? 10;
    const gridSize = (upper - lower) / levels;

    if (currentPrice > upper || currentPrice < lower) {
      return {
        action: "hold",
        reason: "Price outside grid range — rebalancing needed",
        indicators: { currentPrice, upper, lower, regime },
      };
    }

    const currentLevel = Math.floor((currentPrice - lower) / gridSize);
    const gridBuyPrice = lower + gridSize * currentLevel;
    const gridSellPrice = gridBuyPrice + gridSize;

    // Buy if near grid buy level (within 0.5%)
    if (!session.open_position && currentPrice <= gridBuyPrice * 1.005) {
      return {
        action: "buy",
        positionSize: 1 / levels,
        indicators: {
          grid_level: currentLevel,
          buy_at: Math.round(gridBuyPrice * 100) / 100,
          sell_at: Math.round(gridSellPrice * 100) / 100,
          regime,
        },
        reason: `Grid buy at level ${currentLevel} ($${gridBuyPrice.toFixed(0)}) — market is ${regime}`,
      };
    }

    // Sell if near grid sell level (within 0.5%)
    if (session.open_position && currentPrice >= gridSellPrice * 0.995) {
      return {
        action: "sell",
        indicators: {
          grid_level: currentLevel,
          sell_at: Math.round(gridSellPrice * 100) / 100,
          regime,
        },
        reason: `Grid sell at level ${currentLevel} ($${gridSellPrice.toFixed(0)}) — profit grid level reached`,
      };
    }

    return {
      action: "hold",
      indicators: { grid_level: currentLevel, regime },
    };
  }
}
