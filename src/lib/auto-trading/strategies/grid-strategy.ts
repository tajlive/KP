/**
 * Grid Trading Strategy
 * Den #1 mest brukte bot-strategien globalt
 * Fungerer i sidelengs markeder der trend-following taper penger
 */

import type { AutoTradingStrategy, TradingSignal } from "../types";
import {
  BaseStrategy,
  type MarketData,
  type TechnicalIndicators,
} from "./base-strategy";

export interface GridConfig {
  gridCount: number; // Antall grid-nivåer
  gridRangePct: number; // Total range i prosent (f.eks. 10% = ±5% fra midt)
  upperPrice?: number; // Manuell øvre grense (valgfri)
  lowerPrice?: number; // Manuell nedre grense (valgfri)
}

export class GridStrategy extends BaseStrategy {
  private gridConfig: GridConfig;
  private activeGrids: Map<
    string,
    {
      level: number;
      buyPrice: number;
      sellPrice: number;
      quantity: number;
      status: "empty" | "buy_placed" | "holding" | "sell_placed";
    }
  > = new Map();

  constructor(strategy: AutoTradingStrategy, gridConfig: GridConfig) {
    super(strategy);
    this.gridConfig = gridConfig;
  }

  /**
   * Analyze market for grid trading opportunities
   * Grid trading fungerer best i:
   * - Sidelengs markeder (litt volatilitet, ingen trend)
   * - Høy likviditet
   * - Lavt spread
   */
  async analyze(
    marketData: MarketData,
    indicators: TechnicalIndicators,
  ): Promise<TradingSignal | null> {
    const { symbol, price: currentPrice } = marketData;

    // Sjekk om markedet er egnet for grid trading
    const marketSuitability = this.assessMarketSuitability(
      marketData,
      indicators,
    );
    if (marketSuitability.score < 60) {
      return null; // Ikke egnet for grid trading
    }

    // Beregn grid-nivåer
    const volatility = this.calculateVolatility(marketData);
    const grids = this.calculateGridLevels(
      currentPrice,
      volatility,
      indicators,
    );

    // Finn hvilket nivå vi er på
    const currentGrid = grids.find(
      (g) => currentPrice >= g.buyPrice && currentPrice <= g.sellPrice,
    );

    if (!currentGrid) return null;

    // Sjekk om vi skal plassere en kjøpsordre på dette nivået
    const gridKey = `${symbol}_grid_${currentGrid.level}`;
    const existingGrid = this.activeGrids.get(gridKey);

    if (!existingGrid || existingGrid.status === "empty") {
      // Plasser kjøpsordre på dette nivået
      this.activeGrids.set(gridKey, {
        ...currentGrid,
        status: "buy_placed",
      });

      return this.createGridSignal(
        marketData,
        indicators,
        currentGrid,
        "Kjøper på grid-nivå " + currentGrid.level,
        marketSuitability.score,
      );
    }

    return null;
  }

  /**
   * Vurder om markedet er egnet for grid trading
   */
  private assessMarketSuitability(
    marketData: MarketData,
    indicators: TechnicalIndicators,
  ): { score: number; reasons: string[] } {
    let score = 0;
    const reasons: string[] = [];

    // 1. Volatilitet (30 poeng)
    // Grid trenger litt volatilitet, men ikke for mye
    const volatility = this.calculateVolatility(marketData);
    if (volatility >= 3 && volatility <= 15) {
      score += 30;
      reasons.push("God volatilitet for grid");
    } else if (volatility < 3) {
      score += 15;
      reasons.push("Lav volatilitet - redusert profittpotensial");
    } else {
      score += 10;
      reasons.push("Høy volatilitet - økt risiko");
    }

    // 2. RSI (25 poeng)
    // Grid fungerer best når RSI er nøytral (40-60)
    if (indicators.rsi && indicators.rsi >= 40 && indicators.rsi <= 60) {
      score += 25;
      reasons.push("Nøytral RSI - egnet for grid");
    } else if (indicators.rsi) {
      score += 10;
      reasons.push("RSI utenfor nøytralt område");
    }

    // 3. Trendstyrke (25 poeng)
    // Grid fungerer dårlig i sterke trender
    const sma20 = indicators.sma_20;
    const sma50 = indicators.sma_50;
    if (sma20 && sma50) {
      const trendStrength = Math.abs((sma20 - sma50) / sma50) * 100;
      if (trendStrength < 2) {
        score += 25;
        reasons.push("Sidelengs trend - perfekt for grid");
      } else if (trendStrength < 5) {
        score += 15;
        reasons.push("Svak trend - akseptabelt");
      } else {
        score += 5;
        reasons.push("Sterk trend - ikke ideelt");
      }
    }

    // 4. Volum (20 poeng)
    if (marketData.volume_24h > 10000000) {
      score += 20;
      reasons.push("God likviditet");
    } else if (marketData.volume_24h > 1000000) {
      score += 10;
      reasons.push("Tilstrekkelig likviditet");
    }

    return { score, reasons };
  }

  /*
   * Beregn grid-nivåer
   */
  private calculateGridLevels(
    currentPrice: number,
    volatility?: number,
    indicators?: TechnicalIndicators,
  ): Array<{
    level: number;
    buyPrice: number;
    sellPrice: number;
    quantity: number;
  }> {
    let { gridCount, gridRangePct, upperPrice, lowerPrice } = this.gridConfig;

    // PRO REFINEMENT: Auto-Range med Bollinger Bands
    if (
      (this.strategy.risk_level === "dynamic" ||
        this.strategy.risk_level === "balanced") &&
      indicators?.bollinger
    ) {
      upperPrice = indicators.bollinger.upper;
      lowerPrice = indicators.bollinger.lower;
    } else if (
      this.strategy.risk_level === "dynamic" ||
      this.strategy.risk_level === "aggressive"
    ) {
      // Fallback til 24t volatilitet
      const vol = volatility || 5;
      gridRangePct = Math.max(vol * 1.5, 5);
    }

    // Bruk manuelle priser hvis angitt, ellers beregn fra current price
    const upper = upperPrice || currentPrice * (1 + gridRangePct / 100 / 2);
    const lower = lowerPrice || currentPrice * (1 - gridRangePct / 100 / 2);

    const gridSize = (upper - lower) / gridCount;
    const grids = [];

    for (let i = 0; i < gridCount; i++) {
      const levelLower = lower + gridSize * i;
      const levelUpper = levelLower + gridSize;

      grids.push({
        level: i,
        buyPrice: levelLower,
        sellPrice: levelUpper,
        quantity: 0, // Beregnes senere basert på kapital
      });
    }

    return grids;
  }

  /**
   * Create grid trading signal
   */
  private createGridSignal(
    marketData: MarketData,
    indicators: TechnicalIndicators,
    grid: {
      level: number;
      buyPrice: number;
      sellPrice: number;
      quantity: number;
    },
    reason: string,
    confidence: number,
  ): TradingSignal {
    const baseSignal = this.createSignal(
      marketData,
      indicators,
      "LONG", // Grid trading er alltid LONG-basert (kjøp lavt, selg høyt)
      confidence,
      reason,
    );

    // Grid trading har ingen tradisjonell stop-loss
    // Isteden har vi "grid reset" hvis prisen går utenfor range
    return {
      ...baseSignal,
      stop_loss_price: grid.buyPrice * 0.95, // Nødstop hvis 5% under grid
      take_profit_price: grid.sellPrice,
      position_size_pct:
        this.strategy.max_position_size_pct / this.gridConfig.gridCount,
      // Grid-spesifikk konfig
      trailing_stop: {
        enabled: false,
        activation_pct: 0,
        distance_pct: 0,
      },
      partial_tp_levels: [], // Grid selger på fast nivå
    };
  }

  /**
   * Get grid configuration for risk level
   */
  static getGridConfig(riskLevel: string): GridConfig {
    const configs: Record<string, GridConfig> = {
      conservative: {
        gridCount: 5,
        gridRangePct: 10, // ±5%
      },
      balanced: {
        gridCount: 10,
        gridRangePct: 20, // ±10%
      },
      aggressive: {
        gridCount: 20,
        gridRangePct: 30, // ±15%
      },
      dynamic: {
        gridCount: 15,
        gridRangePct: 25, // AI justerer dynamisk
      },
    };

    return configs[riskLevel] || configs["balanced"];
  }
}
