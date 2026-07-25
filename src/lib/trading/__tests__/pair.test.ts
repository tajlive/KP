import { describe, expect, it } from "vitest";
import { normalizePair } from "../pair";

/**
 * Kanonisk par-format: "BTCUSDT" (uten slash, uppercase).
 *
 * Bakgrunn: prod-data 2026-07-25 viste at både "BTCUSDT" og "BTC/USDT"
 * sameksisterte i trading_sessions — det bryter den unike delindeksen
 * idx_unique_active_session (user_id, trading_pair, strategy_id) og all
 * gruppering/aggregering per par.
 */
describe("normalizePair", () => {
  it("fjerner slash og gjør uppercase", () => {
    expect(normalizePair("BTC/USDT")).toBe("BTCUSDT");
  });

  it("er idempotent på kanonisk format", () => {
    expect(normalizePair("BTCUSDT")).toBe("BTCUSDT");
  });

  it("håndterer lowercase", () => {
    expect(normalizePair("btcusdt")).toBe("BTCUSDT");
    expect(normalizePair("btc/usdt")).toBe("BTCUSDT");
  });

  it("håndterer whitespace", () => {
    expect(normalizePair(" BTC / USDT ")).toBe("BTCUSDT");
  });

  it("håndterer andre par", () => {
    expect(normalizePair("AVAX/USDT")).toBe("AVAXUSDT");
    expect(normalizePair("eth/usdt")).toBe("ETHUSDT");
  });
});
