/**
 * Tester for canonical exchange-rate service.
 *
 * Verifiserer at getNokUsdtRate henter en gyldig rate og at
 * caching-mekanismen fungerer som forventet.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { getNokUsdtRate, clearRateCache } from "@/lib/trading/canonical/exchange-rate";

const VALID_PROXY_RESPONSE = {
  ok: true,
  status: 200,
  data: { symbol: "USDTNOK", price: "10.25000000" },
};

function mockFetch(response: Response) {
  return vi.spyOn(globalThis, "fetch").mockResolvedValue(response);
}

describe("getNokUsdtRate", () => {
  beforeEach(() => {
    clearRateCache();
    vi.restoreAllMocks();
  });

  it("should return a rate between 5 and 20 from the proxy", async () => {
    mockFetch(
      new Response(JSON.stringify(VALID_PROXY_RESPONSE), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }),
    );

    const rate = await getNokUsdtRate();
    expect(rate).toBeGreaterThanOrEqual(5);
    expect(rate).toBeLessThanOrEqual(20);
    // Should match the mocked price
    expect(rate).toBeCloseTo(10.25, 2);
  });

  it("should cache the rate and not call fetch again within 60s", async () => {
    const fetchSpy = mockFetch(
      new Response(JSON.stringify(VALID_PROXY_RESPONSE), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }),
    );

    // First call — should fetch
    const rate1 = await getNokUsdtRate();
    expect(rate1).toBeCloseTo(10.25, 2);
    expect(fetchSpy).toHaveBeenCalledTimes(1);

    // Second call — should use cache, no additional fetch
    const rate2 = await getNokUsdtRate();
    expect(rate2).toBeCloseTo(10.25, 2);
    expect(fetchSpy).toHaveBeenCalledTimes(1);
  });

  it("should fall back to cached value on fetch error", async () => {
    const fetchSpy = mockFetch(
      new Response(JSON.stringify(VALID_PROXY_RESPONSE), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }),
    );

    // First call succeeds and populates cache
    const rate1 = await getNokUsdtRate();
    expect(rate1).toBeCloseTo(10.25, 2);

    // Second call fails — should fall back to cached rate
    fetchSpy.mockRejectedValueOnce(new Error("Network error"));
    const rate2 = await getNokUsdtRate();
    expect(rate2).toBeCloseTo(10.25, 2);
  });

  it("should return default fallback (9.6) when cache is empty and fetch fails", async () => {
    vi.spyOn(globalThis, "fetch").mockRejectedValue(new Error("Network error"));

    const rate = await getNokUsdtRate();
    // 2026-07-31: fallback endret 10.5 → 9.6 (markedsrate). 10.5 var ~8.5 %
    // for høy og forårsaket falske take-profit-exits i PilotTrade.
    expect(rate).toBe(9.6);
  });
});
