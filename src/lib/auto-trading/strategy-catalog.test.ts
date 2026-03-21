import { describe, expect, it } from "vitest";
import {
  enrichStrategyConfigForSession,
  normalizeTradingPairSymbol,
  parseInitialCapitalFromConfig,
  parseTradingPairFromConfig,
  getDbRiskLevelEnum,
  resolveProductStrategyId,
} from "./strategy-catalog";

describe("strategy-catalog", () => {
  it("normalizes trading pairs", () => {
    expect(normalizeTradingPairSymbol("btcusdt")).toBe("BTC/USDT");
    expect(normalizeTradingPairSymbol("ETH/USDT")).toBe("ETH/USDT");
    expect(normalizeTradingPairSymbol("")).toBe("BTC/USDT");
  });

  it("parses capital from config", () => {
    expect(parseInitialCapitalFromConfig({ initial_capital: 50000 })).toBe(
      50000,
    );
    expect(parseInitialCapitalFromConfig({ capital_nok: "25000" })).toBe(25000);
    expect(parseInitialCapitalFromConfig({})).toBe(100_000);
  });

  it("parses trading pair from config with fallback", () => {
    expect(parseTradingPairFromConfig("dca_trygg", { symbol: "solusdt" })).toBe(
      "SOL/USDT",
    );
  });

  it("enriches DCA with profile intervals and partial TP", () => {
    const out = enrichStrategyConfigForSession("dca_trygg", {
      weeklyAmount: 500,
    });
    expect(out.weeklyAmount).toBe(500);
    expect(typeof out.interval_minutes).toBe("number");
    expect(out.interval_minutes).toBeGreaterThan(0);
    expect(Array.isArray(out.partial_tp_levels)).toBe(true);
    expect(out.trailing_stop_pct).toBeDefined();
    expect(out.stop_loss_pct).toBeLessThan(0);
  });

  it("syncs grid levels alias for tick", () => {
    const out = enrichStrategyConfigForSession("grid_bot", {
      upperPrice: 80_000,
      lowerPrice: 40_000,
      levels: 12,
    });
    expect(out.grid_levels).toBe(12);
    expect(out.levels).toBe(12);
    expect(out.upper_price).toBe(80_000);
  });

  it("maps DB risk enum", () => {
    expect(getDbRiskLevelEnum("dca_trygg")).toBe("conservative");
    expect(getDbRiskLevelEnum("trend_balansert")).toBe("balanced");
    expect(getDbRiskLevelEnum("ai_copy")).toBe("aggressive");
  });

  it("resolves legacy strategy ids", () => {
    expect(resolveProductStrategyId("dca")).toBe("dca_trygg");
    expect(resolveProductStrategyId("grid")).toBe("grid_bot");
    expect(resolveProductStrategyId("dca_trygg")).toBe("dca_trygg");
  });
});
