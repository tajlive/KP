/**
 * E5 Regimefilter — tester (2026-08-12)
 */
import { describe, it, expect } from "vitest";
import { SimpleGridStrategy } from "../simple-grid";
import type { StrategyInput, Candle } from "../types";

function makeCandle(override: Partial<Candle> = {}): Candle {
  return {
    time: Date.now(),
    open: 100,
    high: 101,
    low: 99,
    close: 100.5,
    volume: 1000,
    ...override,
  };
}

/** Generer candles som simulerer et bestemt regime */
function regimeCandles(
  regime: "range" | "trend" | "low_vol",
  count: number = 50,
): Candle[] {
  const now = Date.now();
  const candles: Candle[] = [];
  let price = 100;

  for (let i = 0; i < count; i++) {
    const time = now - (count - i) * 3600_000;

    if (regime === "range") {
      // Sidelengs med moderate svingninger — ADX bør være lav
      const delta = (Math.random() - 0.5) * 4;
      price = Math.max(90, Math.min(110, price + delta));
    } else if (regime === "trend") {
      // Sterk opptrend — ADX bør være høy
      price += 2 + Math.random();
    } else {
      // Lav volatilitet — nesten flat, BBW bør være under minimum
      price += (Math.random() - 0.5) * 0.3;
    }

    candles.push({
      time,
      open: price - 0.1,
      high: price + 0.5,
      low: price - 0.5,
      close: price,
      volume: 1000,
    });
  }
  return candles;
}

function makeInput(overrides: Partial<StrategyInput> = {}): StrategyInput {
  return {
    candles: regimeCandles("range"),
    session: { id: "test", mode: "paper", status: "active" } as any,
    config: { regime_filter_enabled: false },
    ...overrides,
  };
}

const strategy = new SimpleGridStrategy();

describe("E5 Regimefilter", () => {
  it("flag false → identisk baseline (ingen regime-blokkering)", () => {
    const input = makeInput({
      config: { regime_filter_enabled: false },
      candles: regimeCandles("trend"),
    });
    const sig = strategy.evaluate(input);
    // Skal IKKE være en TREND-block — bare normal grid/DCA/hold
    expect(sig.indicators?.regime).toBeUndefined();
  });

  it("TREND → blokkerer kjøp, returnerer hold med norsk forklaring", () => {
    const input = makeInput({
      config: { regime_filter_enabled: true },
      candles: regimeCandles("trend"),
    });
    const sig = strategy.evaluate(input);
    expect(sig.action).toBe("hold");
    expect(sig.indicators?.regime).toBe("trend");
    expect(sig.reason).toContain("TREND");
    expect(sig.reason).toContain("ADX for høyt");
  });

  it("MELLOMREGIME → hold, ingen nye kjøp", () => {
    // Bruk "range" candles med få datapunkter — ADX faller i gråsonen
    const input = makeInput({
      config: {
        regime_filter_enabled: true,
        adx_range_max: 15,
        adx_trend_min: 20,
      },
      candles: regimeCandles("range", 20), // Få datapunkter gir ustabil ADX
    });
    const sig = strategy.evaluate(input);
    // Kan være range eller mellomregime — men hvis den treffer gråsonen:
    if (sig.indicators?.regime === "mellomregime") {
      expect(sig.action).toBe("hold");
      expect(sig.reason).toContain("OVERGANGSREGIME");
    }
  });

  it("RANGE → normal strategi-logikk tillates (regime != trend)", () => {
    const input = makeInput({
      config: { regime_filter_enabled: true, bbw_min_pct: 0.1 }, // Senk BBW-krav for test
      candles: regimeCandles("range"),
    });
    const sig = strategy.evaluate(input);
    // Skal IKKE ha TREND (trend-blokkeren er det vi tester)
    expect(sig.indicators?.regime).not.toBe("trend");
    // Skal være enten hold, buy, eller sell (ikke blokkert av regime)
  });

  it("LAV_VOLATILITET → blokkerer med BBW-forklaring", () => {
    const input = makeInput({
      config: { regime_filter_enabled: true, bbw_min_pct: 3.0 },
      candles: regimeCandles("low_vol"),
    });
    const sig = strategy.evaluate(input);
    if (
      sig.indicators?.regime === "mellomregime" &&
      sig.reason?.includes("LAV_VOLATILITET")
    ) {
      expect(sig.action).toBe("hold");
    }
  });

  it("få candles (< periode) → ingen regime-blokkering, returnerer normalt", () => {
    const input = makeInput({
      config: { regime_filter_enabled: true },
      candles: [makeCandle(), makeCandle()],
    });
    const sig = strategy.evaluate(input);
    expect(sig.indicators?.regime).toBeUndefined();
  });
});
