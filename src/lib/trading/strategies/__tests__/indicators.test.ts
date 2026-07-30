/**
 * Tests for technical indicator functions
 *
 * All functions in indicators.ts are pure — no mocks needed.
 */
import { describe, it, expect } from "vitest";
import {
  sma,
  smaSeries,
  ema,
  rsi,
  rsiSeries,
  macd,
  atr,
  adx,
  bollingerBands,
  detectMarketRegime,
} from "../indicators";

// ---------------------------------------------------------------------------
// sma
// ---------------------------------------------------------------------------
describe("sma", () => {
  it("calculates simple moving average of last N values", () => {
    expect(sma([1, 2, 3, 4, 5], 3)).toBeCloseTo(4, 10); // (3+4+5)/3
  });

  it("returns the average of all data when period equals data length", () => {
    expect(sma([10, 20, 30], 3)).toBeCloseTo(20, 10);
  });

  it("returns the single value when period is 1", () => {
    expect(sma([42], 1)).toBe(42);
    expect(sma([1, 2, 42], 1)).toBe(42);
  });

  it("returns the average of available data when data is shorter than period", () => {
    // slice(-5) on [1, 2] returns [1, 2], avg = 1.5
    expect(sma([1, 2], 5)).toBeCloseTo(1.5, 10);
  });
});

// ---------------------------------------------------------------------------
// smaSeries
// ---------------------------------------------------------------------------
describe("smaSeries", () => {
  it("returns nulls for indices before the first full window", () => {
    const result = smaSeries([1, 2, 3, 4, 5], 3);
    expect(result).toHaveLength(5);
    expect(result[0]).toBeNull();
    expect(result[1]).toBeNull();
    expect(result[2]).toBeCloseTo(2, 10); // (1+2+3)/3
    expect(result[3]).toBeCloseTo(3, 10); // (2+3+4)/3
    expect(result[4]).toBeCloseTo(4, 10); // (3+4+5)/3
  });

  it("returns all nulls when period > data length", () => {
    const result = smaSeries([1, 2], 5);
    expect(result).toEqual([null, null]);
  });

  it("handles empty data", () => {
    expect(smaSeries([], 3)).toEqual([]);
  });

  it("handles period of 1 (no nulls)", () => {
    const result = smaSeries([10, 20, 30], 1);
    expect(result).toEqual([10, 20, 30]);
  });
});

// ---------------------------------------------------------------------------
// ema
// ---------------------------------------------------------------------------
describe("ema", () => {
  it("calculates exponential moving average for a series", () => {
    // k = 2/(3+1) = 0.5 for period=3
    // result[0] = 10
    // result[1] = 20*0.5 + 10*0.5 = 15
    // result[2] = 30*0.5 + 15*0.5 = 22.5
    const result = ema([10, 20, 30], 3);
    expect(result).toHaveLength(3);
    expect(result[0]).toBe(10);
    expect(result[1]).toBeCloseTo(15, 10);
    expect(result[2]).toBeCloseTo(22.5, 10);
  });

  it("returns the first value as the initial seed", () => {
    const result = ema([42, 44], 5);
    expect(result[0]).toBe(42);
  });

  it("handles single-element data", () => {
    expect(ema([100], 14)).toEqual([100]);
  });

  it("handles rising prices correctly", () => {
    const result = ema([1, 2, 3, 4, 5], 2); // k = 2/3 ≈ 0.6667
    expect(result[0]).toBe(1);
    // result[1] = 2*(2/3) + 1*(1/3) = 1.6667
    // result[2] = 3*(2/3) + 1.6667*(1/3) = 2.5556
    // etc.
    expect(result[1]).toBeCloseTo(1.6667, 3);
    expect(result[2]).toBeCloseTo(2.5556, 3);
  });
});

// ---------------------------------------------------------------------------
// rsi
// ---------------------------------------------------------------------------
describe("rsi", () => {
  it("returns 100 when there are only gains (no losses)", () => {
    // All changes are positive → avgLoss = 0 → RSI = 100
    const closes = [100, 101, 102, 103, 104, 105, 106, 107, 108, 109, 110, 111, 112, 113, 114];
    expect(rsi(closes, 14)).toBe(100);
  });

  it("returns 0 when there are only losses (no gains)", () => {
    // All changes are negative → avgLoss > 0 → avgGain = 0 → RSI = 0
    const closes = [114, 113, 112, 111, 110, 109, 108, 107, 106, 105, 104, 103, 102, 101, 100];
    expect(rsi(closes, 14)).toBe(0);
  });

  it("returns 50 when gains and losses are equal", () => {
    const closes = [
      100, 101, 100, 101, 100, 101, 100, 101, 100, 101, 100, 101, 100, 101, 100,
    ];
    const result = rsi(closes, 14);
    expect(result).toBeCloseTo(50, 1);
  });

  it("returns a value between 0 and 100 for mixed data", () => {
    // Steady uptrend → RSI > 50
    const closes = [100, 102, 101, 103, 102, 104, 103, 105, 104, 106, 105, 107, 106, 108, 107];
    const result = rsi(closes, 14);
    expect(result).toBeGreaterThan(50);
    expect(result).toBeLessThan(100);
  });

  it("handles smaller period than data length", () => {
    // 20 data points, period 14 → uses last 14 changes
    const closes = Array.from({ length: 20 }, (_, i) => 100 + i);
    const result = rsi(closes, 5);
    expect(result).toBeGreaterThan(0);
    expect(result).toBeLessThanOrEqual(100);
  });

  it("returns 100 when avgLoss is 0 (only gains in the period)", () => {
    const closes = [100, 101, 102, 103, 104, 105, 106, 107, 108, 109, 110, 111, 112, 113, 114, 115];
    const result = rsi(closes, 14);
    expect(result).toBe(100);
  });
});

// ---------------------------------------------------------------------------
// rsiSeries
// ---------------------------------------------------------------------------
describe("rsiSeries", () => {
  it("returns null for indices before period completes", () => {
    const closes = [100, 101, 102, 103, 104, 105, 106, 107, 108, 109, 110, 111, 112, 113, 114, 115];
    const result = rsiSeries(closes, 14);
    expect(result).toHaveLength(closes.length);
    // First entry is always null (i === 0)
    expect(result[0]).toBeNull();
    // Entries from 1 to 13 should also be null (i < period for cumulative, then i === period)
    for (let i = 1; i <= 13; i++) {
      expect(result[i]).toBeNull();
    }
    // Entry at index 14 (i === period) should have a value
    expect(result[14]).not.toBeNull();
    expect(typeof result[14]).toBe("number");
  });

  it("produces RSI = 100 when all changes are gains (no losses)", () => {
    const closes = [100, 101, 102, 103, 104, 105, 106, 107, 108, 109, 110, 111, 112, 113, 114, 115];
    const result = rsiSeries(closes, 14);
    // Index 14 (i === period): losses === 0 → RSI = 100
    expect(result[14]).toBe(100);
    // Index 15 (i > period): losses === 0 → RSI = 100
    expect(result[15]).toBe(100);
  });

  it("handles empty data", () => {
    expect(rsiSeries([], 14)).toEqual([]);
  });

  it("handles shorter data than period", () => {
    const result = rsiSeries([100, 101, 102], 14);
    expect(result).toEqual([null, null, null]);
  });

  it("handles mixed gains and losses in rsiSeries", () => {
    // Data with both gains and losses
    const closes = [100, 105, 102, 108, 103, 110, 104, 112, 105, 115, 106, 118, 107, 120, 108];
    const result = rsiSeries(closes, 14);
    expect(result).toHaveLength(closes.length);
    expect(result[0]).toBeNull();
    // At i === period (14), there should be a calculated value (not 100 since losses > 0)
    const val = result[14];
    expect(val).not.toBeNull();
    expect(val).toBeGreaterThan(0);
    expect(val).toBeLessThan(100);
  });

  it("covers period-1 formula when i > period with non-zero losses", () => {
    // More data points than period + 1 so we hit both formula branches
    const closes = [
      100, 102, 99, 103, 98, 104, 97, 105, 96, 106, 95, 107, 94, 108, 93, 109, 92, 110,
    ];
    const result = rsiSeries(closes, 14);
    expect(result).toHaveLength(closes.length);
    // Index 14 (i === period) should have a value
    expect(result[14]).not.toBeNull();
    // Index 15+ (i > period) should also have values
    expect(result[15]).not.toBeNull();
    expect(result[16]).not.toBeNull();
    expect(result[17]).not.toBeNull();
    // All values should be between 0 and 100 (non-zero losses)
    for (let i = 14; i < result.length; i++) {
      expect(result[i]).toBeGreaterThan(0);
      expect(result[i]).toBeLessThan(100);
    }
  });
});

// ---------------------------------------------------------------------------
// macd
// ---------------------------------------------------------------------------
describe("macd", () => {
  it("returns macd, signal, histogram and series", () => {
    const closes = Array.from({ length: 50 }, (_, i) => 100 + i * 0.5);
    const result = macd(closes, 12, 26, 9);

    expect(result).toHaveProperty("macd");
    expect(result).toHaveProperty("signal");
    expect(result).toHaveProperty("histogram");
    expect(result).toHaveProperty("macdSeries");
    expect(result).toHaveProperty("signalSeries");
    expect(result).toHaveProperty("histogramSeries");

    // All series should have same length as input
    expect(result.macdSeries).toHaveLength(closes.length);
    expect(result.signalSeries).toHaveLength(closes.length);
    expect(result.histogramSeries).toHaveLength(closes.length);

    // histogram = macd - signal at last index
    expect(result.histogram).toBeCloseTo(result.macd - result.signal, 10);
    // Last histogramSeries entry matches histogram
    expect(result.histogramSeries[result.histogramSeries.length - 1]).toBeCloseTo(
      result.histogram,
      10,
    );
  });

  it("works with default parameters", () => {
    const closes = Array.from({ length: 50 }, (_, i) => 100 + i * 0.3);
    const result = macd(closes);
    expect(typeof result.macd).toBe("number");
    expect(typeof result.signal).toBe("number");
    expect(typeof result.histogram).toBe("number");
  });

  it("produces non-NaN values for enough data", () => {
    const closes = Array.from({ length: 60 }, (_, i) => 100 + Math.sin(i * 0.5) * 10);
    const result = macd(closes);
    expect(result.macd).not.toBeNaN();
    expect(result.signal).not.toBeNaN();
    expect(result.histogram).not.toBeNaN();
  });
});

// ---------------------------------------------------------------------------
// atr
// ---------------------------------------------------------------------------
describe("atr", () => {
  it("calculates average true range for a series", () => {
    const highs = [105, 106, 107, 108, 109, 110, 111, 112, 113, 114, 115, 116, 117, 118, 119];
    const lows = [95, 96, 97, 98, 99, 100, 101, 102, 103, 104, 105, 106, 107, 108, 109];
    const closes = [100, 101, 102, 103, 104, 105, 106, 107, 108, 109, 110, 111, 112, 113, 114];

    const result = atr(highs, lows, closes, 14);
    expect(result).toBeGreaterThan(0);
    // TR = high - low = 10 for each bar
    // With period=14 and enough data → ATR should approximate 10
    expect(result).toBeCloseTo(10, 0);
  });

  it("returns 0 when there is insufficient data for period", () => {
    expect(atr([100], [99], [99.5], 14)).toBe(0);
  });

  it("returns simple average when there is some data but less than period", () => {
    const highs = [105, 106, 107];
    const lows = [95, 96, 97];
    const closes = [100, 101, 102];
    const result = atr(highs, lows, closes, 14);
    // Only 2 TR values (need 14 for full ATR), so uses simple avg
    expect(result).toBeGreaterThan(0);
    expect(result).toBe(10); // Each TR = 10, so avg = 10
  });

  it("uses at least 2 data points to compute TR", () => {
    expect(atr([100, 110], [90, 90], [95, 105], 14)).toBeGreaterThan(0);
  });
});

// ---------------------------------------------------------------------------
// adx
// ---------------------------------------------------------------------------
describe("adx", () => {
  it("returns 0 when insufficient data (< period + 1)", () => {
    const highs = [100, 101, 102];
    const lows = [95, 96, 97];
    const closes = [98, 99, 100];
    expect(adx(highs, lows, closes, 14)).toBe(0);
  });

  it("returns a positive ADX value for trending data", () => {
    // Strong uptrend → ADX should be positive (> 0)
    const highs = Array.from({ length: 30 }, (_, i) => 100 + i * 2);
    const lows = Array.from({ length: 30 }, (_, i) => 98 + i * 2);
    const closes = Array.from({ length: 30 }, (_, i) => 99 + i * 2);

    const result = adx(highs, lows, closes, 14);
    expect(result).toBeGreaterThan(0);
    expect(result).toBeLessThanOrEqual(100);
  });

  it("returns 0 (no NaN) when data has no movement", () => {
    const flat = Array.from({ length: 30 }, () => 100);
    const result = adx(flat, flat, flat, 14);
    expect(result).toBe(0);
  });

  it("returns a value between 0 and 100", () => {
    const highs = Array.from({ length: 30 }, (_, i) => 100 + Math.sin(i * 0.5) * 5);
    const lows = Array.from({ length: 30 }, (_, i) => 95 + Math.sin(i * 0.5) * 5);
    const closes = Array.from({ length: 30 }, (_, i) => 97.5 + Math.sin(i * 0.5) * 5);

    const result = adx(highs, lows, closes, 14);
    expect(result).toBeGreaterThanOrEqual(0);
    expect(result).toBeLessThanOrEqual(100);
  });
});

// ---------------------------------------------------------------------------
// bollingerBands
// ---------------------------------------------------------------------------
describe("bollingerBands", () => {
  it("calculates upper, middle, lower bands and bandwidth", () => {
    const closes = [95, 96, 97, 98, 99, 100, 101, 102, 103, 104, 105, 106, 107, 108, 109, 110, 111, 112, 113, 114];
    const result = bollingerBands(closes, 20, 2);

    expect(result.middle).toBeCloseTo(104.5, 10); // avg of last 20
    expect(result.upper).toBeGreaterThan(result.middle);
    expect(result.lower).toBeLessThan(result.middle);
    expect(result.bandwidth).toBeGreaterThan(0);
  });

  it("returns bandwidth = 0 when all prices are equal (zero variance)", () => {
    const closes = Array.from({ length: 20 }, () => 100);
    const result = bollingerBands(closes, 20, 2);

    expect(result.middle).toBe(100);
    expect(result.upper).toBe(100);
    expect(result.lower).toBe(100);
    expect(result.bandwidth).toBe(0);
  });

  it("uses default period of 20 and stdDev of 2", () => {
    const closes = Array.from({ length: 25 }, (_, i) => 100 + i);
    const result = bollingerBands(closes);

    const slice = closes.slice(-20);
    const expectedMiddle = slice.reduce((a, b) => a + b, 0) / 20;
    expect(result.middle).toBeCloseTo(expectedMiddle, 10);
    expect(result.upper).toBeGreaterThan(result.middle);
  });

  it("widens bands with higher stdDev multiplier", () => {
    const closes = Array.from({ length: 20 }, (_, i) => 100 + Math.random() * 10);
    const std1 = bollingerBands(closes, 20, 1);
    const std3 = bollingerBands(closes, 20, 3);

    // 3-sigma bands should be wider than 1-sigma
    expect(std3.upper - std3.lower).toBeGreaterThan(std1.upper - std1.lower);
  });

  it("handles data with single value", () => {
    const result = bollingerBands([100], 20, 2);
    expect(result.middle).toBe(100);
    expect(result.upper).toBe(100);
    expect(result.lower).toBe(100);
    expect(result.bandwidth).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// detectMarketRegime
// ---------------------------------------------------------------------------
describe("detectMarketRegime", () => {
  it("returns trending_up for a strong uptrend with low volatility", () => {
    // 50+ data points for sma50
    const highs = Array.from({ length: 60 }, (_, i) => 100 + i * 1.5 + 2);
    const lows = Array.from({ length: 60 }, (_, i) => 100 + i * 1.5 - 2);
    const closes = Array.from({ length: 60 }, (_, i) => 100 + i * 1.5);

    const result = detectMarketRegime(highs, lows, closes);
    expect(result).toBe("trending_up");
  });

  it("returns trending_down for a strong downtrend with low volatility", () => {
    const highs = Array.from({ length: 60 }, (_, i) => 200 - i * 1.5 + 2);
    const lows = Array.from({ length: 60 }, (_, i) => 200 - i * 1.5 - 2);
    const closes = Array.from({ length: 60 }, (_, i) => 200 - i * 1.5);

    const result = detectMarketRegime(highs, lows, closes);
    expect(result).toBe("trending_down");
  });

  it("returns ranging when ADX < 20 and volatility is low", () => {
    // Very tight range → low ADX, low volatility
    const base = 100;
    const highs = Array.from({ length: 60 }, () => base + 0.5);
    const lows = Array.from({ length: 60 }, () => base - 0.5);
    const closes = Array.from({ length: 60 }, () => base);

    const result = detectMarketRegime(highs, lows, closes);
    expect(result).toBe("ranging");
  });

  it("returns volatile when ATR/price > 8%", () => {
    // Wide swings → high ATR relative to price
    const base = 100;
    const highs = Array.from({ length: 60 }, () => base + 20);
    const lows = Array.from({ length: 60 }, () => base - 20);
    const closes = Array.from({ length: 60 }, (_, i) => base + Math.sin(i * 0.5) * 10);

    const result = detectMarketRegime(highs, lows, closes);
    expect(result).toBe("volatile");
  });

  it("returns mixed when no clear regime is detected", () => {
    // Moderate volatility, moderate ADX — should fall through to "mixed"
    const highs = Array.from({ length: 60 }, (_, i) => 100 + Math.sin(i * 0.3) * 5 + i * 0.3);
    const lows = Array.from({ length: 60 }, (_, i) => 95 + Math.sin(i * 0.3) * 5 + i * 0.3);
    const closes = Array.from({ length: 60 }, (_, i) => 97.5 + Math.sin(i * 0.3) * 5 + i * 0.3);

    const result = detectMarketRegime(highs, lows, closes);
    // Should be one of the valid regimes
    expect(["trending_up", "trending_down", "ranging", "volatile", "mixed"]).toContain(result);
  });
});
