/**
 * Test: price-source.ts — per-bruker valg av priskilde i tick-motoren (Task 2).
 *
 * Kraken-tilkoblede brukere (rad i user_kraken_keys med is_active=true) får
 * lekepenger-priser fra Kraken; alle andre beholder Binance.
 * priceCacheKey gir unike cache-nøkler per (kilde, symbol) slik at ett symbol
 * kan ha både kraken- og binance-lys i samme tick.
 */
import { describe, expect, it } from "vitest";
import { pickPriceSource, priceCacheKey } from "../price-source";

describe("pickPriceSource", () => {
  const krakenUserIds = new Set(["user-kraken-1", "user-kraken-2"]);

  it("returnerer kraken for tilkoblede brukere", () => {
    expect(pickPriceSource("user-kraken-1", krakenUserIds)).toBe("kraken");
    expect(pickPriceSource("user-kraken-2", krakenUserIds)).toBe("kraken");
  });

  it("returnerer binance for ikke-tilkoblede brukere", () => {
    expect(pickPriceSource("user-normal", krakenUserIds)).toBe("binance");
  });

  it("returnerer binance når settet er tomt", () => {
    expect(pickPriceSource("user-x", new Set<string>())).toBe("binance");
  });

  it("returnerer binance for ukjent/ubestemt userId", () => {
    expect(pickPriceSource("", krakenUserIds)).toBe("binance");
    expect(
      pickPriceSource(undefined as unknown as string, krakenUserIds),
    ).toBe("binance");
  });
});

describe("priceCacheKey", () => {
  it("kombinerer kilde og symbol", () => {
    expect(priceCacheKey("kraken", "BTCUSDT")).toBe("kraken:BTCUSDT");
    expect(priceCacheKey("binance", "ETHUSDT")).toBe("binance:ETHUSDT");
  });

  it("gir unike nøkler per kilde for samme symbol", () => {
    expect(priceCacheKey("kraken", "BTCUSDT")).not.toBe(
      priceCacheKey("binance", "BTCUSDT"),
    );
  });

  it("bevarer symbol-case (cache deles på tvers av kallere)", () => {
    expect(priceCacheKey("binance", "btcusdt")).toBe("binance:btcusdt");
  });
});
