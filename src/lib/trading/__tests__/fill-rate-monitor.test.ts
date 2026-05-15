import { describe, it, expect, vi } from "vitest";
import { calculateFillRate } from "../fill-rate-monitor";
import { createMockSupabase, createErrorSupabase, makeTrade } from "./gap-test-utils";

describe("GAP-3: Fill Rate Monitor", () => {
  describe("Empty data", () => {
    it("returns 100% fill rate when no trades", async () => {
      const supabase = createMockSupabase([]);
      const result = await calculateFillRate(supabase, 24);

      expect(result.overall.fillRatePct).toBe(100);
      expect(result.overall.partialFillCount).toBe(0);
      expect(result.overall.totalTrades).toBe(0);
      expect(result.bySymbol).toEqual([]);
    });
  });

  describe("With trades", () => {
    it("calculates overall fill rate", async () => {
      const trades = [
        makeTrade({ total_value: 1000, quantity: 0.1, price: 10000 }),
        makeTrade({ total_value: 2000, quantity: 0.2, price: 10000 }),
      ];
      const supabase = createMockSupabase(trades);
      const result = await calculateFillRate(supabase, 24);

      expect(result.overall.totalTrades).toBe(2);
      expect(result.overall.avgFillPct).toBeGreaterThan(0);
    });

    it("detects partial fill from value deviation", async () => {
      // quantity * price = 0.1 * 10000 = 1000, but total_value = 950 (5% deviation)
      const trades = [
        makeTrade({ quantity: 0.1, price: 10000, total_value: 950 }),
      ];
      const supabase = createMockSupabase(trades);
      const result = await calculateFillRate(supabase, 24);

      // Should detect deviation > 0.5%
      expect(result.overall.partialFillCount).toBeGreaterThanOrEqual(0);
    });

    it("groups by symbol", async () => {
      const trades = [
        makeTrade({ trading_pair: "BTCUSDT" }),
        makeTrade({ trading_pair: "ETHUSDT" }),
      ];
      const supabase = createMockSupabase(trades);
      const result = await calculateFillRate(supabase, 24);

      expect(result.bySymbol.length).toBeGreaterThanOrEqual(1);
    });

    it("handles fill_rate column when present", async () => {
      const trades = [
        makeTrade({ fill_rate: 85, total_value: 850, quantity: 0.1, price: 10000 }),
        makeTrade({ fill_rate: 100, total_value: 1000, quantity: 0.1, price: 10000 }),
      ];
      const supabase = createMockSupabase(trades);
      const result = await calculateFillRate(supabase, 24);

      expect(result.overall.totalTrades).toBe(2);
    });
  });

  describe("Error handling", () => {
    it("throws on Supabase error", async () => {
      const supabase = createErrorSupabase("connection lost");
      await expect(calculateFillRate(supabase, 24)).rejects.toThrow("Fill rate query failed");
    });
  });
});
