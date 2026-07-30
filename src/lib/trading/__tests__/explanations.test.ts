import { describe, it, expect } from "vitest";
import {
  buildTradeExplanation,
  getLearnMoreTitle,
  getPaperModeNotice,
  getTradeInlineExplanation,
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
      expect(result.whyBuy).toContain("85%");
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
      expect(result.whySell).toContain("Risikostyring");
      expect(result.whySell).toContain("tap");
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
      expect(result.whySell).toMatch(/2[\s\u00a0]000/);
      expect(result.whySell).toContain("sikret");
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
      
      expect(result.whySell).toContain("gevinst");
      expect(result.whySell).toMatch(/1[\s\u00a0]500/);
    });

    it("bruker fallback for ukjent exit-reason", () => {
      const trade: TradeForExplanation = {
        side: "sell",
        mode: "live",
        realized_pnl: null,
        exit_reason: "unknown_reason",
      };
      
      const result = buildTradeExplanation(trade, null, "no");
      
      expect(result.whySell).toContain("lukket");
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

describe("getTradeInlineExplanation", () => {
  describe("for kjøp", () => {
    it("viser RSI og konfidens når data finnes", () => {
      const trade: TradeForExplanation = {
        side: "buy",
        mode: "paper",
        realized_pnl: null,
        strategy_signal: { rsi: 28, confidence: 82 },
      };

      const result = getTradeInlineExplanation(trade, "no");

      expect(result).toContain("RSI: 28");
      expect(result).toContain("underkjøpt");
      expect(result).toContain("Konfidens: 82%");
    });

    it("viser RSI overkjøpt når rsi > 70", () => {
      const trade: TradeForExplanation = {
        side: "buy",
        mode: "paper",
        realized_pnl: null,
        strategy_signal: { rsi: 78, confidence: 95 },
      };

      const result = getTradeInlineExplanation(trade, "no");

      expect(result).toContain("RSI: 78");
      expect(result).toContain("overkjøpt");
      expect(result).toContain("Konfidens: 95%");
    });

    it("viser tom streng når strategy_signal mangler", () => {
      const trade: TradeForExplanation = {
        side: "buy",
        mode: "paper",
        realized_pnl: null,
        strategy_signal: null,
      };

      const result = getTradeInlineExplanation(trade, "no");

      expect(result).toBe("");
    });

    it("viser SMA-kontekst når sma20 og sma50 finnes", () => {
      const trade: TradeForExplanation = {
        side: "buy",
        mode: "paper",
        realized_pnl: null,
        strategy_signal: { rsi: 45, sma20: 52000, sma50: 50000, confidence: 70 },
      };

      const result = getTradeInlineExplanation(trade, "no");

      expect(result).toContain("RSI: 45");
      expect(result).toContain("SMA20");
      expect(result).toContain("over SMA50");
      expect(result).toContain("Konfidens: 70%");
    });
  });

  describe("for salg", () => {
    it("viser Stoploss med negativ PnL", () => {
      const trade: TradeForExplanation = {
        side: "sell",
        mode: "live",
        realized_pnl: -274,
        exit_reason: "stoploss",
      };

      const result = getTradeInlineExplanation(trade, "no");

      expect(result).toContain("Stoploss");
      expect(result).toContain("274");
      expect(result).toContain("kr");
    });

    it("viser Tok gevinst med positiv PnL", () => {
      const trade: TradeForExplanation = {
        side: "sell",
        mode: "live",
        realized_pnl: 1500,
        exit_reason: "take_profit",
      };

      const result = getTradeInlineExplanation(trade, "no");

      expect(result).toContain("Tok gevinst");
      expect(result).toContain("500");
    });

    it("viser Manuell for manuelle salg", () => {
      const trade: TradeForExplanation = {
        side: "sell",
        mode: "live",
        realized_pnl: 500,
        exit_reason: "manual",
      };

      const result = getTradeInlineExplanation(trade, "no");

      expect(result).toContain("Manuell");
    });

    it("viser Stoploss når PnL er negativ uten exit_reason (inferens)", () => {
      const trade: TradeForExplanation = {
        side: "sell",
        mode: "live",
        realized_pnl: -500,
      };

      const result = getTradeInlineExplanation(trade, "no");

      expect(result).toContain("Stoploss");
      expect(result).toContain("500");
      expect(result).toContain("kr");
    });

    it("viser Signal snudd for signal_reverse", () => {
      const trade: TradeForExplanation = {
        side: "sell",
        mode: "live",
        realized_pnl: 300,
        exit_reason: "signal_reverse",
      };

      const result = getTradeInlineExplanation(trade, "no");

      expect(result).toContain("Signal snudd");
    });
  });
});
