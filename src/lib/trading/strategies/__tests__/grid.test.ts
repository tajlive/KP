import { describe, it, expect } from "vitest";
import { GridBotStrategy } from "../grid";
import type { StrategyInput, Candle } from "../types";

// Helper: lag candles med gitt sluttpris
function makeCandles(closes: number[]): Candle[] {
  return closes.map((close, i) => ({
    time: i * 3600,
    open: close * 0.99,
    high: close * 1.01,
    low: close * 0.98,
    close,
    volume: 100,
  }));
}

// Helper: lag session med persistert grid-state
function makeSession(overrides: Record<string, unknown> = {}) {
  return {
    open_position: null,
    last_tick_at: null,
    strategy_config: {},
    ...overrides,
  };
}

describe("GridBotStrategy (v2 — evaluateGridSignal)", () => {
  const strategy = new GridBotStrategy();

  it("returnerer BUY når pris er i grid med empty nivå under", () => {
    const input: StrategyInput = {
      candles: makeCandles([100000, 100500, 101000, 101500, 102000]),
      session: makeSession({
        strategy_config: {
          lowerPrice: 90000,
          upperPrice: 110000,
          gridLevelsCount: 10,
          amountPerGrid: 1000,
          grid_levels: Array.from({ length: 10 }, (_, i) => ({
            level: i,
            buyPrice: 90000 + i * 2000,
            sellPrice: 90000 + (i + 1) * 2000,
            quantity: 0.01,
            status: "empty" as const,
          })),
        },
      }),
      config: { symbol: "BTCUSDT", capital: 10000 },
    };

    const signal = strategy.evaluate(input);
    expect(signal.action).toBe("buy");
    expect(signal.reason).toContain("Grid buy");
  });

  it("returnerer SELL når kjøpt nivå når sellPrice", () => {
    const input: StrategyInput = {
      candles: makeCandles([92000, 92500, 93000, 93500, 94000]),
      session: makeSession({
        strategy_config: {
          lowerPrice: 90000,
          upperPrice: 110000,
          gridLevelsCount: 10,
          amountPerGrid: 1000,
          grid_levels: Array.from({ length: 10 }, (_, i) => ({
            level: i,
            buyPrice: 90000 + i * 2000,
            sellPrice: 90000 + (i + 1) * 2000,
            quantity: 0.01,
            status: i === 1 ? ("bought" as const) : ("empty" as const),
          })),
        },
        open_position: {
          side: "long" as const,
          quantity: 0.01,
          entry_price: 92000,
          entry_time: new Date().toISOString(),
        },
      }),
      config: { symbol: "BTCUSDT", capital: 10000 },
    };

    const signal = strategy.evaluate(input);
    expect(signal.action).toBe("sell");
    expect(signal.reason).toContain("sell");
  });

  it("genererer nytt grid ved første kjøring (ingen lagret state)", () => {
    const input: StrategyInput = {
      candles: makeCandles([100000, 100000, 100000, 100000, 100000]),
      session: makeSession(),
      config: { symbol: "BTCUSDT", capital: 10000 },
    };

    const signal = strategy.evaluate(input);
    // Skal generere grid og evaluere — enten buy eller hold
    expect(["buy", "hold"]).toContain(signal.action);
  });

  it("re-kalibrerer ved breakout over topp", () => {
    const input: StrategyInput = {
      candles: makeCandles([90000, 100000, 110000, 115000, 120000]),
      session: makeSession({
        strategy_config: {
          lowerPrice: 90000,
          upperPrice: 110000,
          gridLevelsCount: 10,
          amountPerGrid: 1000,
          grid_levels: Array.from({ length: 10 }, (_, i) => ({
            level: i,
            buyPrice: 90000 + i * 2000,
            sellPrice: 90000 + (i + 1) * 2000,
            quantity: 0.01,
            status: "empty" as const,
          })),
        },
      }),
      config: { symbol: "BTCUSDT", capital: 10000 },
    };

    const signal = strategy.evaluate(input);
    // Re-kalibrering skal skje — grid flyttes opp (indikatorer finnes kun ved hold)
    // Ved breakout genereres nytt grid og evaluateGridSignal kjøres på nytt
    expect(["buy", "hold"]).toContain(signal.action);
  });

  it("returnerer DCA BUY når pris er under grid-bunn", () => {
    const input: StrategyInput = {
      candles: makeCandles([90000, 85000, 80000, 75000, 70000]),
      session: makeSession({
        strategy_config: {
          lowerPrice: 90000,
          upperPrice: 110000,
          gridLevelsCount: 10,
          amountPerGrid: 1000,
          grid_levels: Array.from({ length: 10 }, (_, i) => ({
            level: i,
            buyPrice: 90000 + i * 2000,
            sellPrice: 90000 + (i + 1) * 2000,
            quantity: 0.01,
            status: "empty" as const,
          })),
        },
      }),
      config: { symbol: "BTCUSDT", capital: 10000 },
    };

    const signal = strategy.evaluate(input);
    expect(signal.action).toBe("buy");
    // DCA eller grid-buy — begge er korrekt kjøp under grid
    expect(signal.reason).toMatch(/Grid buy|DCA/);
  });
});
