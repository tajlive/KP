import { describe, it, expect } from "vitest";
import { generateJokerSignal, type MarketData } from "../signal";

const neutralMarket: MarketData = {
  currentPrice: 50000,
  rsi: 50,
  macd: { histogram: 0, signal: 0, macd: 0 },
  bollinger: { upper: 55000, middle: 50000, lower: 45000 },
  sma10: 50000,
  sma30: 50000,
  volatility: 50,
  trend: "flat",
};

describe("generateJokerSignal", () => {
  it("RSI oversold + MACD bullish → BUY med høy confidence", () => {
    const market: MarketData = {
      ...neutralMarket,
      rsi: 25,
      macd: { histogram: 1.5, signal: 0.5, macd: 1.0 },
      sma10: 51000,
      sma30: 49000,
      trend: "up",
    };
    const result = generateJokerSignal(market);
    expect(result.action).toBe("BUY");
    // RSI oversold (+25) + MACD bullish + smaBullish (+20) = 50+25+20 = 95
    // SMA10 > SMA30 + trend up (+10) = 95+10 = 105, clamped to 99
    expect(result.confidence).toBeGreaterThanOrEqual(90);
    expect(result.reason).toContain("oversolgt");
  });

  it("RSI overkjøpt + MACD bearish → SELL med høy confidence", () => {
    const market: MarketData = {
      ...neutralMarket,
      rsi: 75,
      macd: { histogram: -1.5, signal: -0.5, macd: -1.0 },
      sma10: 49000,
      sma30: 51000,
      trend: "down",
    };
    const result = generateJokerSignal(market);
    expect(result.action).toBe("SELL");
    // RSI overkjøpt (-25) + MACD bearish + smaBearish (-20) = 50-25-20 = 5
    // SMA10 < SMA30 + trend down (-10) = 5-10 = -5, clamped to 0
    expect(result.confidence).toBeLessThanOrEqual(10);
    expect(result.reason).toContain("overkjøpt");
  });

  it("pris under Bollinger lower → BUY", () => {
    const market: MarketData = {
      ...neutralMarket,
      currentPrice: 44000,
      bollinger: { upper: 55000, middle: 50000, lower: 45000 },
    };
    const result = generateJokerSignal(market);
    expect(result.action).toBe("BUY");
    // RSI nøytral (+0) + MACD nøytral (+0) + belowLowerBand (+15) = 65
    expect(result.confidence).toBeGreaterThanOrEqual(60);
    expect(result.reason).toContain("Bollinger");
  });

  it("pris over Bollinger upper → SELL", () => {
    const market: MarketData = {
      ...neutralMarket,
      currentPrice: 56000,
      bollinger: { upper: 55000, middle: 50000, lower: 45000 },
    };
    const result = generateJokerSignal(market);
    expect(result.action).toBe("SELL");
    // RSI nøytral (+0) + MACD nøytral (+0) + aboveUpperBand (-15) = 35
    expect(result.confidence).toBeLessThanOrEqual(40);
    expect(result.reason).toContain("Bollinger");
  });

  it("SMA10 > SMA30 i opptrend → BUY signal", () => {
    const market: MarketData = {
      ...neutralMarket,
      macd: { histogram: 1.0, signal: 0.3, macd: 0.7 },
      sma10: 51000,
      sma30: 49000,
      trend: "up",
    };
    const result = generateJokerSignal(market);
    expect(result.action).toBe("BUY");
    // RSI nøytral (50) (+0) + MACD bullish + smaBullish (+20)
    // + SMA10 > SMA30 + trend up (+10) = 50+20+10 = 80
    expect(result.confidence).toBeGreaterThanOrEqual(75);
    expect(result.reason).toContain("SMA10");
  });

  it("nøytral RSI + nøytral MACD → WAIT", () => {
    const result = generateJokerSignal(neutralMarket);
    expect(result.action).toBe("WAIT");
    // 50 — ingen signaler trigger, vol=50 gir volDiscount=0
    expect(result.confidence).toBe(50);
    expect(result.reason).toContain("nøytral");
  });

  it("win multiplier booster confidence", () => {
    const market: MarketData = {
      ...neutralMarket,
      rsi: 55,
      macd: { histogram: 1.0, signal: 0.3, macd: 0.7 },
      sma10: 49000,
      sma30: 51000, // smaBearish (MACD bullish + !smaBullish = +10)
    };
    // Base: 50 + RSI moderat bullish (+10) + MACD bullish + SMA bearish (+10) = 70
    const normal = generateJokerSignal(market, 1.0);
    expect(normal.confidence).toBe(70);

    const boosted = generateJokerSignal(market, 1.3);
    // Math.round(70 * 1.3) = 91
    expect(boosted.confidence).toBe(91);
    expect(boosted.confidence).toBeGreaterThan(normal.confidence);
  });

  it("win multiplier reduserer confidence", () => {
    const market: MarketData = {
      ...neutralMarket,
      rsi: 55,
      macd: { histogram: 1.0, signal: 0.3, macd: 0.7 },
      sma10: 49000,
      sma30: 51000,
    };
    const normal = generateJokerSignal(market, 1.0);
    expect(normal.confidence).toBe(70);

    const reduced = generateJokerSignal(market, 0.7);
    // Math.round(70 * 0.7) = 49
    expect(reduced.confidence).toBe(49);
    expect(reduced.confidence).toBeLessThan(normal.confidence);
  });
});
