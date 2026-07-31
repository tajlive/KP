/**
 * Test: strategy-gates.ts — Fase 2 strategi-oppgraderinger (2026-07-31)
 *
 * 2.1 Regime-gate: blokker kjøp i crash/trend_down
 * 2.2 Trailing exit: scale-out + trailing stop
 * 2.3 Anti-whipsaw: blokker re-kjøp innen cooldown
 * 2.4 User jitter: deterministisk per-bruker spredning
 * 2.5 Symbol edge: posisjonsvekting etter historisk performance
 */
import { describe, expect, it } from "vitest";
import {
  classifyRegime,
  evaluateRegimeGate,
  evaluateTrailingExit,
  evaluateAntiWhipsaw,
  userJitter,
  jitteredSizeMultiplier,
  userTickBucket,
  symbolEdgeWeight,
  type SymbolEdgeStats,
} from "../strategy-gates";

// ─────────────────────────────────────────────────────────
// 2.1 REGIME-GATE
// ─────────────────────────────────────────────────────────

describe("classifyRegime", () => {
  it("range: for lite data", () => {
    expect(classifyRegime([100, 101], 20, 50)).toBe("range");
  });

  it("trend_up: fast > slow, positiv slope", () => {
    const closes = Array.from({ length: 60 }, (_, i) => 100 + i * 0.3);
    expect(classifyRegime(closes, 20, 50)).toBe("trend_up");
  });

  it("trend_down: mild langvarig nedgang (ikke bratt nok til crash)", () => {
    const closes = Array.from({ length: 60 }, (_, i) => 100 - i * 0.3);
    expect(classifyRegime(closes, 20, 50)).toBe("trend_down");
  });

  it("crash: pris langt under slow-SMA + bratt fall", () => {
    // 49 flate dager på 100, så 11 dager med -2 per dag (bratt -2% slope)
    const closes = new Array(49).fill(100).concat([98, 96, 94, 92, 90, 88, 86, 84, 82, 80, 78]);
    expect(classifyRegime(closes, 20, 50)).toBe("crash");
  });

  it("range: flat-ish (deterministisk)", () => {
    const closes = Array.from({ length: 60 }, (_, i) => 100 + Math.sin(i * 0.1) * 0.5);
    expect(classifyRegime(closes, 20, 50)).toBe("range");
  });
});

describe("evaluateRegimeGate", () => {
  it("tillater kjøp i range", () => {
    const closes = Array(60).fill(100);
    const r = evaluateRegimeGate(closes);
    expect(r.allowed).toBe(true);
    expect(r.regime).toBe("range");
  });

  it("tillater kjøp i trend_up", () => {
    const closes = Array.from({ length: 60 }, (_, i) => 100 + i * 0.5);
    const r = evaluateRegimeGate(closes);
    expect(r.allowed).toBe(true);
    expect(r.regime).toBe("trend_up");
  });

  it("blokkerer kjøp i trend_down", () => {
    const closes = Array.from({ length: 60 }, (_, i) => 100 - i * 0.3);
    const r = evaluateRegimeGate(closes);
    expect(r.allowed).toBe(false);
    expect(r.regime).toBe("trend_down");
  });

  it("blokkerer kjøp i crash", () => {
    // 49 flate, så 11 dager med -2 → crash
    const closes = new Array(49).fill(100).concat([98, 96, 94, 92, 90, 88, 86, 84, 82, 80, 78]);
    const r = evaluateRegimeGate(closes);
    expect(r.allowed).toBe(false);
    expect(r.regime).toBe("crash");
  });
});

// ─────────────────────────────────────────────────────────
// 2.3 ANTI-WHIPSAW
// ─────────────────────────────────────────────────────────

describe("evaluateAntiWhipsaw", () => {
  const now = 1753992000000;

  it("tillater kjøp når ingen siste salg", () => {
    const r = evaluateAntiWhipsaw({ currentPrice: 50000, nowMs: now });
    expect(r.allowed).toBe(true);
  });

  it("tillater kjøp når cooldown er over", () => {
    const r = evaluateAntiWhipsaw({
      lastSellAt: new Date(now - 31 * 60 * 1000).toISOString(),
      lastSellPrice: 50000,
      currentPrice: 50000,
      nowMs: now,
    });
    expect(r.allowed).toBe(true);
  });

  it("tillater kjøp innen cooldown hvis pris ≥ 2% bevegelse", () => {
    const r = evaluateAntiWhipsaw({
      lastSellAt: new Date(now - 5 * 60 * 1000).toISOString(),
      lastSellPrice: 50000,
      currentPrice: 49000, // -2% fra salgspris
      nowMs: now,
    });
    expect(r.allowed).toBe(true);
    expect(r.reason).toContain("%");
  });

  it("blokkerer kjøp innen cooldown når prisbevegelse < 2%", () => {
    const r = evaluateAntiWhipsaw({
      lastSellAt: new Date(now - 5 * 60 * 1000).toISOString(),
      lastSellPrice: 50000,
      currentPrice: 49500, // -1%
      nowMs: now,
    });
    expect(r.allowed).toBe(false);
    expect(r.reason).toContain("anti-whipsaw");
  });
});

// ─────────────────────────────────────────────────────────
// 2.4 USER JITTER
// ─────────────────────────────────────────────────────────

describe("userJitter", () => {
  it("gir deterministisk verdi i [0,1)", () => {
    const j1 = userJitter("abc");
    const j2 = userJitter("abc");
    expect(j1).toBe(j2);
    expect(j1).toBeGreaterThanOrEqual(0);
    expect(j1).toBeLessThan(1);
  });

  it("gir ulike verdier for ulike ID-er", () => {
    expect(userJitter("user1")).not.toBe(userJitter("user2"));
  });

  it("salt endrer utgang", () => {
    expect(userJitter("abc", "size:BTC")).not.toBe(userJitter("abc", "bucket"));
  });
});

describe("jitteredSizeMultiplier", () => {
  it("gir verdi i [0.9, 1.1]", () => {
    for (const uid of ["a", "b", "c"]) {
      for (const sym of ["BTCUSDT", "ETHUSDT", "SOLUSDT"]) {
        const m = jitteredSizeMultiplier(uid, sym);
        expect(m).toBeGreaterThanOrEqual(0.9);
        expect(m).toBeLessThanOrEqual(1.1);
      }
    }
  });

  it("samme input gir samme output", () => {
    expect(jitteredSizeMultiplier("tom", "BTCUSDT")).toBe(jitteredSizeMultiplier("tom", "BTCUSDT"));
  });
});

describe("userTickBucket", () => {
  it("gir bucket i [0, buckets-1]", () => {
    for (const uid of ["a", "b", "c", "x", "y", "z"]) {
      const b = userTickBucket(uid, 3);
      expect(b).toBeGreaterThanOrEqual(0);
      expect(b).toBeLessThan(3);
      expect(Number.isInteger(b)).toBe(true);
    }
  });

  it("deterministisk", () => {
    expect(userTickBucket("abc")).toBe(userTickBucket("abc"));
  });
});

// ─────────────────────────────────────────────────────────
// 2.5 SYMBOL EDGE
// ─────────────────────────────────────────────────────────

describe("symbolEdgeWeight", () => {
  it("lite data → 1.0", () => {
    expect(symbolEdgeWeight({ trades: 3, expectancyPct: 10, profitFactor: 2 })).toBe(1.0);
  });

  it("sterk positiv edge → >1.0", () => {
    const w = symbolEdgeWeight({ trades: 50, expectancyPct: 2.5, profitFactor: 2.0 });
    expect(w).toBeGreaterThan(1.0);
    expect(w).toBeLessThanOrEqual(1.3);
  });

  it("sterk negativ edge → <1.0", () => {
    const w = symbolEdgeWeight({ trades: 50, expectancyPct: -3, profitFactor: 0.3 });
    expect(w).toBeLessThan(1.0);
    expect(w).toBeGreaterThanOrEqual(0.5);
  });

  it("nøytral edge → ≈1.0", () => {
    expect(symbolEdgeWeight({ trades: 100, expectancyPct: 0, profitFactor: 1.0 })).toBeCloseTo(1.0, 1);
  });

  it("clampes til [0.5, 1.3]", () => {
    const veryGood: SymbolEdgeStats = { trades: 100, expectancyPct: 20, profitFactor: 10 };
    const veryBad: SymbolEdgeStats = { trades: 100, expectancyPct: -20, profitFactor: 0.1 };
    expect(symbolEdgeWeight(veryGood)).toBe(1.3);
    expect(symbolEdgeWeight(veryBad)).toBe(0.5);
  });
});

// ─────────────────────────────────────────────────────────
// 2.2 TRAILING EXIT
// ─────────────────────────────────────────────────────────

describe("evaluateTrailingExit", () => {
  const base = { entryPrice: 50000, peakPrice: 50000, currentPrice: 50000 };

  it("hold når flat", () => {
    const r = evaluateTrailingExit(base);
    expect(r.action).toBe("hold");
    expect(r.sellFraction).toBe(0);
  });

  it("scale-out ved +3%", () => {
    const r = evaluateTrailingExit({ ...base, currentPrice: 51500, peakPrice: 51500 });
    expect(r.action).toBe("scale_out");
    expect(r.sellFraction).toBe(0.5);
    expect(r.newPeak).toBe(51500);
  });

  it("skalerer IKKE ut to ganger", () => {
    const r = evaluateTrailingExit({
      ...base, currentPrice: 51500, peakPrice: 51500, alreadyScaledOut: true,
    });
    expect(r.action).not.toBe("scale_out");
  });

  it("trailing exit: topp +10%, fall 2.7% fra topp → trigger", () => {
    const r = evaluateTrailingExit({
      entryPrice: 50000, peakPrice: 55000, currentPrice: 53500,
    });
    expect(r.action).toBe("trailing_exit");
    expect(r.sellFraction).toBe(1);
  });

  it("hold i trailing-sone: aktiv men fall < trailPct", () => {
    const r = evaluateTrailingExit({
      entryPrice: 50000, peakPrice: 55000, currentPrice: 54500,
    });
    expect(r.action).toBe("hold");
    expect(r.newPeak).toBe(55000);
  });

  it("hold under scale-out terskel", () => {
    const r = evaluateTrailingExit({ ...base, currentPrice: 51000, peakPrice: 51000 });
    expect(r.action).toBe("hold");
  });

  it("ny peak oppdateres alltid", () => {
    const r = evaluateTrailingExit({ entryPrice: 50000, peakPrice: 51000, currentPrice: 51200 });
    expect(r.newPeak).toBe(51200);
  });

  it("scale-out pga nye høyder", () => {
    const r = evaluateTrailingExit({
      entryPrice: 50000, peakPrice: 51450, currentPrice: 51500,
      activationPct: 5, trailPct: 3,
    });
    expect(r.action).toBe("scale_out");
    expect(r.sellFraction).toBe(0.5);
  });

  it("trailing exit har sellFraction=1 og peak uendret", () => {
    const r = evaluateTrailingExit({
      entryPrice: 50000, peakPrice: 55000, currentPrice: 53500,
    });
    expect(r.sellFraction).toBe(1);
    expect(r.newPeak).toBe(55000);
  });
});
