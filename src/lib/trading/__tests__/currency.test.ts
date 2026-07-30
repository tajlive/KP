import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// Styr service-role-fallbacken per test (hierarki-trinn 1b)
let serviceRate: number | null = null;
vi.mock("@/lib/supabase/server", () => ({
  createClient: () => {
    if (serviceRate == null) throw new Error("no service client in test");
    return {
      from: () => ({
        select: () => ({
          eq: () => ({
            maybeSingle: async () => ({ data: { usdt_nok_rate: serviceRate } }),
          }),
        }),
      }),
    };
  },
}));

// Kanonisk live-kurs må mockes for deterministiske fallback-tester
vi.mock("@/lib/trading/canonical/exchange-rate", () => ({
  getNokUsdtRate: vi.fn().mockRejectedValue(new Error("network unavailable")),
  clearRateCache: vi.fn(),
}));

import {
  getUsdtToNokRate,
  getUsdtToNokRateAsync,
  usdtToNok,
} from "../currency";

// Oppdatert 2026-07-27 (F3): fallback må henge med markedet (~9.58)
const FALLBACK = 9.6;

function mockUserClient(rate: number | null) {
  return {
    from: vi.fn().mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          maybeSingle: vi.fn().mockResolvedValue({
            data: rate == null ? null : { usdt_nok_rate: rate },
          }),
        }),
      }),
    }),
  } as unknown as Parameters<typeof getUsdtToNokRateAsync>[0];
}

describe("Currency Module", () => {
  let originalEnv: string | undefined;

  beforeEach(() => {
    originalEnv = process.env.USDT_NOK_RATE;
    delete process.env.USDT_NOK_RATE;
    serviceRate = null;
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

  describe("getUsdtToNokRateAsync — hierarki (F3)", () => {
    it("DB-kurs vinner over env (levende kilde først)", async () => {
      process.env.USDT_NOK_RATE = "12.0";
      const result = await getUsdtToNokRateAsync(mockUserClient(9.58));
      expect(result).toBe(9.58);
    });

    it("RLS-blokkert user-klient → service-role-lesing (prod-tilfellet)", async () => {
      // User-context kan ikke lese global_settings (RLS) → null,
      // men service role kan — dette var 14 %-buggen i prod.
      serviceRate = 9.58;
      const result = await getUsdtToNokRateAsync(mockUserClient(null));
      expect(result).toBe(9.58);
    });

    it("env brukes når DB er utilgjengelig (overstyring)", async () => {
      process.env.USDT_NOK_RATE = "12.0";
      const result = await getUsdtToNokRateAsync(mockUserClient(null));
      expect(result).toBe(12.0);
    });

    it("env brukes når ingen klient er gitt", async () => {
      process.env.USDT_NOK_RATE = "12.0";
      const result = await getUsdtToNokRateAsync();
      expect(result).toBe(12.0);
    });

    it("fallback + advarsel når alt feiler (ikke stille forelding)", async () => {
      const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
      const result = await getUsdtToNokRateAsync(mockUserClient(null));
      expect(result).toBe(FALLBACK);
      expect(warn).toHaveBeenCalledWith(
        expect.stringContaining("fallback"),
      );
      warn.mockRestore();
    });

    it("fallback når DB-spørring kaster", async () => {
      const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
      const throwing = {
        from: vi.fn().mockImplementation(() => {
          throw new Error("DB error");
        }),
      } as unknown as Parameters<typeof getUsdtToNokRateAsync>[0];
      const result = await getUsdtToNokRateAsync(throwing);
      expect(result).toBe(FALLBACK);
      warn.mockRestore();
    });

    it("kanonisk live-kurs brukes når DB og env mangler", async () => {
      const { getNokUsdtRate } = await import("@/lib/trading/canonical/exchange-rate");
      vi.mocked(getNokUsdtRate).mockResolvedValueOnce(10.48);
      const result = await getUsdtToNokRateAsync(mockUserClient(null));
      expect(result).toBe(10.48);
    });
  });

  describe("usdtToNok", () => {
    it("converts using default rate", () => {
      expect(usdtToNok(100)).toBe(100 * FALLBACK);
    });

    it("converts using provided rate", () => {
      expect(usdtToNok(100, 9.58)).toBe(958);
    });
  });
});
