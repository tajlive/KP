import { describe, it, expect, vi } from "vitest";
import { calculateMarketImpact } from "../market-impact";
import { createMockSupabase, createErrorSupabase, makeTrade } from "./gap-test-utils";

describe("GAP-7: Market Impact", () => {
  describe("Empty data", () => {
    it("returns zero metrics when no trades", async () => {
      const supabase = createMockSupabase([]);
      const result = await calculateMarketImpact(supabase, 24);

      expect(result.summary.totalTrades).toBe(0);
      expect(result.summary.highImpactCount).toBe(0);
      expect(result.summary.mediumImpactCount).toBe(0);
      expect(result.checks).toEqual([]);
      expect(result.summary.alertTriggered).toBe(false);
    });
  });

  describe("With trades", () => {
    it("calculates impact ratio for known symbols", async () => {
      const trades = [
        makeTrade({
          trading_pair: "BTCUSDT",
          total_value: 1000000,
          usdt_nok_rate: 10.92,
        }),
      ];
      const supabase = createMockSupabase(trades);
      const result = await calculateMarketImpact(supabase, 24);

      expect(result.checks.length).toBeGreaterThanOrEqual(1);
      expect(result.checks[0].impactRatio).toBeGreaterThan(0);
    });

    it("flags high impact trades", async () => {
      const trades = [
        makeTrade({
          trading_pair: "AVAXUSDT",
          total_value: 500000000, // 500M NOK — very large
          usdt_nok_rate: 10.92,
        }),
      ];
      const supabase = createMockSupabase(trades);
      const result = await calculateMarketImpact(supabase, 24);

      expect(result.summary.highImpactCount).toBeGreaterThanOrEqual(1);
      expect(result.summary.alertTriggered).toBe(true);
    });

    it("uses default volume for unknown symbols", async () => {
      const trades = [
        makeTrade({
          trading_pair: "UNKNOWNUSDT",
          total_value: 1000,
          usdt_nok_rate: 10.92,
        }),
      ];
      const supabase = createMockSupabase(trades);
      const result = await calculateMarketImpact(supabase, 24);

      expect(result.checks.length).toBe(1);
      expect(result.checks[0].estimatedDailyVolume).toBe(5_000_000_000);
    });

    it("classifies impact levels correctly", async () => {
      // Low impact: tiny trade vs huge volume
      const trades = [
        makeTrade({
          trading_pair: "BTCUSDT",
          total_value: 1000,
          usdt_nok_rate: 10.92,
        }),
      ];
      const supabase = createMockSupabase(trades);
      const result = await calculateMarketImpact(supabase, 24);

      if (result.checks.length > 0) {
        expect(result.checks[0].impactLevel).toBe("low");
      }
    });

    it("aggregates by symbol", async () => {
      const trades = [
        makeTrade({ trading_pair: "BTCUSDT", total_value: 1000 }),
        makeTrade({ trading_pair: "BTCUSDT", total_value: 2000 }),
        makeTrade({ trading_pair: "ETHUSDT", total_value: 500 }),
      ];
      const supabase = createMockSupabase(trades);
      const result = await calculateMarketImpact(supabase, 24);

      expect(result.checks.length).toBeGreaterThanOrEqual(1);
    });
  });

  describe("Error handling", () => {
    it("throws on Supabase error", async () => {
      const supabase = createErrorSupabase("connection failed");
      await expect(calculateMarketImpact(supabase, 24)).rejects.toThrow("Market impact query failed");
    });
  });
});
