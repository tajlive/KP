import { describe, it, expect } from "vitest";
import { detectMarketRegime, type MarketRegime } from "../grid-strategy";

describe("detectMarketRegime (Task 6b — regime-guard, r/algotrading «size for the regime»)", () => {
  it("sideways ved liten endring uansett volatilitet", () => {
    expect(detectMarketRegime(1, 3)).toBe("sideways");
    expect(detectMarketRegime(-1, 3)).toBe("sideways");
    expect(detectMarketRegime(0, 0)).toBe("sideways");
  });

  it("sideways ved høy endring MEN lav volatilitet (må ha BEGGE)", () => {
    expect(detectMarketRegime(6, 4)).toBe("sideways");
    expect(detectMarketRegime(-6, 4)).toBe("sideways");
  });

  it("sideways ved høy volatilitet MEN lav endring", () => {
    expect(detectMarketRegime(3, 10)).toBe("sideways");
  });

  it("trending_up ved sterk oppgang + høy volatilitet", () => {
    expect(detectMarketRegime(6, 9)).toBe("trending_up");
    expect(detectMarketRegime(10, 12)).toBe("trending_up");
  });

  it("trending_down ved sterk nedgang + høy volatilitet", () => {
    expect(detectMarketRegime(-6, 9)).toBe("trending_down");
    expect(detectMarketRegime(-10, 12)).toBe("trending_down");
  });

  it("nøyaktig ved grensen (5%/8% er fortsatt sideways — terskelen er >)", () => {
    expect(detectMarketRegime(5, 8)).toBe("sideways");
    expect(detectMarketRegime(5.01, 8.01)).toBe("trending_up");
    expect(detectMarketRegime(-5.01, 8.01)).toBe("trending_down");
  });

  it("returnerer kun gyldige regimer", () => {
    const regimes: MarketRegime[] = ["sideways", "trending_up", "trending_down"];
    for (const c of [-10, -5, 0, 5, 10]) {
      for (const v of [0, 5, 8, 12]) {
        expect(regimes).toContain(detectMarketRegime(c, v));
      }
    }
  });
});
