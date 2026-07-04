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

function buildInput(
  closePrice: number,
  highestPrice?: number,
): StrategyInput {
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
