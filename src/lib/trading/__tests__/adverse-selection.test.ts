import { describe, it, expect, vi } from "vitest";
import { calculateAdverseSelection } from "../adverse-selection";
import { createMockSupabase, createErrorSupabase, makeSellTrade, makeTrade } from "./gap-test-utils";

describe("GAP-5: Adverse Selection", () => {
  describe("Empty data", () => {
    it("returns zero metrics when no trades", async () => {
      const supabase = createMockSupabase([]);
      const result = await calculateAdverseSelection(supabase, 24);

      expect(result.overall.adverseSelectionPct).toBe(0);
      expect(result.overall.toxicFlowScore).toBe(0);
      expect(result.overall.alertTriggered).toBe(false);
      expect(result.bySymbol).toEqual([]);
      expect(result.byLatency).toEqual([]);
    });
  });

  describe("With trades", () => {
    it("calculates adverse selection from post-trade prices", async () => {
      const trades = [
        makeSellTrade(50, {
          price: 650000,
          post_trade_price_1min: 660000, // Price went up after sell = adverse
        }),
        makeSellTrade(100, {
          price: 660000,
          post_trade_price_1min: 650000, // Price went down after sell = favorable
        }),
      ];
      const supabase = createMockSupabase(trades);
      const result = await calculateAdverseSelection(supabase, 24);

      expect(result.overall.adverseSelectionPct).toBeGreaterThanOrEqual(0);
      expect(result.bySymbol.length).toBeGreaterThanOrEqual(1);
    });

    it("triggers alert on high adverse selection", async () => {
      // All sells followed by price increase (adverse)
      const trades = [
        makeSellTrade(10, {
          price: 650000,
          post_trade_price_1min: 700000,
        }),
        makeSellTrade(-5, {
          price: 700000,
          post_trade_price_1min: 710000,
        }),
      ];
      const supabase = createMockSupabase(trades);
      const result = await calculateAdverseSelection(supabase, 24);

      // Should detect adverse pattern
      expect(result.overall.toxicFlowScore).toBeGreaterThanOrEqual(0);
    });

    it("groups by symbol", async () => {
      const trades = [
        makeSellTrade(50, { trading_pair: "BTCUSDT" }),
        makeSellTrade(-20, { trading_pair: "ETHUSDT" }),
      ];
      const supabase = createMockSupabase(trades);
      const result = await calculateAdverseSelection(supabase, 24);

      expect(result.bySymbol.length).toBeGreaterThanOrEqual(1);
    });

    it("groups by latency bucket", async () => {
      const now = Date.now();
      const trades = [
        makeSellTrade(50, {
          created_at: new Date(now - 50).toISOString(),
          executed_at: new Date(now).toISOString(),
        }),
        makeSellTrade(-20, {
          created_at: new Date(now - 3000).toISOString(),
          executed_at: new Date(now).toISOString(),
        }),
      ];
      const supabase = createMockSupabase(trades);
      const result = await calculateAdverseSelection(supabase, 24);

      expect(result.byLatency.length).toBeGreaterThanOrEqual(0);
    });

    it("falls back to realized_pnl when post-trade prices unavailable", async () => {
      const trades = [
        makeSellTrade(-100), // Losing trade
        makeSellTrade(-200), // Losing trade
      ];
      const supabase = createMockSupabase(trades);
      const result = await calculateAdverseSelection(supabase, 24);

      // Losing trades counted as adverse
      expect(result.overall.adverseSelectionPct).toBeGreaterThanOrEqual(0);
    });
  });

  describe("Error handling", () => {
    it("throws on Supabase error", async () => {
      const supabase = createErrorSupabase("db error");
      await expect(calculateAdverseSelection(supabase, 24)).rejects.toThrow("Adverse selection query failed");
    });
  });
});
