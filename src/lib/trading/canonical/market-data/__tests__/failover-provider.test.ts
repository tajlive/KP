/**
 * KLA-305 — FailoverMarketDataProvider
 *
 * Verifiserer:
 * 1. Primary suksess → ingen fallback-kall
 * 2. Primary-feil → fallback brukes
 * 3. Alle 5 metoder videresendes korrekt
 */
import { describe, it, expect, vi } from "vitest";
import { FailoverMarketDataProvider } from "@/lib/trading/canonical/market-data/failover-provider";
import type { MarketDataProvider } from "@/lib/trading/canonical/market-data/types";

function makeProvider(name: string, fail: boolean): MarketDataProvider {
  const p = {
    getPrice: vi.fn(async () => {
      if (fail) throw new Error(`${name} nede`);
      return 76.77;
    }),
    getDepth: vi.fn(async () => {
      if (fail) throw new Error(`${name} nede`);
      return { bids: [], asks: [], timestamp: new Date() };
    }),
    getKlines: vi.fn(async () => {
      if (fail) throw new Error(`${name} nede`);
      return [];
    }),
    get24hChange: vi.fn(async () => {
      if (fail) throw new Error(`${name} nede`);
      return 1.5;
    }),
    get24hSnapshot: vi.fn(async () => {
      if (fail) throw new Error(`${name} nede`);
      return {
        price: 76.77,
        change24hPct: 1.5,
        high24h: 80,
        low24h: 75,
        volume24h: 100,
      };
    }),
  };
  return p as unknown as MarketDataProvider;
}

describe("FailoverMarketDataProvider (KLA-305)", () => {
  it("bruker primary ved suksess — ingen fallback", async () => {
    const primary = makeProvider("kraken", false);
    const fallback = makeProvider("okx", false);
    const provider = new FailoverMarketDataProvider(primary, fallback);

    const price = await provider.getPrice("SOLUSDC");
    expect(price).toBe(76.77);
    expect(primary.getPrice).toHaveBeenCalledTimes(1);
    expect(fallback.getPrice).not.toHaveBeenCalled();
  });

  it("faller tilbake til fallback ved primary-feil", async () => {
    const primary = makeProvider("kraken", true);
    const fallback = makeProvider("okx", false);
    const provider = new FailoverMarketDataProvider(primary, fallback);

    const price = await provider.getPrice("SOLUSDC");
    expect(price).toBe(76.77);
    expect(fallback.getPrice).toHaveBeenCalledTimes(1);
  });

  it("videresender getKlines med alle argumenter", async () => {
    const primary = makeProvider("kraken", true);
    const fallback = makeProvider("okx", false);
    const provider = new FailoverMarketDataProvider(primary, fallback);

    await provider.getKlines("BTCUSDC", "1h", 100, 1000, 2000);
    expect(fallback.getKlines).toHaveBeenCalledWith(
      "BTCUSDC",
      "1h",
      100,
      1000,
      2000,
    );
  });

  it("videresender getDepth og get24hSnapshot", async () => {
    const primary = makeProvider("kraken", true);
    const fallback = makeProvider("okx", false);
    const provider = new FailoverMarketDataProvider(primary, fallback);

    await provider.getDepth("SOLUSDC", 10);
    await provider.get24hSnapshot("SOLUSDC");
    await provider.get24hChange("SOLUSDC");
    expect(fallback.getDepth).toHaveBeenCalledWith("SOLUSDC", 10);
    expect(fallback.get24hSnapshot).toHaveBeenCalledWith("SOLUSDC");
    expect(fallback.get24hChange).toHaveBeenCalledWith("SOLUSDC");
  });

  it("kaster ikke når begge feiler — feilen propageres", async () => {
    const primary = makeProvider("kraken", true);
    const fallback = makeProvider("okx", true);
    const provider = new FailoverMarketDataProvider(primary, fallback);

    await expect(provider.getPrice("SOLUSDC")).rejects.toThrow("okx nede");
  });
});
