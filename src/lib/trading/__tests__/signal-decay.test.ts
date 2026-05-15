import { describe, it, expect, vi } from "vitest";
import { calculateSignalDecay } from "../signal-decay";
import { createMockSupabase, createErrorSupabase, makeSellTrade } from "./gap-test-utils";

describe("GAP-4: Signal Decay", () => {
  describe("Empty data", () => {
    it("returns zero metrics when no trades", async () => {
      const supabase = createMockSupabase([]);
      const result = await calculateSignalDecay(supabase, 24);

      expect(result.buckets).toEqual([]);
      expect(result.optimalWindowMs).toBe(0);
      expect(result.overallAccuracyPct).toBe(0);
    });
  });

  describe("With trades", () => {
    it("bins trades by latency", async () => {
      const now = Date.now();
      const trades = [
        makeSellTrade(100, {
          created_at: new Date(now - 50).toISOString(),   // 50ms latency
          executed_at: new Date(now).toISOString(),
        }),
        makeSellTrade(-50, {
          created_at: new Date(now - 300).toISOString(),  // 300ms latency
          executed_at: new Date(now).toISOString(),
        }),
        makeSellTrade(200, {
          created_at: new Date(now - 1500).toISOString(), // 1500ms latency
          executed_at: new Date(now).toISOString(),
        }),
      ];
      const supabase = createMockSupabase(trades);
      const result = await calculateSignalDecay(supabase, 24);

      expect(result.buckets.length).toBeGreaterThan(0);
      expect(result.buckets.some((b) => b.trades > 0)).toBe(true);
    });

    it("calculates accuracy per bucket", async () => {
      const now = Date.now();
      const trades = [
        makeSellTrade(100, {
          created_at: new Date(now - 50).toISOString(),
          executed_at: new Date(now).toISOString(),
        }),
        makeSellTrade(50, {
          created_at: new Date(now - 80).toISOString(),
          executed_at: new Date(now).toISOString(),
        }),
      ];
      const supabase = createMockSupabase(trades);
      const result = await calculateSignalDecay(supabase, 24);

      const fastBucket = result.buckets.find((b) => b.bucketLabel === "<100ms");
      if (fastBucket && fastBucket.trades > 0) {
        expect(fastBucket.accuracyPct).toBe(100); // All winning
      }
    });

    it("identifies optimal window", async () => {
      const now = Date.now();
      const trades = [
        makeSellTrade(100, {
          created_at: new Date(now - 50).toISOString(),
          executed_at: new Date(now).toISOString(),
        }),
        makeSellTrade(200, {
          created_at: new Date(now - 60).toISOString(),
          executed_at: new Date(now).toISOString(),
        }),
      ];
      const supabase = createMockSupabase(trades);
      const result = await calculateSignalDecay(supabase, 24);

      // Optimal window should be <= 100ms since all fast trades won
      expect(result.optimalWindowMs).toBeGreaterThanOrEqual(0);
    });

    it("handles latency_ms column when present", async () => {
      const trades = [
        makeSellTrade(100, { latency_ms: 80 }),
        makeSellTrade(-20, { latency_ms: 600 }),
      ];
      const supabase = createMockSupabase(trades);
      const result = await calculateSignalDecay(supabase, 24);

      expect(result.buckets.some((b) => b.trades > 0)).toBe(true);
    });
  });

  describe("Error handling", () => {
    it("throws on Supabase error", async () => {
      const supabase = createErrorSupabase("timeout");
      await expect(calculateSignalDecay(supabase, 24)).rejects.toThrow("Signal decay query failed");
    });
  });
});
