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
  stop_loss_pct?: number;
}

export class GridBotStrategy implements StrategyEngine {
  evaluate(input: StrategyInput): StrategySignal {
    const { candles, session, config } = input;
    const cfg: GridConfig = config as GridConfig;
    const stratCfg = (session.strategy_config as Record<string, unknown> | undefined);
    const storedGrid = stratCfg?.grid_config as Record<string, number> | undefined;

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

    // Use stored grid boundaries if available (set at bot creation), otherwise fall back to config
    // This prevents the grid from "chasing" the price every tick
    let upper = cfg.upper_price ?? cfg.upperPrice ?? storedGrid?.upper_price;
    let lower = cfg.lower_price ?? cfg.lowerPrice ?? storedGrid?.lower_price;

    // If no fixed boundaries exist yet, calculate from current price and store for next tick
    if (!upper || !lower) {
      const gridRangePct = 20; // Default ±10%
      upper = currentPrice * (1 + gridRangePct / 100 / 2);
      lower = currentPrice * (1 - gridRangePct / 100 / 2);
    }

    // ATR-based range expansion for volatile markets
    const atrBasedRange = (session.strategy_config as Record<string, unknown>)?.atr_based_range !== false;
    if ((cfg.volatility_adjust !== false || atrBasedRange) && candles.length >= 14) {
      const atrValue = atr(highs, lows, closes, 14);
      const volatilityPct = (atrValue / currentPrice) * 100;
      // Widen range in volatile markets — use ATR directly for range sizing
      const atrMultiplier = Math.max(1, volatilityPct / 5);
      const mid = (upper + lower) / 2;
      const baseHalfRange = (upper - lower) / 2;
      // If ATR-based range is enabled, use 3x ATR as half-range (more adaptive)
      const atrHalfRange = atrBasedRange ? atrValue * 3 : baseHalfRange;
      const halfRange = atrBasedRange
        ? Math.max(baseHalfRange, atrHalfRange) * atrMultiplier
        : baseHalfRange * atrMultiplier;
      upper = mid + halfRange;
      lower = mid - halfRange;
    }

    // Trailing Up logic - shifts the grid upwards if price breaks out above upper bound
    // This captures gains in bull markets and prevents premature grid exits.
    const trailingUp = (session.strategy_config as Record<string, unknown>)?.trailing_up !== false;
    let gridShifted = false;
    if (trailingUp && currentPrice > upper) {
      const shift = currentPrice - upper;
      upper += shift;
      lower += shift;
      gridShifted = true;
    }

    const levels = cfg.grid_levels ?? cfg.levels ?? storedGrid?.levels ?? 10;
    const gridSize = (upper - lower) / levels;

    // Stop-Loss / Kill Switch Logic
    // If price drops X% below the lower grid bound, liquidate to prevent catastrophic loss.
    const stopLossPct = cfg.stop_loss_pct ?? -10; // Default 10% below lower bound
    const hardStopLossPrice = lower * (1 + stopLossPct / 100);

    if (currentPrice < hardStopLossPrice) {
      if (session.open_position) {
        return {
          action: "sell",
          indicators: { stop_loss_triggered: true, regime, stop_loss: stopLossPct, grid_disabled: true },
          reason: `CRITICAL: Stop-Loss triggered. Price ($${currentPrice.toFixed(2)}) fell ${Math.abs(stopLossPct)}% below grid lower bound ($${lower.toFixed(2)}). Liquidating position.`,
        };
      } else {
        return {
          action: "hold",
          indicators: { stop_loss_triggered: true, regime, grid_disabled: true },
          reason: `Grid disabled: Price ($${currentPrice.toFixed(2)}) is below hard stop-loss level ($${hardStopLossPrice.toFixed(2)}).`,
        };
      }
    }

    // If we shifted the grid, we must re-buy to enter the new grid
    if (gridShifted && !session.open_position) {
      return {
        action: "buy",
        positionSize: 1 / levels, // enter with 1 level of position
        indicators: {
          new_grid_upper: upper,
          new_grid_lower: lower,
          regime,
          trailing_up_triggered: true
        },
        reason: `Trailing Up: Grid shifted up to capture bull run. Re-entering at $${currentPrice.toFixed(0)}`,
      };
    }

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
      indicators: { 
        grid_level: currentLevel, 
        regime,
        ...(gridShifted ? { new_grid_upper: upper, new_grid_lower: lower } : {})
      },
      reason: gridShifted ? `Trailing Up: Grid shifted up to capture bull run.` : undefined,
    };
  }
}
