import { describe, it, expect } from "vitest";
import { resolveRiskLimits } from "@/lib/trading/canonical/risk/limits-resolver";
import {
  PAPER_DEMO_DEFAULT_MAX_DAILY_LOSS_PCT,
  PAPER_DEMO_DEFAULT_MAX_EXPOSURE_PCT,
  PAPER_DEMO_DEFAULT_MAX_POSITION_PCT,
} from "@/lib/trading/paper-demo-risk-defaults";

describe("canonical limits-resolver", () => {
  it("returns paper demo defaults when no profile is provided for paper", () => {
    const limits = resolveRiskLimits("paper", null);
    expect(limits).toBeDefined();
    expect(limits?.maxPositionPct).toBe(PAPER_DEMO_DEFAULT_MAX_POSITION_PCT);
    expect(limits?.maxExposurePct).toBe(PAPER_DEMO_DEFAULT_MAX_EXPOSURE_PCT);
    expect(limits?.maxDailyLossPct).toBe(PAPER_DEMO_DEFAULT_MAX_DAILY_LOSS_PCT);
    expect(limits?.leverageAllowed).toBe(false);
  });

  it("returns undefined for live without profile", () => {
    const limits = resolveRiskLimits("live", null);
    expect(limits).toBeUndefined();
  });

  it("uses profile values for live with profile", () => {
    const limits = resolveRiskLimits("live", {
      id: "live-1",
      name: "Aggressiv",
      max_position_pct: 5,
      max_exposure_pct: 10,
      max_daily_loss_pct: 2,
      allowed_pairs: ["BTCUSDT"],
      leverage_allowed: true,
    });
    expect(limits?.maxPositionPct).toBe(5);
    expect(limits?.allowedPairs).toEqual(["BTCUSDT"]);
    expect(limits?.leverageAllowed).toBe(true);
  });

  it("includes paper UI symbols in allowed pairs for paper", () => {
    const limits = resolveRiskLimits("paper", {
      id: "paper-1",
      name: "Test",
      max_position_pct: 2,
      max_exposure_pct: 5,
      max_daily_loss_pct: 1,
      allowed_pairs: ["BTCUSDT"],
      leverage_allowed: false,
    });
    expect(limits?.allowedPairs).toContain("BTCUSDT");
    expect(limits?.allowedPairs?.length).toBeGreaterThan(1);
  });
});
