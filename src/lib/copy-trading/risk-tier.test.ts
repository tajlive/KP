import { describe, expect, it } from "vitest";
import { inferRiskTier } from "./risk-tier";

describe("inferRiskTier", () => {
  it("returns low when Sharpe and win rate are strong", () => {
    expect(inferRiskTier(1.2, 55)).toBe("low");
    expect(inferRiskTier(2, 60)).toBe("low");
  });

  it("returns high when Sharpe is non-positive or win rate is weak", () => {
    expect(inferRiskTier(0, 50)).toBe("high");
    expect(inferRiskTier(-0.5, 60)).toBe("high");
    expect(inferRiskTier(1.5, 44)).toBe("high");
  });

  it("returns medium for middling combinations", () => {
    expect(inferRiskTier(1, 50)).toBe("medium");
    expect(inferRiskTier(0.8, 50)).toBe("medium");
  });

  it("treats null/undefined as zero for heuristics", () => {
    expect(inferRiskTier(null, null)).toBe("high");
    expect(inferRiskTier(undefined, undefined)).toBe("high");
    expect(inferRiskTier(2, undefined)).toBe("high");
    expect(inferRiskTier(undefined, 60)).toBe("high");
  });
});
