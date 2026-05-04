import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { evaluateDarkFleetSignal, DEFAULT_DARK_FLEET_CONFIG } from "../regime/tick-adapter";
import type { StrategyInput, Candle } from "../strategies/types";

function makeCandles(n: number, trend: "up" | "down" | "sideways"): Candle[] {
  const candles: Candle[] = [];
  let price = 50000;
  const seed = trend === "up" ? 150 : trend === "down" ? -150 : 0;
  for (let i = 0; i < n; i++) {
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

describe("P0: Dark Fleet Safety", () => {
  beforeEach(() => {
    vi.stubEnv("ENABLE_DARK_FLEET", "false");
    vi.stubEnv("DARK_FLEET_KILL_SWITCH", "false");
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("returns valid signal when disabled (enabled=false)", () => {
    const input = makeInput(makeCandles(100, "sideways"));
    const signal = evaluateDarkFleetSignal(input, { enabled: false });
    expect(["buy", "sell", "hold"]).toContain(signal.action);
    expect(signal.reason).toBeTruthy();
  });

  it("never throws — always returns a valid StrategySignal", () => {
    // Edge cases that could potentially crash
    const edgeCases = [
      makeInput([]),                    // empty candles
      makeInput(makeCandles(5, "up")),  // too few candles
      makeInput(makeCandles(100, "sideways"), "unknown_strategy"),
    ];

    for (const input of edgeCases) {
      expect(() => evaluateDarkFleetSignal(input, { enabled: true })).not.toThrow();
      const signal = evaluateDarkFleetSignal(input, { enabled: true });
      expect(["buy", "sell", "hold"]).toContain(signal.action);
      expect(signal.reason).toBeTruthy();
    }
  });

  it("caps position size at maxPositionSize", () => {
    const input = makeInput(makeCandles(100, "up"));
    const signal = evaluateDarkFleetSignal(input, {
      enabled: true,
      maxPositionSize: 0.03,
    });
    expect(signal.positionSize).toBeLessThanOrEqual(0.03);
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
    const signal = evaluateDarkFleetSignal(input, { enabled: true, maxPositionSize: 0.12 });
    // In high-vol, position should be halved: max 0.12 → 0.06
    expect(signal.positionSize).toBeLessThanOrEqual(0.06);
  });

  it("holds when ensemble score is near zero (neutral market)", () => {
    // Very flat sideways market → ensemble score near 0
    const candles: Candle[] = [];
    let price = 50000;
    for (let i = 0; i < 100; i++) {
      price += (i % 2 === 0 ? 1 : -1) * 5; // almost flat
      candles.push({
        time: Date.now() - (100 - i) * 3600_000,
        open: price,
        high: price + 10,
        low: price - 10,
        close: price,
        volume: 1000,
      });
    }
    const input = makeInput(candles);
    const signal = evaluateDarkFleetSignal(input, {
      enabled: true,
      threshold: 0.3,
    });
    // Near-zero ensemble score should result in hold
    expect(signal.action).toBe("hold");
  });

  it("includes all required darkFleet indicator metadata", () => {
    const input = makeInput(makeCandles(100, "up"));
    const signal = evaluateDarkFleetSignal(input, { enabled: true });
    expect(signal.indicators).toBeDefined();
    expect(signal.indicators?.darkFleet).toBe(true);
    expect(signal.indicators?.regime).toBeDefined();
    expect(typeof signal.indicators?.regimeConfidence).toBe("number");
    expect(typeof signal.indicators?.ensembleScore).toBe("number");
    expect(signal.indicators?.baseSignal).toBeDefined();
  });

  it("signal contains human-readable reason with regime info", () => {
    const input = makeInput(makeCandles(100, "up"));
    const signal = evaluateDarkFleetSignal(input, { enabled: true });
    expect(signal.reason).toContain("Dark Fleet:");
    expect(signal.reason).toContain("ensemble=");
  });

  it("uses correct default config when none provided", () => {
    const input = makeInput(makeCandles(100, "up"));
    const signal = evaluateDarkFleetSignal(input);
    // Default is disabled → should still return valid signal
    expect(["buy", "sell", "hold"]).toContain(signal.action);
  });
});
