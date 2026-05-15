import { describe, it, expect, vi } from "vitest";
import { calculateBacktestLiveGap } from "../backtest-live-gap";
import { createMockSupabase, createErrorSupabase, makeTrade } from "./gap-test-utils";

describe("GAP-2: Backtest vs Live Gap", () => {
  describe("Empty data", () => {
    it("returns empty gap when no live trades", async () => {
      const supabase = createMockSupabase([]);
      const result = await calculateBacktestLiveGap(supabase, 24);

      expect(result.summary.totalLiveReturn).toBe(0);
      expect(result.summary.totalBacktestReturn).toBe(0);
      expect(result.strategies).toEqual([]);
      expect(result.summary.alertTriggered).toBe(false);
    });
  });

  describe("With live trades", () => {
    it("calculates gap per strategy", async () => {
      const trades = [
        makeTrade({
          realized_pnl: 100,
          total_value: 1000,
          strategy_signal: { regime: "sma_crossover" },
        }),
        makeTrade({
          realized_pnl: -50,
          total_value: 1000,
          strategy_signal: { regime: "sma_crossover" },
        }),
      ];
      const supabase = createMockSupabase(trades);
      const result = await calculateBacktestLiveGap(supabase, 24);

      expect(result.strategies.length).toBeGreaterThanOrEqual(1);
      expect(result.summary.worstGapPct).toBeDefined();
    });

    it("does not alert without backtest baseline", async () => {
      const trades = [
        makeTrade({
          realized_pnl: -500,
          total_value: 1000,
          strategy_signal: { regime: "sma_crossover" },
        }),
      ];
      const supabase = createMockSupabase(trades);
      const result = await calculateBacktestLiveGap(supabase, 24);

      // Without backtest data, gap is 0 — no alert
      expect(result.summary.alertTriggered).toBe(false);
      expect(result.strategies[0].gapPct).toBe(0);
    });

    it("groups trades by strategy_id from strategy_signal", async () => {
      const trades = [
        makeTrade({ strategy_signal: { regime: "rsi_mean_reversion" } }),
        makeTrade({ strategy_signal: { regime: "ai_signals" } }),
      ];
      const supabase = createMockSupabase(trades);
      const result = await calculateBacktestLiveGap(supabase, 24);

      expect(result.strategies.length).toBeGreaterThanOrEqual(1);
    });
  });

  describe("Error handling", () => {
    it("throws on Supabase error", async () => {
      const supabase = createErrorSupabase("query failed");
      await expect(calculateBacktestLiveGap(supabase, 24)).rejects.toThrow("Gap query failed");
    });
  });
});
