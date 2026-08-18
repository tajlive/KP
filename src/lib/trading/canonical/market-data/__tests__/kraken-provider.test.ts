/**
 * Tester for KrakenMarketDataProvider — Kraken public REST (OHLC/Ticker/Depth).
 *
 * Mockede fetch-kall med realistiske Kraken-responser.
 * Format-notater:
 *  - OHLC: { [pair]: [[time, open, high, low, close, vwap, volume, count], ...], last }
 *    (time i UNIX-sekunder, priser som strenger; filtrer ut "last"-nøkkelen)
 *  - Ticker: result[pair].c[0] = siste pris
 *  - Depth: result[pair].bids/asks = [price, qty][]
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { KrakenMarketDataProvider } from "../kraken-provider";

const API = "https://api.kraken.com/0/public";

const EXPECTED_HEADERS = {
  Accept: "application/json",
  "User-Agent": "Klarpakke/1.0",
};

function okResponse(body: unknown) {
  return { ok: true, json: async () => body };
}

function tickerResult(pair: string, price: string) {
  return { error: [], result: { [pair]: { c: [price, "0.123"] } } };
}

function ohlcResult(pair: string, candles: unknown[], last = 0) {
  return { error: [], result: { [pair]: candles, last } };
}

function depthResult(
  pair: string,
  bids: [string, string][],
  asks: [string, string][],
) {
  return { error: [], result: { [pair]: { bids, asks } } };
}

/** Bygger N 1h-lys med close = 100 + i (eldst → nyest). */
function buildHourlyCandles(count: number, startSeconds = 1_700_000_000) {
  return Array.from({ length: count }, (_, i) => [
    startSeconds + i * 3600,
    (100 + i).toFixed(2),
    (101 + i).toFixed(2),
    (99 + i).toFixed(2),
    (100 + i).toFixed(2),
    "0", // vwap
    "10.5", // volume
    "123", // count
  ]);
}

describe("KrakenMarketDataProvider", () => {
  let provider: KrakenMarketDataProvider;

  beforeEach(() => {
    provider = new KrakenMarketDataProvider();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  describe("symbol-mapping (interne → Kraken USDC-par)", () => {
    it.each([
      ["BTCUSDT", "XBTUSDC"],
      ["ETHUSDT", "ETHUSDC"],
      ["SOLUSDT", "SOLUSDC"],
      ["AVAXUSDT", "AVAXUSDC"],
      ["DOGEUSDT", "XDGUSDC"],
      ["LINKUSDT", "LINKUSDC"],
      ["ADAUSDT", "ADAUSDC"],
      ["DOTUSDT", "DOTUSDC"],
      ["POLUSDT", "POLUSD"],
    ])("mapper %s → %s", async (internal, kraken) => {
      const mockFetch = vi
        .fn()
        .mockResolvedValue(okResponse(tickerResult(kraken, "1.23")));
      vi.stubGlobal("fetch", mockFetch);

      await provider.getPrice(internal);

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining(`pair=${kraken}`),
        expect.anything(),
      );
    });

    it("kaster KRAKEN_PAIR_UNAVAILABLE for ukjent symbol", async () => {
      const mockFetch = vi.fn();
      vi.stubGlobal("fetch", mockFetch);

      await expect(provider.getPrice("XXUSDT")).rejects.toThrow(
        "KRAKEN_PAIR_UNAVAILABLE: XXUSDT",
      );
      expect(mockFetch).not.toHaveBeenCalled();
    });

    it("normaliserer små bokstaver og skråstrek før mapping", async () => {
      const mockFetch = vi
        .fn()
        .mockResolvedValue(okResponse(tickerResult("XBTUSDC", "1.23")));
      vi.stubGlobal("fetch", mockFetch);

      await provider.getPrice("btc/usdt");

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining("pair=XBTUSDC"),
        expect.anything(),
      );
    });
  });

  describe("getPrice", () => {
    it("returnerer ticker c[0] som number", async () => {
      const mockFetch = vi
        .fn()
        .mockResolvedValue(okResponse(tickerResult("XBTUSDC", "64820.61")));
      vi.stubGlobal("fetch", mockFetch);

      const price = await provider.getPrice("BTCUSDT");

      expect(price).toBe(64820.61);
      expect(mockFetch).toHaveBeenCalledWith(
        `${API}/Ticker?pair=XBTUSDC`,
        expect.objectContaining({
          signal: expect.any(AbortSignal),
          headers: EXPECTED_HEADERS,
        }),
      );
    });

    it("cacher pris innenfor TTL (10s) — samme symbol re-fetcher ikke", async () => {
      const mockFetch = vi
        .fn()
        .mockResolvedValue(okResponse(tickerResult("XBTUSDC", "64820.61")));
      vi.stubGlobal("fetch", mockFetch);

      const first = await provider.getPrice("BTCUSDT");
      const second = await provider.getPrice("BTCUSDT");

      expect(first).toBe(64820.61);
      expect(second).toBe(64820.61);
      expect(mockFetch).toHaveBeenCalledTimes(1);
    });

    it("cacher per symbol — ulike symboler gir hvert sitt kall", async () => {
      const mockFetch = vi
        .fn()
        .mockResolvedValueOnce(okResponse(tickerResult("XBTUSDC", "1.0")))
        .mockResolvedValueOnce(okResponse(tickerResult("ETHUSDC", "2.0")));
      vi.stubGlobal("fetch", mockFetch);

      await provider.getPrice("BTCUSDT");
      await provider.getPrice("ETHUSDT");

      expect(mockFetch).toHaveBeenCalledTimes(2);
    });

    it("re-fetcher etter at TTL har utløpt", async () => {
      vi.useFakeTimers();
      const mockFetch = vi
        .fn()
        .mockResolvedValueOnce(okResponse(tickerResult("XBTUSDC", "100.0")))
        .mockResolvedValueOnce(okResponse(tickerResult("XBTUSDC", "200.0")));
      vi.stubGlobal("fetch", mockFetch);

      expect(await provider.getPrice("BTCUSDT")).toBe(100);
      vi.advanceTimersByTime(10_001);
      expect(await provider.getPrice("BTCUSDT")).toBe(200);

      expect(mockFetch).toHaveBeenCalledTimes(2);
    });

    it("kaster ved HTTP-feil", async () => {
      vi.stubGlobal(
        "fetch",
        vi.fn().mockResolvedValue({ ok: false, status: 500 }),
      );

      await expect(provider.getPrice("BTCUSDT")).rejects.toThrow();
    });

    it("kaster ved Kraken error-array i respons", async () => {
      vi.stubGlobal(
        "fetch",
        vi
          .fn()
          .mockResolvedValue(
            okResponse({ error: ["EQuery:Unknown asset pair"], result: {} }),
          ),
      );

      await expect(provider.getPrice("BTCUSDT")).rejects.toThrow(
        "EQuery:Unknown asset pair",
      );
    });
  });

  describe("getKlines", () => {
    it("mapper OHLC-array → Kline[] (ms-timestamp, filtrerer last)", async () => {
      const candles = [
        [
          1722873600,
          "100.0",
          "110.0",
          "90.0",
          "105.0",
          "1000.0",
          "500.0",
          "42",
        ],
      ];
      const mockFetch = vi
        .fn()
        .mockResolvedValue(
          okResponse(ohlcResult("XBTUSDC", candles, 1_722_879_600)),
        );
      vi.stubGlobal("fetch", mockFetch);

      const klines = await provider.getKlines("BTCUSDT", "1h", 100);

      expect(klines).toHaveLength(1);
      expect(klines[0]).toEqual({
        timestamp: 1_722_873_600_000, // sekunder → ms
        open: 100,
        high: 110,
        low: 90,
        close: 105,
        volume: 500, // indeks 6 (5 = vwap)
      });
      expect(mockFetch).toHaveBeenCalledWith(
        `${API}/OHLC?pair=XBTUSDC&interval=60`,
        expect.anything(),
      );
    });

    it("beholder kun de siste `limit` lysene", async () => {
      const candles = buildHourlyCandles(4, 1_700_000_000);
      vi.stubGlobal(
        "fetch",
        vi.fn().mockResolvedValue(okResponse(ohlcResult("XBTUSDC", candles))),
      );

      const klines = await provider.getKlines("BTCUSDT", "1h", 2);

      expect(klines).toHaveLength(2);
      expect(klines[0].timestamp).toBe(1_700_007_200_000); // 3. lys
      expect(klines[1].timestamp).toBe(1_700_010_800_000); // 4. lys
    });

    it("konverterer startTime (ms) → since (UNIX-sekunder)", async () => {
      vi.stubGlobal(
        "fetch",
        vi
          .fn()
          .mockResolvedValue(
            okResponse(ohlcResult("XBTUSDC", buildHourlyCandles(2))),
          ),
      );

      await provider.getKlines("BTCUSDT", "1h", 100, 1_722_873_600_000);

      expect(fetch).toHaveBeenCalledWith(
        expect.stringContaining("since=1722873600"),
        expect.anything(),
      );
      expect(fetch).not.toHaveBeenCalledWith(
        expect.stringContaining("since=1722873600000"),
        expect.anything(),
      );
    });

    it("filtrerer lys nyere enn endTime (ms)", async () => {
      // Lys med 1s mellomrom: 1000..1004 s → 1_000_000..1_004_000 ms
      const candles = Array.from({ length: 5 }, (_, i) => [
        1000 + i,
        "100.0",
        "101.0",
        "99.0",
        "100.0",
        "0",
        "10.5",
        "1",
      ]);
      vi.stubGlobal(
        "fetch",
        vi.fn().mockResolvedValue(okResponse(ohlcResult("XBTUSDC", candles))),
      );

      const klines = await provider.getKlines(
        "BTCUSDT",
        "1h",
        100,
        undefined,
        1_002_000,
      );

      expect(klines).toHaveLength(3);
      expect(klines[klines.length - 1].timestamp).toBe(1_002_000);
    });

    it.each([
      ["15m", 15],
      ["1h", 60],
      ["4h", 240],
    ])("mapper intervall %s → %i", async (interval, krakenInterval) => {
      vi.stubGlobal(
        "fetch",
        vi
          .fn()
          .mockResolvedValue(
            okResponse(ohlcResult("ETHUSDC", buildHourlyCandles(2))),
          ),
      );

      await provider.getKlines("ETHUSDT", interval, 100);

      expect(fetch).toHaveBeenCalledWith(
        expect.stringContaining(`interval=${krakenInterval}`),
        expect.anything(),
      );
    });

    it("kaster for ukjent intervall", async () => {
      const mockFetch = vi.fn();
      vi.stubGlobal("fetch", mockFetch);

      await expect(provider.getKlines("BTCUSDT", "2d", 100)).rejects.toThrow(
        "KRAKEN_INTERVAL_UNAVAILABLE: 2d",
      );
      expect(mockFetch).not.toHaveBeenCalled();
    });
  });

  describe("get24hChange", () => {
    it("beregner endring fra 24 stk 1h-lys: (close[-1] - close[-24]) / close[-24] * 100", async () => {
      // close = 100..123 → (123 - 100) / 100 * 100 = 23
      vi.stubGlobal(
        "fetch",
        vi
          .fn()
          .mockResolvedValue(
            okResponse(ohlcResult("XBTUSDC", buildHourlyCandles(24))),
          ),
      );

      const change = await provider.get24hChange("BTCUSDT");

      expect(change).toBeCloseTo(23, 5);
      expect(fetch).toHaveBeenCalledWith(
        expect.stringContaining("pair=XBTUSDC"),
        expect.anything(),
      );
      expect(fetch).toHaveBeenCalledWith(
        expect.stringContaining("interval=60"),
        expect.anything(),
      );
    });

    it("kaster hvis det ikke finnes nok lys", async () => {
      vi.stubGlobal(
        "fetch",
        vi.fn().mockResolvedValue(okResponse(ohlcResult("XBTUSDC", []))),
      );

      await expect(provider.get24hChange("BTCUSDT")).rejects.toThrow();
    });
  });

  describe("get24hSnapshot", () => {
    it("returnerer Market24hSnapshot fra ticker", async () => {
      const pair = "XBTUSDC";
      const body = {
        error: [],
        result: {
          [pair]: {
            c: ["64562.78", "0.5"],
            h: ["64990.11", "64990.11"],
            l: ["64001.46", "64001.46"],
            o: ["64471.70", "64471.70"],
            v: ["265.39", "265.39"],
          },
        },
      };
      vi.stubGlobal("fetch", vi.fn().mockResolvedValue(okResponse(body)));

      const snap = await provider.get24hSnapshot("BTCUSDT");

      expect(snap.price).toBe(64562.78);
      expect(snap.change24hPct).toBeCloseTo(
        ((64562.78 - 64471.7) / 64471.7) * 100,
        5,
      );
    });

    it("clamper absurd change24hPct til 0 (Kraken o[1]-søppel, 2026-08-19)", async () => {
      // o[1] = 4,0 (søppel — observert for XBTUSDC i prod) → 1 613 950 %.
      // Uten clamp feiler coin_prices-upserten numeric(10,4) → cache frosset.
      const pair = "XBTUSDC";
      const body = {
        error: [],
        result: {
          [pair]: {
            c: ["64562.78", "0.5"],
            h: ["64990.11", "64990.11"],
            l: ["64001.46", "64001.46"],
            o: ["64471.70", "4.0"],
            v: ["265.39", "265.39"],
          },
        },
      };
      vi.stubGlobal("fetch", vi.fn().mockResolvedValue(okResponse(body)));

      const snap = await provider.get24hSnapshot("BTCUSDT");

      expect(snap.change24hPct).toBe(0);
      expect(snap.price).toBe(64562.78);
    });
  });

  describe("getDepth", () => {
    it("returnerer OrderBookSnapshot med default limit 20", async () => {
      const mockFetch = vi.fn().mockResolvedValue(
        okResponse(
          depthResult(
            "ETHUSDC",
            [
              ["3000.0", "0.5"],
              ["2999.5", "1.0"],
            ],
            [["3001.0", "0.7"]],
          ),
        ),
      );
      vi.stubGlobal("fetch", mockFetch);

      const depth = await provider.getDepth("ETHUSDT");

      expect(depth.bids).toEqual([
        { price: 3000, quantity: 0.5 },
        { price: 2999.5, quantity: 1 },
      ]);
      expect(depth.asks).toEqual([{ price: 3001, quantity: 0.7 }]);
      expect(depth.timestamp).toBeInstanceOf(Date);
      expect(mockFetch).toHaveBeenCalledWith(
        `${API}/Depth?pair=ETHUSDC&count=20`,
        expect.anything(),
      );
    });

    it("respekterer custom limit (count-param)", async () => {
      const mockFetch = vi
        .fn()
        .mockResolvedValue(okResponse(depthResult("SOLUSDC", [], [])));
      vi.stubGlobal("fetch", mockFetch);

      await provider.getDepth("SOLUSDT", 5);

      expect(mockFetch).toHaveBeenCalledWith(
        `${API}/Depth?pair=SOLUSDC&count=5`,
        expect.anything(),
      );
    });
  });
});
