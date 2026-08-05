import { describe, it, expect } from "vitest";
import { evaluateDrawdownKill } from "../kraken-kill-switch";

describe("evaluateDrawdownKill", () => {
  it("skal IKKE kill ved ingen drawdown (equity = start)", () => {
    const r = evaluateDrawdownKill({ equityUsdc: 138.66, initialEquityUsdc: 138.66 });
    expect(r.shouldKill).toBe(false);
    expect(r.drawdown).toBe(0);
    expect(r.remainingPct).toBe(100);
  });

  it("skal IKKE kill ved liten nedgang (5% < terskel 15%)", () => {
    const r = evaluateDrawdownKill({ equityUsdc: 131.73, initialEquityUsdc: 138.66 });
    expect(r.shouldKill).toBe(false);
    expect(r.drawdownPct).toBeCloseTo(5.0, 1);
    expect(r.remainingPct).toBeCloseTo(95.0, 1);
  });

  it("skal KILL ved drawdown over terskel (16% > 15%)", () => {
    const r = evaluateDrawdownKill({ equityUsdc: 116.47, initialEquityUsdc: 138.66 });
    expect(r.shouldKill).toBe(true);
    expect(r.drawdownPct).toBeGreaterThan(15);
  });

  it("skal KILL nøyaktig ved grensen (15% — rett over terskelen)", () => {
    // 117.861 = 85% av 138.66 → drawdown 15%
    const r = evaluateDrawdownKill({ equityUsdc: 117.85, initialEquityUsdc: 138.66 });
    expect(r.shouldKill).toBe(true); // 0.1500x > 0.15
  });

  it("skal IKKE kill ved ugyldig startkapital (0) — unngår falsk utløsning", () => {
    const r = evaluateDrawdownKill({ equityUsdc: 10, initialEquityUsdc: 0 });
    expect(r.shouldKill).toBe(false);
  });

  it("skal støtte custom terskel (f.eks. 10%)", () => {
    // 125/138.66 → 9.85% drawdown < 10% terskel → ingen kill
    const r = evaluateDrawdownKill({
      equityUsdc: 125,
      initialEquityUsdc: 138.66,
      killThresholdPct: 0.1,
    });
    expect(r.shouldKill).toBe(false);
    // Med 11% terskel og 12% drawdown → kill
    const r2 = evaluateDrawdownKill({
      equityUsdc: 122,
      initialEquityUsdc: 138.66,
      killThresholdPct: 0.11,
    });
    expect(r2.shouldKill).toBe(true); // 12.0% > 11%
  });

  it("skal rapportere gevinst som negativ drawdown (0)", () => {
    const r = evaluateDrawdownKill({ equityUsdc: 150, initialEquityUsdc: 138.66 });
    expect(r.shouldKill).toBe(false);
    expect(r.drawdown).toBe(0); // clamps at 0 — ingen negativ drawdown
    expect(r.remainingPct).toBeGreaterThan(100);
  });
});
