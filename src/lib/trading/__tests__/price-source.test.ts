/**
 * Test: price-source.ts — priskilde i tick-motoren (Task 2 + EU/EØS 2026).
 *
 * EU/EØS-fakta (2026): Kraken er eneste børs (MiCA).
 * Kraken er MiCA-regulert → ALLE brukere får Kraken-priser (fallback til
 * Andre kilder skjer i fetchCandles ved Kraken-feil/par-mangel).
 * priceCacheKey gir unike cache-nøkler per (kilde, symbol) slik at ett symbol
 * kan ha lys fra flere kilder i samme tick.
 */
import { describe, expect, it } from "vitest";
import { pickPriceSource, priceCacheKey } from "../price-source";

describe("pickPriceSource", () => {
  const krakenUserIds = new Set(["user-kraken-1", "user-kraken-2"]);

  it("returnerer kraken for tilkoblede brukere", () => {
    expect(pickPriceSource("user-kraken-1", krakenUserIds)).toBe("kraken");
    expect(pickPriceSource("user-kraken-2", krakenUserIds)).toBe("kraken");
  });

  it("returnerer kraken også for ikke-tilkoblede brukere (EU-sannhet: Kraken default)", () => {
    expect(pickPriceSource("user-normal", krakenUserIds)).toBe("kraken");
  });

  it("returnerer kraken når settet er tomt", () => {
    expect(pickPriceSource("user-x", new Set<string>())).toBe("kraken");
  });

  it("returnerer kraken for ukjent/ubestemt userId", () => {
    expect(pickPriceSource("", krakenUserIds)).toBe("kraken");
    expect(
      pickPriceSource(undefined as unknown as string, krakenUserIds),
    ).toBe("kraken");
  });
});

describe("priceCacheKey", () => {
  it("kombinerer kilde og symbol", () => {
    expect(priceCacheKey("kraken", "BTCUSDT")).toBe("kraken:BTCUSDT");
    expect(priceCacheKey("kraken", "ETHUSDT")).toBe("kraken:ETHUSDT");
  });

  it("gir unike nøkler per kilde for samme symbol", () => {
    expect(priceCacheKey("kraken", "BTCUSDT")).not.toBe(
      priceCacheKey("kraken", "ETHUSDT"),
    );
  });

  it("bevarer symbol-case (cache deles på tvers av kallere)", () => {
    expect(priceCacheKey("kraken", "btcusdt")).toBe("kraken:btcusdt");
  });
});
