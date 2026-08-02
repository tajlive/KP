/**
 * Grid Bot Strategy — Level-based grid med persistert state
 *
 * Bruker den testede evaluateGridSignal() fra grid-strategy.ts.
 * Én sann kilde for grid-logikk — brukt av BÅDE tick-engine og pilot-engine.
 *
 * Forbedringer fra v1 (ATR-basert dynamisk grid):
 * - Multi-nivå kjøp: kjøper på FLERE nivåer selv om posisjon finnes
 * - Persistert state: grid_levels lagres i session.strategy_config
 * - Ingen regime-deaktivering: grid handler i ALLE markeder (med trailing-up)
 * - DCA under grid-bunn med stigende multiplikatorer
 *
 * @module trading/strategies
 * @version 2.0.0
 */

import type { MinimalSession, StrategyEngine, StrategyInput, StrategySignal } from "./types";
import {
  generateGridLevels,
  evaluateGridSignal,
  calculateOptimalGrid,
  detectMarketRegime,
  type GridConfig,
  type GridLevel,
} from "../grid-strategy";

export interface GridStrategyConfig {
  upper_price?: number;
  upperPrice?: number;
  lower_price?: number;
  lowerPrice?: number;
  grid_levels?: number;
  levels?: number;
  amountPerGrid?: number;
  volatility_adjust?: boolean;
  stop_loss_pct?: number;
}

/** Persistert grid-state i session.strategy_config */
interface PersistedGridState {
  lowerPrice?: number;
  upperPrice?: number;
  gridLevelsCount?: number;
  amountPerGrid?: number;
  regime?: string;
  grid_levels?: GridLevel[];
}

export class GridBotStrategy implements StrategyEngine {
  evaluate(input: StrategyInput): StrategySignal {
    const { candles, session, config } = input;
    const cfg: GridStrategyConfig = config as GridStrategyConfig;
    const stratCfg = (session.strategy_config as Record<string, unknown> | undefined) ?? {};
    const savedState = stratCfg as PersistedGridState;

    const currentPrice = candles[candles.length - 1].close;
    const symbol = (config?.symbol as string) || "BTCUSDT";

    // ── 1. Hent eller generer grid-state ───────────────────────────────────
    let levels: GridLevel[];
    let gridConfig: GridConfig;

    const hasSavedRange =
      savedState.lowerPrice &&
      savedState.upperPrice &&
      savedState.gridLevelsCount &&
      savedState.amountPerGrid &&
      savedState.grid_levels?.length;

    // Re-kalibreringsbetingelser: breakout > 3% over topp eller > 10% under bunn
    const breakoutUp = hasSavedRange && currentPrice > savedState.upperPrice! * 1.03;
    const breakoutDown = hasSavedRange && currentPrice < savedState.lowerPrice! * 0.90;

    if (!hasSavedRange || breakoutUp || breakoutDown) {
      // Første kjøring eller re-kalibrering — beregn optimalt grid
      const capital = (config?.capital as number) ?? 10000; // NOK
      const volatility = this.estimateVolatility(candles);
      const optimal = calculateOptimalGrid(currentPrice, volatility, capital);
      gridConfig = { ...optimal, symbol, currentPrice };
      levels = generateGridLevels(gridConfig);
    } else {
      // Bruk persistert state
      gridConfig = {
        symbol,
        lowerPrice: savedState.lowerPrice!,
        upperPrice: savedState.upperPrice!,
        gridLevels: savedState.gridLevelsCount!,
        amountPerGrid: savedState.amountPerGrid!,
        currentPrice,
      };
      levels = savedState.grid_levels!;
    }

    // ── 2. Evaluer grid-signal (testet logikk fra grid-strategy.ts) ──────
    const signal = evaluateGridSignal(gridConfig, levels, currentPrice);

    // ── 3. Map til StrategySignal ─────────────────────────────────────────
    if (signal.action === "buy") {
      return {
        action: "buy",
        positionSize: gridConfig.amountPerGrid / ((config?.capital as number) ?? 10000),
        confidence: 0.7,
        indicators: {
          grid_level: signal.level?.level,
          buy_price: signal.level?.buyPrice,
          sell_price: signal.level?.sellPrice,
          profit_pct: signal.expectedProfitPct,
          dca_level: signal.level?.dcaLevel,
          size_multiplier: signal.level?.sizeMultiplier,
        },
        reason: signal.reason,
      };
    }

    if (signal.action === "sell") {
      return {
        action: "sell",
        quantity: signal.level?.quantity,
        confidence: 0.8,
        exitReason: "take_profit",
        indicators: {
          grid_level: signal.level?.level,
          sell_price: signal.level?.sellPrice,
          profit_pct: signal.expectedProfitPct,
          sell_type: signal.sellType,
        },
        reason: signal.reason,
      };
    }

    // WAIT
    return {
      action: "hold",
      reason: signal.reason,
      indicators: {
        grid_lower: gridConfig.lowerPrice,
        grid_upper: gridConfig.upperPrice,
        current_price: currentPrice,
        regime: savedState.regime,
      },
    };
  }

  /** Estimer volatilitet fra candles (annualisert %) */
  private estimateVolatility(candles: Array<{ close: number }>): number {
    if (candles.length < 14) return 50; // default
    const closes = candles.slice(-14).map((c) => c.close);
    const mean = closes.reduce((a, b) => a + b, 0) / closes.length;
    const variance = closes.reduce((s, p) => s + (p - mean) ** 2, 0) / closes.length;
    return Math.min((Math.sqrt(variance) / mean) * 100 * Math.sqrt(365), 200);
  }
}
