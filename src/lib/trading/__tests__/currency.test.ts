import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  getUsdtToNokRate,
  getUsdtToNokRateAsync,
  usdtToNok,
} from "../currency";

const FALLBACK = 10.92;

describe("Currency Module", () => {
  let originalEnv: string | undefined;

  beforeEach(() => {
    originalEnv = process.env.USDT_NOK_RATE;
    delete process.env.USDT_NOK_RATE;
  });

  afterEach(() => {
    process.env.USDT_NOK_RATE = originalEnv;
  });

  describe("getUsdtToNokRate (sync)", () => {
    it("returns env value when valid", () => {
      process.env.USDT_NOK_RATE = "11.5";
      expect(getUsdtToNokRate()).toBe(11.5);
    });

    it("returns fallback when env is empty", () => {
      process.env.USDT_NOK_RATE = "";
      expect(getUsdtToNokRate()).toBe(FALLBACK);
    });

    it("returns fallback when env is invalid", () => {
      process.env.USDT_NOK_RATE = "not-a-number";
      expect(getUsdtToNokRate()).toBe(FALLBACK);
    });

    it("returns fallback when env is negative", () => {
      process.env.USDT_NOK_RATE = "-5";
      expect(getUsdtToNokRate()).toBe(FALLBACK);
    });

    it("returns fallback when env is zero", () => {
      process.env.USDT_NOK_RATE = "0";
      expect(getUsdtToNokRate()).toBe(FALLBACK);
    });

    it("returns fallback when env is unset", () => {
      expect(getUsdtToNokRate()).toBe(FALLBACK);
    });
  });

  describe("getUsdtToNokRateAsync", () => {
    it("returns env value when valid (skips DB)", async () => {
      process.env.USDT_NOK_RATE = "12.0";
      const result = await getUsdtToNokRateAsync();
      expect(result).toBe(12.0);
    });

    it("queries DB when env is unset", async () => {
      const mockSupabase = {
        from: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              maybeSingle: vi.fn().mockResolvedValue({
                data: { usdt_nok_rate: 11.2 },
              }),
            }),
          }),
        }),
      };
      const result = await getUsdtToNokRateAsync(mockSupabase as unknown as Parameters<typeof getUsdtToNokRateAsync>[0]);
      expect(result).toBe(11.2);
    });

    it("falls back when DB returns null rate", async () => {
      const mockSupabase = {
        from: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              maybeSingle: vi.fn().mockResolvedValue({
                data: { usdt_nok_rate: null },
              }),
            }),
          }),
        }),
      };
      const result = await getUsdtToNokRateAsync(mockSupabase as unknown as Parameters<typeof getUsdtToNokRateAsync>[0]);
      expect(result).toBe(FALLBACK);
    });

    it("falls back when DB query throws", async () => {
      const mockSupabase = {
        from: vi.fn().mockImplementation(() => {
          throw new Error("DB error");
        }),
      };
      const result = await getUsdtToNokRateAsync(mockSupabase as unknown as Parameters<typeof getUsdtToNokRateAsync>[0]);
      expect(result).toBe(FALLBACK);
    });

    it("falls back when no supabase client provided", async () => {
      const result = await getUsdtToNokRateAsync();
      expect(result).toBe(FALLBACK);
    });
  });

  describe("usdtToNok", () => {
    it("converts using default rate", () => {
      expect(usdtToNok(100)).toBe(100 * FALLBACK);
    });

    it("converts using provided rate", () => {
      expect(usdtToNok(100, 11.5)).toBe(1150);
    });

    it("handles zero amount", () => {
      expect(usdtToNok(0)).toBe(0);
    });

    it("handles negative amount", () => {
      expect(usdtToNok(-50)).toBe(-50 * FALLBACK);
    });
  });

  describe("Fallback rate health", () => {
    it("fallback is within reasonable bounds (8–15 NOK/USD)", () => {
      // This test catches stale fallback values
      expect(FALLBACK).toBeGreaterThanOrEqual(8);
      expect(FALLBACK).toBeLessThanOrEqual(15);
    });

    it("DB rate is preferred over fallback", async () => {
      const mockSupabase = {
        from: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              maybeSingle: vi.fn().mockResolvedValue({
                data: { usdt_nok_rate: 11.5 },
              }),
            }),
          }),
        }),
      };
      const result = await getUsdtToNokRateAsync(mockSupabase as unknown as Parameters<typeof getUsdtToNokRateAsync>[0]);
      expect(result).toBe(11.5);
      expect(result).not.toBe(FALLBACK);
    });
  });
});
