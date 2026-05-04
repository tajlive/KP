import { describe, it, expect } from "vitest";
import { extractFeaturesFromCandles } from "../tick-features";
import type { Candle } from "../../strategies/types";

function makeCandles(n: number, trend: "up" | "down" | "sideways" | "volatile"): Candle[] {
  const candles: Candle[] = [];
  let price = 50000;
  for (let i = 0; i < n; i++) {
    let change = 0;
    switch (trend) {
      case "up":
        change = Math.random() * 200 + 50;
        break;
      case "down":
        change = -(Math.random() * 200 + 50);
        break;
      case "sideways":
        change = (Math.random() - 0.5) * 100;
        break;
      case "volatile":
        change = (Math.random() - 0.5) * 2000;
        break;
    }
    price += change;
    const high = price + Math.abs(change) * 0.5;
    const low = price - Math.abs(change) * 0.5;
    candles.push({
      time: Date.now() - (n - i) * 3600_000,
      open: price - change * 0.3,
      high,
      low,
      close: price,
      volume: 1000 + Math.random() * 5000,
    });
  }
  return candles;
}

describe("extractFeaturesFromCandles", () => {
  it("returns neutral features for < 30 candles", () => {
    const candles = makeCandles(10, "sideways");
    const f = extractFeaturesFromCandles(candles);
    expect(f.adx).toBe(15);
    expect(f.rsi).toBe(50);
  });

  it("detects bullish trend (ADX > 25, EMA20 > EMA50)", () => {
    const candles = makeCandles(100, "up");
    const f = extractFeaturesFromCandles(candles);
    expect(f.adx).toBeGreaterThan(20);
    expect(f.ema20Slope).toBeGreaterThan(0);
    expect(f.diPlus).toBe(1);
    expect(f.diMinus).toBe(0);
  });

  it("detects bearish trend (ADX > 25, EMA20 < EMA50)", () => {
    const candles = makeCandles(100, "down");
    const f = extractFeaturesFromCandles(candles);
    expect(f.adx).toBeGreaterThan(20);
    expect(f.ema20Slope).toBeLessThan(0);
    expect(f.diPlus).toBe(0);
    expect(f.diMinus).toBe(1);
  });

  it("measures volatility correctly", () => {
    const calm = makeCandles(100, "sideways");
    const volatile = makeCandles(100, "volatile");

    const fCalm = extractFeaturesFromCandles(calm);
    const fVolatile = extractFeaturesFromCandles(volatile);

    expect(fVolatile.atrPercent).toBeGreaterThan(fCalm.atrPercent);
    expect(fVolatile.historicalVol).toBeGreaterThan(fCalm.historicalVol);
  });

  it("calculates RSI in valid range", () => {
    const candles = makeCandles(100, "sideways");
    const f = extractFeaturesFromCandles(candles);
    expect(f.rsi).toBeGreaterThanOrEqual(0);
    expect(f.rsi).toBeLessThanOrEqual(100);
  });
});
