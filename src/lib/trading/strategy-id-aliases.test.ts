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

  it("maps strategy UUIDs from strategies table", () => {
    expect(resolveTickStrategyEngineKey("9fab4471-a0d4-4870-9611-44bd69403775")).toBe("dca");
    expect(resolveTickStrategyEngineKey("9febe734-d40e-4a78-b65d-2b346899ca17")).toBe("trend_follow");
    expect(resolveTickStrategyEngineKey("a21f535d-e0f0-4ad5-a1b9-c08a49be12f0")).toBe("multi_signal");
    expect(resolveTickStrategyEngineKey("3caad63a-a043-48fa-82f8-c54b3065130a")).toBe("grid");
    expect(resolveTickStrategyEngineKey("071a6106-ae28-49f2-93e5-cec281e33fc5")).toBe("multi_signal");
    expect(resolveTickStrategyEngineKey("39cae21a-7449-43aa-b202-727227d30168")).toBe("multi_signal");
    expect(resolveTickStrategyEngineKey("c49a9302-65bd-48ec-b5d6-51dff32e4b0e")).toBe("multi_signal");
    expect(resolveTickStrategyEngineKey("55903760-304a-4824-920b-f5bfc5530c45")).toBe("multi_signal");
    expect(resolveTickStrategyEngineKey("d238229f-b837-4816-a846-9655b3f77e28")).toBe("multi_signal");
  });

  it("returns null for unknown", () => {
    expect(resolveTickStrategyEngineKey("nope")).toBeNull();
    expect(resolveTickStrategyEngineKey("")).toBeNull();
    expect(resolveTickStrategyEngineKey(null)).toBeNull();
  });
});
