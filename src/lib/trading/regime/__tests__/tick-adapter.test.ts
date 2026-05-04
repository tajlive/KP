import { describe, it, expect } from "vitest";
import { evaluateDarkFleetSignal, DEFAULT_DARK_FLEET_CONFIG } from "../tick-adapter";
import type { Candle, StrategyInput } from "../../strategies/types";

function makeCandles(n: number, trend: "up" | "down" | "sideways"): Candle[] {
  const candles: Candle[] = [];
  let price = 50000;
  const seed = trend === "up" ? 150 : trend === "down" ? -150 : 0;
  for (let i = 0; i < n; i++) {
    // Deterministic pseudo-random using index
    const noise = Math.sin(i * 1.7 + (trend === "up" ? 1 : trend === "down" ? 3 : 2)) * 80;
    const change = seed + noise;
    price += change;
    candles.push({
      time: Date.now() - (n - i) * 3600_000,
      open: price - change * 0.3,
      high: price + Math.abs(change) * 0.5 + 20,
      low: price - Math.abs(change) * 0.5 - 20,
      close: price,
      volume: 2000 + (i % 5) * 500,
    });
  }
  return candles;
}

function makeInput(candles: Candle[], engineKey = "trend_follow"): StrategyInput {
  return {
    candles,
    session: {
      open_position: null,
      last_tick_at: null,
      strategy_config: { engineKey },
    },
    config: { engineKey },
  };
}

describe("evaluateDarkFleetSignal", () => {
  it("returns hold for insufficient data (< 30 candles)", () => {
    const input = makeInput(makeCandles(10, "sideways"));
    const signal = evaluateDarkFleetSignal(input, { enabled: true });
    expect(signal.action).toBe("hold");
    expect(signal.indicators?.darkFleet).toBe(true);
  });

  it("produces valid signal with metadata in uptrend", () => {
    const input = makeInput(makeCandles(100, "up"), "trend_follow");
    const signal = evaluateDarkFleetSignal(input, { enabled: true, threshold: 0.2 });
    expect(["buy", "sell", "hold"]).toContain(signal.action);
    expect(signal.indicators?.darkFleet).toBe(true);
    expect(signal.indicators?.regime).toBeDefined();
    expect(typeof signal.indicators?.ensembleScore).toBe("number");
  });

  it("produces valid signal with metadata in downtrend", () => {
    const input = makeInput(makeCandles(100, "down"), "trend_follow");
    const signal = evaluateDarkFleetSignal(input, { enabled: true, threshold: 0.2 });
    expect(["buy", "sell", "hold"]).toContain(signal.action);
    expect(signal.indicators?.darkFleet).toBe(true);
  });

  it("caps position size at maxPositionSize", () => {
    const input = makeInput(makeCandles(100, "up"));
    const signal = evaluateDarkFleetSignal(input, {
      enabled: true,
      maxPositionSize: 0.05,
    });
    expect(signal.positionSize).toBeLessThanOrEqual(0.05);
  });

  it("reduces position size in high-vol regime", () => {
    // Create volatile candles
    const candles: Candle[] = [];
    let price = 50000;
    for (let i = 0; i < 100; i++) {
      const change = (Math.random() - 0.5) * 3000;
      price += change;
      candles.push({
        time: Date.now() - (100 - i) * 3600_000,
        open: price - change * 0.3,
        high: price + Math.abs(change) * 0.8,
        low: price - Math.abs(change) * 0.8,
        close: price,
        volume: 1000,
      });
    }
    const input = makeInput(candles);
    const signal = evaluateDarkFleetSignal(input, { enabled: true });
    expect(signal.positionSize).toBeLessThanOrEqual(0.06); // 0.12 * 0.5
  });

  it("includes darkFleet indicator metadata", () => {
    const input = makeInput(makeCandles(100, "sideways"));
    const signal = evaluateDarkFleetSignal(input, { enabled: true });
    expect(signal.indicators).toBeDefined();
    expect(signal.indicators?.darkFleet).toBe(true);
    expect(signal.indicators?.regime).toBeDefined();
    expect(typeof signal.indicators?.regimeConfidence).toBe("number");
    expect(typeof signal.indicators?.ensembleScore).toBe("number");
  });

  it("holds in chop/unknown with high threshold", () => {
    const input = makeInput(makeCandles(100, "sideways"));
    const signal = evaluateDarkFleetSignal(input, {
      enabled: true,
      threshold: 0.5,
    });
    expect(signal.action).toBe("hold");
  });

  it("never errors — always returns a valid signal", () => {
    const input = makeInput([]);
    const signal = evaluateDarkFleetSignal(input, { enabled: true });
    expect(["buy", "sell", "hold"]).toContain(signal.action);
    expect(signal.reason).toBeTruthy();
  });
});
