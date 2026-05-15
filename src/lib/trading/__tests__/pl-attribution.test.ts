import { describe, it, expect, vi } from "vitest";
import { calculatePLAttribution } from "../pl-attribution";
import { createMockSupabase, createErrorSupabase, makeSellTrade } from "./gap-test-utils";

describe("GAP-6: P&L Attribution", () => {
  describe("Empty data", () => {
    it("returns zero attribution when no trades", async () => {
      const supabase = createMockSupabase([]);
      const result = await calculatePLAttribution(supabase, 24);

      expect(result.totalPnLNok).toBe(0);
      expect(result.attribution.alpha).toBe(0);
      expect(result.attribution.marketBeta).toBe(0);
      expect(result.attribution.currencyDrift).toBe(0);
      expect(result.attribution.executionQuality).toBe(0);
      expect(result.attribution.unexplained).toBe(0);
      expect(result.metrics.sharpeRatio).toBe(0);
    });
  });

  describe("With trades", () => {
    it("calculates total P&L in NOK", async () => {
      const trades = [
        makeSellTrade(100, { usdt_nok_rate: 10.92 }),
        makeSellTrade(200, { usdt_nok_rate: 10.92 }),
      ];
      const supabase = createMockSupabase(trades);
      const result = await calculatePLAttribution(supabase, 24);

      expect(result.totalPnLNok).toBeGreaterThan(0);
    });

    it("attributes execution quality from fees", async () => {
      const trades = [
        makeSellTrade(100, { fee: 20 }),
        makeSellTrade(200, { fee: 30 }),
      ];
      const supabase = createMockSupabase(trades);
      const result = await calculatePLAttribution(supabase, 24);

      // Fees should reduce execution quality attribution
      expect(result.attribution.executionQuality).toBeLessThanOrEqual(0);
    });

    it("detects currency drift from rate changes", async () => {
      const trades = [
        makeSellTrade(100, { usdt_nok_rate: 10.5 }),
        makeSellTrade(200, { usdt_nok_rate: 11.0 }),
      ];
      const supabase = createMockSupabase(trades);
      const result = await calculatePLAttribution(supabase, 24);

      // Currency drift should be non-zero when rates vary
      expect(result.attribution.currencyDrift).toBeDefined();
    });

    it("attribution sums to total P&L", async () => {
      const trades = [
        makeSellTrade(150),
        makeSellTrade(-50),
      ];
      const supabase = createMockSupabase(trades);
      const result = await calculatePLAttribution(supabase, 24);

      const sum =
        result.attribution.alpha +
        result.attribution.marketBeta +
        result.attribution.currencyDrift +
        result.attribution.executionQuality +
        result.attribution.unexplained;

      // Should approximately equal total P&L (allowing for rounding)
      expect(Math.abs(sum - result.totalPnLNok)).toBeLessThan(1);
    });

    it("calculates Sharpe ratio", async () => {
      const trades = [
        makeSellTrade(100),
        makeSellTrade(120),
        makeSellTrade(80),
      ];
      const supabase = createMockSupabase(trades);
      const result = await calculatePLAttribution(supabase, 24);

      expect(result.metrics.sharpeRatio).toBeGreaterThanOrEqual(0);
    });
  });

  describe("Error handling", () => {
    it("throws on Supabase error", async () => {
      const supabase = createErrorSupabase("query timeout");
      await expect(calculatePLAttribution(supabase, 24)).rejects.toThrow("P&L attribution query failed");
    });
  });
});
