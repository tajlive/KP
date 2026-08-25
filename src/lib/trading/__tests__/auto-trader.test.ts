/**
 * Tests for AutoTrader and runNextGenAutoTrading
 */
import { describe, it, expect } from "vitest";
import { AutoTrader, runNextGenAutoTrading } from "../auto-trader";
import type {
  AutoTradingConfig,
  TradingSignal,
} from "@/lib/supabase/auto-trading";

function makeConfig(overrides?: Partial<AutoTradingConfig>): AutoTradingConfig {
  return {
    id: "test-id",
    user_id: "user-123",
    enabled: true,
    mode: "paper",
    risk_level: "medium",
    max_trade_size_nok: 10000,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    ...overrides,
  };
}

function makeSignal(overrides?: Partial<TradingSignal>): TradingSignal {
  return {
    id: "sig-1",
    symbol: "BTC",
    action: "buy",
    confidence: 80,
    price: 900000,
    reasoning: "Test signal",
    created_at: new Date().toISOString(),
    ...overrides,
  };
}

describe("AutoTrader", () => {
  describe("shouldExecute", () => {
    it("executes signal with high confidence for medium risk (≥60)", async () => {
      const trader = new AutoTrader(makeConfig());
      expect(await trader.shouldExecute(makeSignal({ confidence: 60 }))).toBe(
        true,
      );
      expect(await trader.shouldExecute(makeSignal({ confidence: 80 }))).toBe(
        true,
      );
    });

    it("rejects signal with low confidence for medium risk (<60)", async () => {
      const trader = new AutoTrader(makeConfig());
      expect(await trader.shouldExecute(makeSignal({ confidence: 59 }))).toBe(
        false,
      );
      expect(await trader.shouldExecute(makeSignal({ confidence: 0 }))).toBe(
        false,
      );
    });

    it("executes lower confidence for high risk (≥40)", async () => {
      const trader = new AutoTrader(makeConfig({ risk_level: "high" }));
      expect(await trader.shouldExecute(makeSignal({ confidence: 40 }))).toBe(
        true,
      );
      expect(await trader.shouldExecute(makeSignal({ confidence: 39 }))).toBe(
        false,
      );
    });

    it("requires ≥75 confidence for low risk", async () => {
      const trader = new AutoTrader(makeConfig({ risk_level: "low" }));
      expect(await trader.shouldExecute(makeSignal({ confidence: 75 }))).toBe(
        true,
      );
      expect(await trader.shouldExecute(makeSignal({ confidence: 74 }))).toBe(
        false,
      );
    });

    it("falls back to threshold 60 when risk_level is unknown", async () => {
      // TypeScript prevents this at compile time, but at runtime any value is possible
      const config = makeConfig() as AutoTradingConfig;
      (config as Record<string, unknown>).risk_level = "extreme";
      const trader = new AutoTrader(config);
      expect(await trader.shouldExecute(makeSignal({ confidence: 60 }))).toBe(
        true,
      );
      expect(await trader.shouldExecute(makeSignal({ confidence: 59 }))).toBe(
        false,
      );
    });

    it("rejects stale signals older than 15 minutes", async () => {
      const trader = new AutoTrader(makeConfig());
      const stale = makeSignal({
        created_at: new Date(Date.now() - 16 * 60 * 1000).toISOString(), // 16 min
      });
      expect(await trader.shouldExecute(stale)).toBe(false);
    });

    it("accepts signals just under 15 minutes old", async () => {
      const trader = new AutoTrader(makeConfig());
      const fresh = makeSignal({
        created_at: new Date(Date.now() - 14 * 60 * 1000).toISOString(), // 14 min
      });
      expect(await trader.shouldExecute(fresh)).toBe(true);
    });

    it("accepts signals exactly at 15-minute boundary (not older than 15 min)", async () => {
      const trader = new AutoTrader(makeConfig());
      const edgeSignal = makeSignal({
        created_at: new Date(Date.now() - 15 * 60 * 1000).toISOString(), // exactly 15 min
      });
      // age = 15 * 60 * 1000, which is NOT > MAX_SIGNAL_AGE_MS (15 * 60 * 1000),
      // so it should be accepted (if confidence is high enough)
      expect(await trader.shouldExecute(edgeSignal)).toBe(true);
    });
  });

  describe("calculateTradeSize", () => {
    it("returns fraction of max trade size proportional to confidence", () => {
      const trader = new AutoTrader(makeConfig());
      const qty = trader.calculateTradeSize(
        makeSignal({ confidence: 80, price: 100_000 }),
      );
      // tradeValueNok = 10000 * (80/100) = 8000
      // qty = 8000 / 100000 = 0.08
      expect(qty).toBe(0.08);
    });

    it("caps at max trade size when confidence is 100", () => {
      const trader = new AutoTrader(makeConfig());
      const qty = trader.calculateTradeSize(
        makeSignal({ confidence: 100, price: 100_000 }),
      );
      // tradeValueNok = 10000 * 1 = 10000
      // qty = 10000 / 100000 = 0.1
      expect(qty).toBe(0.1);
    });

    it("caps at max trade size when confidence exceeds 100", () => {
      const trader = new AutoTrader(makeConfig());
      const qty = trader.calculateTradeSize(
        makeSignal({ confidence: 200, price: 100_000 }),
      );
      // Math.min(200/100, 1) = 1 → same as 100%
      expect(qty).toBe(0.1);
    });

    it("handles zero confidence gracefully", () => {
      const trader = new AutoTrader(makeConfig());
      const qty = trader.calculateTradeSize(
        makeSignal({ confidence: 0, price: 100_000 }),
      );
      expect(qty).toBe(0);
    });

    it("returns Infinity when price is 0 (division by zero)", () => {
      const trader = new AutoTrader(makeConfig());
      const qty = trader.calculateTradeSize(
        makeSignal({ confidence: 50, price: 0 }),
      );
      expect(qty).toBe(Infinity);
    });

    it("handles different max_trade_size_nok values", () => {
      const trader = new AutoTrader(makeConfig({ max_trade_size_nok: 5000 }));
      const qty = trader.calculateTradeSize(
        makeSignal({ confidence: 50, price: 100_000 }),
      );
      // 5000 * 0.5 / 100000 = 0.025
      expect(qty).toBe(0.025);
    });
  });
});

describe("runNextGenAutoTrading", () => {
  it("returns an empty array (stub while SmartTrader v2 is in development)", async () => {
    const result = await runNextGenAutoTrading({} as never);
    expect(result).toEqual([]);
  });
});
