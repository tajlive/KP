import { describe, expect, it } from "vitest";
import {
  matchesModeFilter,
  tradeModeBucket,
} from "@/lib/trading/trade-history-mode";

describe("tradeModeBucket", () => {
  it("treats live case-insensitively", () => {
    expect(tradeModeBucket("live")).toBe("live");
    expect(tradeModeBucket("LIVE")).toBe("live");
  });

  it("maps null, empty, and unknown to paper", () => {
    expect(tradeModeBucket(null)).toBe("paper");
    expect(tradeModeBucket("")).toBe("paper");
    expect(tradeModeBucket("paper")).toBe("paper");
    expect(tradeModeBucket("PAPER")).toBe("paper");
    expect(tradeModeBucket("simulation")).toBe("paper");
  });
});

describe("matchesModeFilter", () => {
  it("all passes any mode", () => {
    expect(matchesModeFilter("live", "all")).toBe(true);
    expect(matchesModeFilter(null, "all")).toBe(true);
  });

  it("paper matches paper bucket", () => {
    expect(matchesModeFilter(null, "paper")).toBe(true);
    expect(matchesModeFilter("paper", "paper")).toBe(true);
  });

  it("live only matches live", () => {
    expect(matchesModeFilter("live", "live")).toBe(true);
    expect(matchesModeFilter("paper", "live")).toBe(false);
    expect(matchesModeFilter(null, "live")).toBe(false);
  });
});
