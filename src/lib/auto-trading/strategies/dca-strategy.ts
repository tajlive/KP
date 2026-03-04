/**
 * DCA (Dollar Cost Averaging) Strategy
 * Den mest beviselig lønnsomme strategien for langsiktige investorer
 * Smart DCA: kjøp MER når prisen faller, MINDRE når den stiger
 */

import type { AutoTradingStrategy, TradingSignal } from "../types";
import {
  BaseStrategy,
  type MarketData,
  type TechnicalIndicators,
} from "./base-strategy";

export interface DCAConfig {
  interval: "daily" | "weekly" | "monthly";
  baseAmount: number; // Base beløp (f.eks. 500 kr)
  smartDCA: boolean; // Aktiver smart DCA
  rsiOversoldMultiplier: number; // Multiplikator ved RSI < 30 (f.eks. 2x)
  maxMultiplier: number; // Maks multiplikator (f.eks. 3x)
  targetSymbols: string[]; // Hvilke coins å DCA i
  allocation: Record<string, number>; // Allokering per coin (f.eks. {BTC: 0.5, ETH: 0.5})
}

export class DCAStrategy extends BaseStrategy {
  private dcaConfig: DCAConfig;
  private lastDCADates: Map<string, Date> = new Map();

  constructor(strategy: AutoTradingStrategy, dcaConfig: DCAConfig) {
    super(strategy);
    this.dcaConfig = dcaConfig;
  }

  /**
   * Analyze market for DCA opportunity
   * DCA er ikke avhengig av teknisk analyse - det er tidbasert
   * Men vi bruker Smart DCA for å optimalisere timing
   */
  async analyze(
    marketData: MarketData,
    indicators: TechnicalIndicators,
  ): Promise<TradingSignal | null> {
    const { symbol } = marketData;

    // Sjekk om det er på tide for DCA
    if (!this.shouldExecuteDCA(symbol)) {
      return null;
    }

    // Beregn Smart DCA multiplikator
    const multiplier = this.calculateSmartDCAMultiplier(indicators);
    const amount = this.dcaConfig.baseAmount * multiplier;

    // Oppdater siste DCA dato
    this.lastDCADates.set(symbol, new Date());

    return this.createDCASignal(marketData, indicators, amount, multiplier);
  }

  /**
   * Sjekk om det er på tide å kjøre DCA
   */
  private shouldExecuteDCA(symbol: string): boolean {
    const lastDate = this.lastDCADates.get(symbol);
    if (!lastDate) return true;

    const now = new Date();
    const hoursSinceLastDCA =
      (now.getTime() - lastDate.getTime()) / (1000 * 60 * 60);

    switch (this.dcaConfig.interval) {
      case "daily":
        return hoursSinceLastDCA >= 24;
      case "weekly":
        return hoursSinceLastDCA >= 24 * 7;
      case "monthly":
        return hoursSinceLastDCA >= 24 * 30;
      default:
        return hoursSinceLastDCA >= 24;
    }
  }

  /**
   * Beregn Smart DCA multiplikator
   * Kjøp mer når:
   * - RSI er lav (oversold)
   * - Prisen har falt mye siste 24h
   * - Høy volatilitet (dyp kjøpsmulighet)
   */
  private calculateSmartDCAMultiplier(indicators: TechnicalIndicators): number {
    if (!this.dcaConfig.smartDCA) return 1;

    let multiplier = 1;
    const { rsiOversoldMultiplier, maxMultiplier } = this.dcaConfig;

    // RSI-basert multiplikator (PRO REFINEMENT)
    if (indicators.rsi !== undefined) {
      if (indicators.rsi < 20) {
        multiplier = rsiOversoldMultiplier * 2.0; // Aggressivt kjøp ved ekstrem frykt
      } else if (indicators.rsi < 30) {
        multiplier = rsiOversoldMultiplier; // Standard oversold
      } else if (indicators.rsi > 80) {
        multiplier = 0.2; // Spar på kruttet ved ekstrem grådighet
      } else if (indicators.rsi > 70) {
        multiplier = 0.5; // Forsiktig ved overbought
      }
    }

    // Volatilitet-basert boost (PRO REFINEMENT)
    // Hvis volatilitet er høy og pris faller -> dypere "wick" å fange
    // (Dette krever 24h endring som vi har i MarketData, men her er vi i indicators)

    // Cap multiplikatoren
    return Math.min(multiplier, maxMultiplier);
  }

  /**
   * Create DCA trading signal
   */
  private createDCASignal(
    marketData: MarketData,
    indicators: TechnicalIndicators,
    amount: number,
    multiplier: number,
  ): TradingSignal {
    const entryPrice = marketData.price;

    // DCA har ingen stop-loss (langsiktig hold)
    // Men vi setter en "nødstop" ekstremt lavt
    const emergencyStop = entryPrice * 0.5; // 50% under (ekstremt sjeldent trigget)

    // Ingen take-profit (akkumulering)

    const volatility = this.calculateVolatility(marketData);
    const riskScore = this.calculateRiskScore(marketData, indicators);

    // Beregn posisjonsstørrelse basert på beløp
    const positionSizePct = (amount / 100000) * 100; // Antar 100k total kapital

    return {
      symbol: marketData.symbol,
      side: "LONG",
      confidence: 90, // DCA er alltid høy konfidens (tid i markedet > timing)
      entry_price: entryPrice,
      stop_loss_price: emergencyStop,
      position_size_pct: Math.min(
        positionSizePct,
        this.strategy.max_position_size_pct,
      ),
      leverage: 1, // Aldri leverage på DCA
      risk_score: riskScore,
      market_volatility_pct: volatility,
      reason: `Smart DCA: ${multiplier}x multiplikator basert på RSI ${indicators.rsi?.toFixed(0) || "N/A"}`,
      trailing_stop: {
        enabled: false,
        activation_pct: 0,
        distance_pct: 0,
      },
      partial_tp_levels: [], // Aldri selge DCA automatisk
    };
  }

  /**
   * Get DCA allocation for portfolio
   */
  getAllocation(): Record<string, number> {
    return this.dcaConfig.allocation;
  }

  /**
   * Get DCA configuration for risk level
   */
  static getDCAConfig(riskLevel: string, capital: number): DCAConfig {
    const baseConfigs: Record<string, Omit<DCAConfig, "baseAmount">> = {
      conservative: {
        interval: "weekly",
        smartDCA: true,
        rsiOversoldMultiplier: 1.5,
        maxMultiplier: 2,
        targetSymbols: ["BTCUSDT", "ETHUSDT"],
        allocation: { BTCUSDT: 0.6, ETHUSDT: 0.4 },
      },
      balanced: {
        interval: "daily",
        smartDCA: true,
        rsiOversoldMultiplier: 2,
        maxMultiplier: 3,
        targetSymbols: ["BTCUSDT", "ETHUSDT", "SOLUSDT", "BNBUSDT", "ADAUSDT"],
        allocation: {
          BTCUSDT: 0.4,
          ETHUSDT: 0.3,
          SOLUSDT: 0.15,
          BNBUSDT: 0.1,
          ADAUSDT: 0.05,
        },
      },
      aggressive: {
        interval: "daily",
        smartDCA: true,
        rsiOversoldMultiplier: 2.5,
        maxMultiplier: 4,
        targetSymbols: [
          "BTCUSDT",
          "ETHUSDT",
          "SOLUSDT",
          "AVAXUSDT",
          "DOTUSDT",
          "LINKUSDT",
          "MATICUSDT",
        ],
        allocation: {
          BTCUSDT: 0.25,
          ETHUSDT: 0.25,
          SOLUSDT: 0.15,
          AVAXUSDT: 0.12,
          DOTUSDT: 0.1,
          LINKUSDT: 0.08,
          MATICUSDT: 0.05,
        },
      },
      dynamic: {
        interval: "daily",
        smartDCA: true,
        rsiOversoldMultiplier: 2,
        maxMultiplier: 3,
        targetSymbols: ["BTCUSDT", "ETHUSDT", "SOLUSDT", "BNBUSDT", "ADAUSDT"],
        allocation: {
          BTCUSDT: 0.35,
          ETHUSDT: 0.3,
          SOLUSDT: 0.2,
          BNBUSDT: 0.1,
          ADAUSDT: 0.05,
        },
      },
    };

    const config = baseConfigs[riskLevel] || baseConfigs["balanced"];

    // Beregn baseAmount basert på kapital og intervall
    const intervalsPerMonth =
      config.interval === "daily" ? 30 : config.interval === "weekly" ? 4 : 1;
    const monthlyAllocation = capital * 0.05; // 5% av kapital per måned
    const baseAmount = monthlyAllocation / intervalsPerMonth;

    return {
      ...config,
      baseAmount,
    };
  }
}
