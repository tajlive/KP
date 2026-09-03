/**
 * Tests for DCA strategy trailing stop highest_price handling.
 */
import { describe, it, expect } from "vitest";
import { DCAStrategy } from "../dca";
import type { Candle, StrategyInput } from "../types";

function buildCandles(closePrice: number, count = 30): Candle[] {
  const candles: Candle[] = [];
  for (let i = 0; i < count; i++) {
    const base = 100 + i * 0.1; // gently rising baseline so ATR is stable
    const close = i === count - 1 ? closePrice : base;
    candles.push({
      time: Date.now() - (count - i) * 60_000,
      open: close * 0.99,
      high: close * 1.02,
      low: close * 0.98,
      close,
      volume: 1_000_000,
    });
  }
  return candles;
}

function buildInput(closePrice: number, highestPrice?: number): StrategyInput {
  const candles = buildCandles(closePrice);
  return {
    candles,
    session: {
      open_position: {
        side: "long",
        quantity: 1,
        entry_price: 100,
        entry_time: new Date(Date.now() - 60 * 60_000).toISOString(),
        highest_price: highestPrice,
      },
      last_tick_at: new Date(Date.now() - 2 * 60 * 60_000).toISOString(),
      strategy_config: {
        interval_minutes: 0, // bypass interval gate
      },
    },
    config: {
      use_trailing_stop: true,
      interval_minutes: 0,
      stop_loss_pct: -50, // far away so trailing stop dominates
    },
    currentTime: Date.now(),
  };
}

const strategy = new DCAStrategy();

describe("DCA Strategy — trailing stop highest_price fallback", () => {
  it("uses entry_price when highest_price is missing", () => {
    const input = buildInput(90); // 10% below entry, no highest_price set
    const signal = strategy.evaluate(input);
    expect(signal.action).toBe("sell");
    expect(signal.indicators?.trailing_stop).toBe(true);
    expect(signal.reason).toContain("Trailing stop");
  });

  it("uses entry_price when highest_price is 0", () => {
    const input = buildInput(90, 0);
    const signal = strategy.evaluate(input);
    expect(signal.action).toBe("sell");
    expect(signal.indicators?.trailing_stop).toBe(true);
  });

  it("uses the stored highest_price when it is valid and a drop triggers stop", () => {
    // highest_price=110, current=90 -> drop ~18.2%, ATR stop will be much smaller
    const input = buildInput(90, 110);
    const signal = strategy.evaluate(input);
    expect(signal.action).toBe("sell");
    expect(signal.indicators?.trailing_stop).toBe(true);
    expect(signal.indicators?.drop_from_peak).toBeGreaterThan(0);
  });

  it("holds when price is between entry and a valid highest_price without enough drop", () => {
    // highest_price=105, current=104 -> small drop, should not trigger ATR stop
    const input = buildInput(104, 105);
    const signal = strategy.evaluate(input);
    expect(signal.action).toBe("hold");
  });
});

// BUGFIX 2026-08-15: DCA interval-gaten målte «sist tick» (last_tick_at, som
// tick-motorens heartbeat oppdaterer hvert 5. min) i stedet for «sist kjøp».
// Resultat: DCA med interval_minutes > 5 ventet for alltid «235 min til».
describe("DCA Strategy — interval gate bruker sist kjøp, ikke heartbeat", () => {
  function buildNoPositionInput(opts: {
    lastBuyAt?: string;
    lastTickAt?: string;
    interval?: number;
  }): StrategyInput {
    const candles = buildCandles(100);
    return {
      candles,
      session: {
        open_position: null,
        last_tick_at: opts.lastTickAt ?? null,
        strategy_config: {
          interval_minutes: opts.interval ?? 240,
          last_buy_at: opts.lastBuyAt,
        },
      },
      config: {
        interval_minutes: opts.interval ?? 240,
      },
      currentTime: Date.now(),
    };
  }

  it("kjøper når sist kjøp er eldre enn interval (selv om heartbeat er fersk)", () => {
    const input = buildNoPositionInput({
      // last_buy_at er 5 timer gammelt → interval (4t) passert → skal kjøpe
      lastBuyAt: new Date(Date.now() - 5 * 60 * 60_000).toISOString(),
      // heartbeat er fersk (5 min siden) — denne må IGNORERES
      lastTickAt: new Date(Date.now() - 5 * 60_000).toISOString(),
    });
    const signal = strategy.evaluate(input);
    expect(signal.action).toBe("buy");
  });

  it("holder når sist kjøp er nyere enn interval", () => {
    const input = buildNoPositionInput({
      lastBuyAt: new Date(Date.now() - 1 * 60 * 60_000).toISOString(), // 1t siden
      lastTickAt: new Date(Date.now() - 5 * 60_000).toISOString(),
    });
    const signal = strategy.evaluate(input);
    expect(signal.action).toBe("hold");
    expect(signal.reason).toContain("Waiting");
  });

  it("kjøper umiddelbart når det aldri har vært et kjøp (ingen last_buy_at)", () => {
    const input = buildNoPositionInput({ lastBuyAt: undefined });
    const signal = strategy.evaluate(input);
    expect(signal.action).toBe("buy");
    expect(signal.indicators?.last_buy_at).toBeTruthy();
  });
});

// REGRESJON 2026-09-03: DCA-kjøp MÅ ha reason "DCA buy" så grid/DCA-unntaket
// i signal-guard + tick-adapter slår inn. Uten reason faller mekanisk DCA
// gjennom unntaket → Kelly-expectancy fra gamle tapende trades blokkerer
// ALLE kjøp for alltid (død sesjon, verifisert i prod DB: 6 blokkeringer/48t).
describe("DCA Strategy — buy-signal bærer 'DCA buy'-reason (guard-unntak)", () => {
  it("produserer reason som matcher grid/DCA-unntaket", () => {
    const candles = buildCandles(100);
    const input: StrategyInput = {
      candles,
      session: {
        open_position: null,
        last_tick_at: new Date(Date.now() - 5 * 60_000).toISOString(),
        strategy_config: {
          interval_minutes: 240,
          last_buy_at: new Date(Date.now() - 5 * 60 * 60_000).toISOString(),
        },
      },
      config: {
        interval_minutes: 240,
      },
      currentTime: Date.now(),
    };
    const signal = strategy.evaluate(input);
    expect(signal.action).toBe("buy");
    expect(signal.reason).toContain("DCA buy");
  });
});
