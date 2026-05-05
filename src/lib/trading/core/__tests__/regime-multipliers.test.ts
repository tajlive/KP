import { describe, it, expect } from "vitest";
import {
  REGIME_SAFETY_MULTIPLIERS,
  applyRegimeMultiplier,
} from "../regime-multipliers";

describe("REGIME_SAFETY_MULTIPLIERS", () => {
  it("has expected multipliers for all regimes", () => {
    expect(REGIME_SAFETY_MULTIPLIERS.bull).toBe(1.0);
    expect(REGIME_SAFETY_MULTIPLIERS.bear).toBe(0.8);
    expect(REGIME_SAFETY_MULTIPLIERS.range).toBe(1.0);
    expect(REGIME_SAFETY_MULTIPLIERS["high-vol"]).toBe(0.3);
    expect(REGIME_SAFETY_MULTIPLIERS.unclear).toBe(0.7);
  });
});

describe("applyRegimeMultiplier", () => {
  it("returns full quantity for bull regime", () => {
    const result = applyRegimeMultiplier(100, "bull");
    expect(result.adjustedQuantity).toBe(100);
    expect(result.multiplier).toBe(1.0);
  });

  it("reduces quantity by 20% for bear regime", () => {
    const result = applyRegimeMultiplier(100, "bear");
    expect(result.adjustedQuantity).toBe(80);
    expect(result.multiplier).toBe(0.8);
  });

  it("reduces quantity by 70% for high-vol regime", () => {
    const result = applyRegimeMultiplier(100, "high-vol");
    expect(result.adjustedQuantity).toBe(30);
    expect(result.multiplier).toBe(0.3);
  });

  it("reduces quantity by 30% for unclear regime", () => {
    const result = applyRegimeMultiplier(100, "unclear");
    expect(result.adjustedQuantity).toBe(70);
    expect(result.multiplier).toBe(0.7);
  });

  it("defaults to 1.0 for unknown regime", () => {
    const result = applyRegimeMultiplier(100, "unknown");
    expect(result.adjustedQuantity).toBe(100);
    expect(result.multiplier).toBe(1.0);
  });

  it("returns unchanged quantity when multiplier is 1.0", () => {
    const result = applyRegimeMultiplier(50, "range");
    expect(result.adjustedQuantity).toBe(50);
  });
});
