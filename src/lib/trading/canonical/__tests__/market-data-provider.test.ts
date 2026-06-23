/**
 * Tester for kanonisk markedsdata-provider (Binance implementasjon).
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { BinanceMarketDataProvider } from "../market-data/binance-provider";

describe("BinanceMarketDataProvider", () => {
  let provider: BinanceMarketDataProvider;

  beforeEach(() => {
    provider = new BinanceMarketDataProvider();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("getPrice", () => {
    it("returns parsed price", async () => {
      vi.stubGlobal(
        "fetch",
        vi.fn().mockResolvedValue({
          ok: true,
          json: async () => ({ price: "42345.67" }),
        }),
      );

      const price = await provider.getPrice("BTCUSDT");
      expect(price).toBe(42345.67);
      expect(fetch).toHaveBeenCalledWith(
        "https://api.binance.com/api/v3/ticker/price?symbol=BTCUSDT",
        expect.objectContaining({ signal: expect.any(AbortSignal) }),
      );
    });

    it("uppercases symbol", async () => {
      vi.stubGlobal(
        "fetch",
        vi.fn().mockResolvedValue({
          ok: true,
          json: async () => ({ price: "1.23" }),
        }),
      );

      await provider.getPrice("btcusdt");
      expect(fetch).toHaveBeenCalledWith(
        expect.stringContaining("symbol=BTCUSDT"),
        expect.anything(),
      );
    });

    it("throws on non-ok response", async () => {
      vi.stubGlobal(
        "fetch",
        vi.fn().mockResolvedValue({
          ok: false,
          status: 400,
        }),
      );

      await expect(provider.getPrice("BTCUSDT")).rejects.toThrow(
        "Binance API error: 400",
      );
    });
  });

  describe("getDepth", () => {
    it("returns order book snapshot with default limit", async () => {
      vi.stubGlobal(
        "fetch",
        vi.fn().mockResolvedValue({
          ok: true,
          json: async () => ({
            bids: [["100.0", "1.5"]],
            asks: [["101.0", "2.5"]],
          }),
        }),
      );

      const depth = await provider.getDepth("ETHUSDT");
      expect(depth.bids).toEqual([{ price: 100, quantity: 1.5 }]);
      expect(depth.asks).toEqual([{ price: 101, quantity: 2.5 }]);
      expect(depth.timestamp).toBeInstanceOf(Date);
      expect(fetch).toHaveBeenCalledWith(
        "https://api.binance.com/api/v3/depth?symbol=ETHUSDT&limit=20",
        expect.anything(),
      );
    });

    it("respects custom limit", async () => {
      vi.stubGlobal(
        "fetch",
        vi.fn().mockResolvedValue({
          ok: true,
          json: async () => ({ bids: [], asks: [] }),
        }),
      );

      await provider.getDepth("BTCUSDT", 5);
      expect(fetch).toHaveBeenCalledWith(
        "https://api.binance.com/api/v3/depth?symbol=BTCUSDT&limit=5",
        expect.anything(),
      );
    });
  });

  describe("getKlines", () => {
    it("returns parsed klines", async () => {
      const candle = [
        1_700_000_000_000,
        "100.0",
        "110.0",
        "90.0",
        "105.0",
        "1000.0",
      ];
      vi.stubGlobal(
        "fetch",
        vi.fn().mockResolvedValue({
          ok: true,
          json: async () => [candle],
        }),
      );

      const klines = await provider.getKlines("BTCUSDT", "1d", 10);
      expect(klines).toHaveLength(1);
      expect(klines[0]).toEqual({
        timestamp: 1_700_000_000_000,
        open: 100,
        high: 110,
        low: 90,
        close: 105,
        volume: 1000,
      });
      expect(fetch).toHaveBeenCalledWith(
        "https://api.binance.com/api/v3/klines?symbol=BTCUSDT&interval=1d&limit=10",
        expect.anything(),
      );
    });

    it("throws on network error", async () => {
      vi.stubGlobal(
        "fetch",
        vi.fn().mockRejectedValue(new Error("Network failure")),
      );

      await expect(provider.getKlines("BTCUSDT", "1h", 100)).rejects.toThrow(
        "Network failure",
      );
    });
  });

  describe("get24hChange", () => {
    it("returns parsed 24h change percentage", async () => {
      vi.stubGlobal(
        "fetch",
        vi.fn().mockResolvedValue({
          ok: true,
          json: async () => ({ priceChangePercent: "-2.45" }),
        }),
      );

      const change = await provider.get24hChange("BTCUSDT");
      expect(change).toBe(-2.45);
      expect(fetch).toHaveBeenCalledWith(
        "https://api.binance.com/api/v3/ticker/24hr?symbol=BTCUSDT",
        expect.objectContaining({ signal: expect.any(AbortSignal) }),
      );
    });

    it("uppercases symbol", async () => {
      vi.stubGlobal(
        "fetch",
        vi.fn().mockResolvedValue({
          ok: true,
          json: async () => ({ priceChangePercent: "5.67" }),
        }),
      );

      await provider.get24hChange("btcusdt");
      expect(fetch).toHaveBeenCalledWith(
        expect.stringContaining("symbol=BTCUSDT"),
        expect.anything(),
      );
    });

    it("throws on non-ok response", async () => {
      vi.stubGlobal(
        "fetch",
        vi.fn().mockResolvedValue({
          ok: false,
          status: 500,
        }),
      );

      await expect(provider.get24hChange("BTCUSDT")).rejects.toThrow(
        "Binance API error: 500",
      );
    });
  });
});
