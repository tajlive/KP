import { describe, expect, it } from "vitest";
import { getFallbackTradingSignals } from "./fallback-signals";

describe("getFallbackTradingSignals", () => {
  it("returns requested limit with stable ids and ISO dates", () => {
    const now = 1_700_000_000_000;
    const three = getFallbackTradingSignals(3, now);
    expect(three).toHaveLength(3);
    expect(three[0]?.id).toBe("fallback-1");
    expect(three[0]?.created_at).toMatch(/^\d{4}-\d{2}-\d{2}T/);
    expect(getFallbackTradingSignals(4, now)).toHaveLength(4);
  });
});
