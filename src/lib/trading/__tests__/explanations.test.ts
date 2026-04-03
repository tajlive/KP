import { describe, it, expect } from "vitest";
import {
  buildTradeExplanation,
  getLearnMoreTitle,
  getPaperModeNotice,
  type TradeForExplanation,
  type AiDecision,
} from "../explanations";

describe("buildTradeExplanation", () => {
  describe("whyBuy forklaringer", () => {
    it("forklarer DCA-strategi korrekt", () => {
      const trade: TradeForExplanation = {
        side: "buy",
        mode: "paper",
        realized_pnl: null,
        strategy_signal: { strategy_type: "dca_smart" },
      };
      
      const result = buildTradeExplanation(trade, null, "no");
      
      expect(result.whyBuy).toContain("Smart DCA");
      expect(result.whyBuy).toContain("kjøpe litt og litt");
      expect(result.learnMoreKey).toBe("dca_smart");
    });

    it("forklarer grid-trading korrekt", () => {
      const trade: TradeForExplanation = {
        side: "buy",
        mode: "live",
        realized_pnl: null,
        strategy_signal: { strategy_type: "grid_bot" },
      };
      
      const result = buildTradeExplanation(trade, null, "no");
      
      expect(result.whyBuy).toContain("grid");
      expect(result.whyBuy).toContain("kjøper automatisk");
      expect(result.learnMoreKey).toBe("grid_trading");
    });

    it("forklarer SMA-crossover korrekt", () => {
      const trade: TradeForExplanation = {
        side: "buy",
        mode: "paper",
        realized_pnl: null,
        strategy_signal: { strategy_type: "sma_crossover" },
      };
      
      const result = buildTradeExplanation(trade, null, "no");
      
      expect(result.whyBuy).toContain("trenden krysset");
    });

    it("bruker AI confidence for fallback forklaring", () => {
      const trade: TradeForExplanation = {
        side: "buy",
        mode: "paper",
        realized_pnl: null,
        strategy_signal: {},
      };
      
      const decision: AiDecision = {
        decision_type: "BUY",
        sentiment_confidence: 0.85,
      };
      
      const result = buildTradeExplanation(trade, decision, "no");
      
      expect(result.whyBuy).toContain("sterke positive signaler");
      expect(result.whyBuy).toContain("Konfidensen var høy");
    });

    it("bruker engelsk når locale er en", () => {
      const trade: TradeForExplanation = {
        side: "buy",
        mode: "paper",
        realized_pnl: null,
        strategy_signal: { strategy_type: "dca_smart" },
      };
      
      const result = buildTradeExplanation(trade, null, "en");
      
      expect(result.whyBuy).toContain("Smart DCA");
      expect(result.whyBuy).toContain("buying phase");
    });
  });

  describe("whySell forklaringer", () => {
    it("forklarer stoploss med betydelig tap", () => {
      const trade: TradeForExplanation = {
        side: "sell",
        mode: "live",
        realized_pnl: -1000,
        exit_reason: "stoploss",
      };
      
      const result = buildTradeExplanation(trade, null, "no");
      
      expect(result.whySell).toContain("stoploss-grensen");
      expect(result.whySell).toContain("risikostyring");
      expect(result.whySell).toContain("kontrollert tap");
    });

    it("forklarer stoploss med lite tap kortfattet", () => {
      const trade: TradeForExplanation = {
        side: "sell",
        mode: "live",
        realized_pnl: -100,
        exit_reason: "stoploss",
      };
      
      const result = buildTradeExplanation(trade, null, "no");
      
      expect(result.whySell).toContain("stoploss");
      expect(result.whySell).toContain("kapitalen");
    });

    it("forklarer take profit", () => {
      const trade: TradeForExplanation = {
        side: "sell",
        mode: "live",
        realized_pnl: 2000,
        exit_reason: "take_profit",
      };
      
      const result = buildTradeExplanation(trade, null, "no");
      
      expect(result.whySell).toContain("målprisen");
      expect(result.whySell).toContain("take profit");
      expect(result.whySell).toContain("sikret gevinsten");
    });

    it("forklarer manuelt salg", () => {
      const trade: TradeForExplanation = {
        side: "sell",
        mode: "live",
        realized_pnl: 500,
        exit_reason: "manual",
      };
      
      const result = buildTradeExplanation(trade, null, "no");
      
      expect(result.whySell).toContain("manuelt");
      expect(result.whySell).toContain("full kontroll");
    });

    it("viser gevinstbeløp ved positiv PnL uten spesifikk exit-reason", () => {
      const trade: TradeForExplanation = {
        side: "sell",
        mode: "live",
        realized_pnl: 1500,
        exit_reason: "other",
      };
      
      const result = buildTradeExplanation(trade, null, "no");
      
      expect(result.whySell).toContain("1");
      expect(result.whySell).toContain("500");
      expect(result.whySell).toContain("gevinst");
    });

    it("bruker fallback for ukjent exit-reason", () => {
      const trade: TradeForExplanation = {
        side: "sell",
        mode: "live",
        realized_pnl: null,
        exit_reason: "unknown_reason",
      };
      
      const result = buildTradeExplanation(trade, null, "no");
      
      expect(result.whySell).toContain("lukket basert på");
    });
  });

  describe("læringsressurser", () => {
    it("returnerer riktig URL for DCA", () => {
      const trade: TradeForExplanation = {
        side: "buy",
        mode: "paper",
        realized_pnl: null,
        strategy_signal: { strategy_type: "dca_smart" },
      };
      
      const result = buildTradeExplanation(trade, null, "no");
      
      expect(result.learnMoreUrl).toBe("/kurs/trading-strategier/leksjon/smart-dca");
    });

    it("returnerer riktig URL for grid trading", () => {
      const trade: TradeForExplanation = {
        side: "buy",
        mode: "paper",
        realized_pnl: null,
        strategy_signal: { strategy_type: "grid_trading" },
      };
      
      const result = buildTradeExplanation(trade, null, "no");
      
      expect(result.learnMoreUrl).toBe("/kurs/trading-strategier/leksjon/grid-trading");
    });

    it("prioriterer stoploss-læring ved tap med stoploss", () => {
      const trade: TradeForExplanation = {
        side: "sell",
        mode: "live",
        realized_pnl: -500,
        exit_reason: "stoploss",
        strategy_signal: { strategy_type: "dca_smart" },
      };
      
      const result = buildTradeExplanation(trade, null, "no");
      
      // Skal prioritere stoploss-læring fremfor strategi-læring
      expect(result.learnMoreKey).toBe("stoploss");
      expect(result.learnMoreUrl).toBe("/leksjon/hva-er-stop-loss");
    });

    it("returnerer engelsk URL når locale er en", () => {
      const trade: TradeForExplanation = {
        side: "buy",
        mode: "paper",
        realized_pnl: null,
        strategy_signal: { strategy_type: "dca_smart" },
      };
      
      const result = buildTradeExplanation(trade, null, "en");
      
      expect(result.learnMoreUrl).toContain("/en/");
    });
  });

  describe("strategi-nøkkel utledning", () => {
    it("gjenkjenner DCA fra forskjellige felt", () => {
      const testCases = [
        { strategy_type: "dca_smart" },
        { strategy_key: "dollar_cost_averaging" },
        { name: "Smart DCA Strategy" },
        { type: "dca" },
      ];

      testCases.forEach((signal) => {
        const trade: TradeForExplanation = {
          side: "buy",
          mode: "paper",
          realized_pnl: null,
          strategy_signal: signal,
        };
        
        const result = buildTradeExplanation(trade, null, "no");
        expect(result.learnMoreKey).toBe("dca_smart");
      });
    });

    it("gjenkjenner grid fra forskjellige felt", () => {
      const testCases = [
        { strategy_type: "grid_bot" },
        { strategy_key: "grid_trading" },
        { name: "Grid Strategy" },
      ];

      testCases.forEach((signal) => {
        const trade: TradeForExplanation = {
          side: "buy",
          mode: "paper",
          realized_pnl: null,
          strategy_signal: signal,
        };
        
        const result = buildTradeExplanation(trade, null, "no");
        expect(result.learnMoreKey).toBe("grid_trading");
      });
    });

    it("fallback til sentiment_based når ingen signal-info", () => {
      const trade: TradeForExplanation = {
        side: "buy",
        mode: "paper",
        realized_pnl: null,
        strategy_signal: null,
      };
      
      const result = buildTradeExplanation(trade, null, "no");
      expect(result.learnMoreKey).toBe("sentiment_based");
    });
  });
});

describe("getLearnMoreTitle", () => {
  it("returnerer norsk tittel for kjent nøkkel", () => {
    expect(getLearnMoreTitle("dca_smart", "no")).toContain("Smart DCA");
  });

  it("returnerer tom streng for ukjent nøkkel", () => {
    expect(getLearnMoreTitle("unknown_key", "no")).toBe("");
  });

  it("returnerer tom streng for undefined", () => {
    expect(getLearnMoreTitle(undefined, "no")).toBe("");
  });
});

describe("getPaperModeNotice", () => {
  it("returnerer norsk tekst for paper mode", () => {
    expect(getPaperModeNotice("no")).toBe("Dette er en simulert handel (lekepenger). Ingen ekte penger er brukt.");
  });

  it("returnerer engelsk tekst for paper mode", () => {
    expect(getPaperModeNotice("en")).toBe("This is a simulated trade (paper trading). No real money was used.");
  });
});
