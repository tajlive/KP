import { describe, it, expect } from "vitest";
import {
  evaluateDrawdownKill,
  evaluateProgressiveDrawdown,
  shouldActivateFivePair,
  REDUCE_THRESHOLD_PCT,
  REDUCED_SIZE_MULTIPLIER,
} from "../kraken-kill-switch";

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

describe("evaluateProgressiveDrawdown (Task 4b — Basso: reduser 2x drawdown)", () => {
  const START = 138.66;

  it("normal nivå ved drawdown <= 7% — full størrelse", () => {
    // 131.73 = 5% drawdown
    const r = evaluateProgressiveDrawdown({ equityUsdc: 131.73, initialEquityUsdc: START });
    expect(r.level).toBe("normal");
    expect(r.levelSizeMultiplier).toBe(1);
    expect(r.shouldKill).toBe(false);
  });

  it("normal nøyaktig ved 7%-grensen (7% er IKKE halvering ennå)", () => {
    // 129.0 = 6.97% drawdown — under 7%-grensen
    const r = evaluateProgressiveDrawdown({ equityUsdc: 129, initialEquityUsdc: START });
    expect(r.level).toBe("normal");
    expect(r.levelSizeMultiplier).toBe(1);
  });

  it("reduced ved drawdown mellom 7% og 15% — halverte nivåstørrelser", () => {
    // 125 = 9.85% drawdown
    const r = evaluateProgressiveDrawdown({ equityUsdc: 125, initialEquityUsdc: START });
    expect(r.level).toBe("reduced");
    expect(r.levelSizeMultiplier).toBe(REDUCED_SIZE_MULTIPLIER);
    expect(r.levelSizeMultiplier).toBe(0.5);
    expect(r.shouldKill).toBe(false);
  });

  it("kill ved drawdown > 15% — full stopp, ingen nye nivåer", () => {
    // 116.47 = 16% drawdown
    const r = evaluateProgressiveDrawdown({ equityUsdc: 116.47, initialEquityUsdc: START });
    expect(r.level).toBe("kill");
    expect(r.levelSizeMultiplier).toBe(0);
    expect(r.shouldKill).toBe(true);
  });

  it("kill-terskelen er fortsatt konfigurerbar", () => {
    const r = evaluateProgressiveDrawdown({
      equityUsdc: 125,
      initialEquityUsdc: START,
      killThresholdPct: 0.1, // 9.85% > 10%? nei — 9.85 < 10 → reduced, ikke kill
    });
    expect(r.level).toBe("reduced");
    const r2 = evaluateProgressiveDrawdown({
      equityUsdc: 123,
      initialEquityUsdc: START,
      killThresholdPct: 0.1, // 11.3% > 10% → kill
    });
    expect(r2.level).toBe("kill");
  });

  it("uenighet med ugyldig startkapital → normal (aldri falsk kill)", () => {
    const r = evaluateProgressiveDrawdown({ equityUsdc: 10, initialEquityUsdc: 0 });
    expect(r.level).toBe("normal");
    expect(r.levelSizeMultiplier).toBe(1);
    expect(r.shouldKill).toBe(false);
  });

  it("drawdown-rapport følger med i resultatet", () => {
    const r = evaluateProgressiveDrawdown({ equityUsdc: 125, initialEquityUsdc: START });
    expect(r.drawdownPct).toBeGreaterThan(9);
    expect(r.drawdownPct).toBeLessThan(10);
    expect(r.remainingPct).toBeGreaterThan(90);
    expect(REDUCE_THRESHOLD_PCT).toBe(0.07);
    expect(REDUCED_SIZE_MULTIPLIER).toBe(0.5);
  });
});

describe("shouldActivateFivePair (Task 6 — 5-par-utvidelse ved 250 USDC)", () => {
  it("aktiverer IKKE under terskelen", () => {
    expect(shouldActivateFivePair(249, false)).toBe(false);
  });

  it("aktiverer nøyaktig ved terskelen", () => {
    expect(shouldActivateFivePair(250, false)).toBe(true);
  });

  it("aktiverer over terskelen", () => {
    expect(shouldActivateFivePair(300, false)).toBe(true);
  });

  it("er idempotent — aldri re-aktivering", () => {
    expect(shouldActivateFivePair(300, true)).toBe(false);
  });

  it("støtter custom terskel (for testing)", () => {
    expect(shouldActivateFivePair(1, false, 1)).toBe(true);
    expect(shouldActivateFivePair(153, false, 250)).toBe(false);
  });
});
