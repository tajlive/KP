import { describe, expect, it } from "vitest";
import { resolveTickStrategyEngineKey } from "./strategy-id-aliases";

describe("resolveTickStrategyEngineKey", () => {
  it("maps product IDs to tick engines", () => {
    expect(resolveTickStrategyEngineKey("dca_trygg")).toBe("dca");
    expect(resolveTickStrategyEngineKey("trend_balansert")).toBe(
      "trend_follow",
    );
    expect(resolveTickStrategyEngineKey("multisignal_aktiv")).toBe(
      "multi_signal",
    );
    expect(resolveTickStrategyEngineKey("grid_bot")).toBe("grid");
    expect(resolveTickStrategyEngineKey("ensemble_ai")).toBe("ensemble_ai");
    expect(resolveTickStrategyEngineKey("ai_copy")).toBe("multi_signal");
  });

  it("accepts legacy cron IDs", () => {
    expect(resolveTickStrategyEngineKey("dca")).toBe("dca");
    expect(resolveTickStrategyEngineKey("trend_follow")).toBe("trend_follow");
    expect(resolveTickStrategyEngineKey("ensemble_ai")).toBe("ensemble_ai");
  });

  it("maps BotWizard ai-copy to multi_signal engine", () => {
    expect(resolveTickStrategyEngineKey("ai-copy")).toBe("multi_signal");
    expect(resolveTickStrategyEngineKey("trend")).toBe("trend_follow");
    expect(resolveTickStrategyEngineKey("multi")).toBe("multi_signal");
  });

  it("returns null for unknown", () => {
    expect(resolveTickStrategyEngineKey("nope")).toBeNull();
    expect(resolveTickStrategyEngineKey("")).toBeNull();
    expect(resolveTickStrategyEngineKey(null)).toBeNull();
  });
});
