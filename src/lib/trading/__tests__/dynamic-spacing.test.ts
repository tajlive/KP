import { describe, it, expect } from "vitest";
import { computeDynamicSpacing } from "../dynamic-spacing";

describe("computeDynamicSpacing", () => {
  it("bruker base spacing ved normal volatilitet (2%)", () => {
    const s = computeDynamicSpacing({
      baseSpacing: 0.01,
      high24h: 65000,
      low24h: 63700, // ~2.0% range
    });
    expect(s).toBeCloseTo(0.01, 3);
  });

  it("reduserer spacing ved lav volatilitet", () => {
    // SOL: high=73.0 low=71.9 → 1.53% range → ratio 0.765
    const s = computeDynamicSpacing({
      baseSpacing: 0.012,
      high24h: 73.0,
      low24h: 71.9,
    });
    // 0.012 × 0.765 ≈ 0.0092, men guardet til 0.01 pga fee
    expect(s).toBe(0.01);
  });

  it("øker spacing ved høy volatilitet (capped ved 1.5x)", () => {
    // 9.2% range → ratio 4.6 → clamped til 1.5 → 0.01 × 1.5 = 0.015
    const s = computeDynamicSpacing({
      baseSpacing: 0.01,
      high24h: 68000,
      low24h: 62000,
    });
    expect(s).toBeCloseTo(0.015, 2);
  });

  it("respekterer fee-guard — aldri under 1.0%", () => {
    // Ekstremt lav volatilitet
    const s = computeDynamicSpacing({
      baseSpacing: 0.01,
      high24h: 64100,
      low24h: 64000, // 0.16% range
    });
    expect(s).toBe(0.01);
  });

  it("bruker base spacing når high/low mangler", () => {
    expect(
      computeDynamicSpacing({ baseSpacing: 0.01, high24h: 0, low24h: 0 }),
    ).toBe(0.01);

    expect(
      computeDynamicSpacing({ baseSpacing: 0.012, high24h: 0, low24h: 100 }),
    ).toBe(0.012); // high = 0 → fallback
  });

  it("bruker base spacing når high <= low (ugyldig)", () => {
    const s = computeDynamicSpacing({
      baseSpacing: 0.01,
      high24h: 100,
      low24h: 200, // high < low → ugyldig
    });
    expect(s).toBe(0.01);
  });

  it("aksepterer egendefinert fee-guard og baseline", () => {
    const s = computeDynamicSpacing({
      baseSpacing: 0.015,
      high24h: 105,
      low24h: 100, // 5% range
      baselineRangePct: 0.05, // baseline = 5% → ratio = 1.0
      feeGuardPct: 0.005, // custom low fee-guard
    });
    expect(s).toBeCloseTo(0.015, 3);
  });

  it("clampet mot maxMultiplier ved ekstrem volatilitet", () => {
    const s = computeDynamicSpacing({
      baseSpacing: 0.01,
      high24h: 100000,
      low24h: 50000, // 100% range → ratio 50 → clamped 1.5
      maxMultiplier: 2.0,
    });
    expect(s).toBeCloseTo(0.01 * 2.0, 3); // custom max 2.0
  });
});
