/**
 * Tester for OkxMarketDataProvider — OKX public REST V5 (Ticker/Candles/Books).
 *
 * Mockede fetch-kall med realistiske OKX-responser.
 * Format-notater:
 *  - OKX svarer { code: "0", msg: "", data: [...] }
 *  - Candles: data = [[ts(ms), o, h, l, c, vol, volCcy, volCcyQuote, confirm], ...]
 *    (nyeste først — provideren snur til eldst → nyest)
 *  - Ticker: data[0].last / open24h / high24h / low24h / vol24h
 *  - Books: data[0].bids/asks = [[price, qty, ...], ...]
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { OkxMarketDataProvider, OkxApiError } from "../okx-provider";

const API = "https://eea.okx.com/api/v5/market";

const EXPECTED_HEADERS = {
  Accept: "application/json",
  "User-Agent": "Klarpakke/1.0",
};

function okResponse(body: unknown, code = "0") {
  return { ok: true, json: async () => ({ code, msg: "", data: body }) };
}

function tickerResult(instId: string, price: string) {
  return [
    {
      instId,
      last: price,
      open24h: "2990.0", // realistisk 24h-nivå (≈ pris) — clamp-guarden krever ≤1000 %
      high24h: "3010.0",
      low24h: "2980.0",
      vol24h: "500.0",
    },
  ];
}

function candlesResult(candles: unknown[]) {
  return candles;
}

function depthResult(bids: string[][], asks: string[][]) {
  return [{ bids, asks }];
}

/** Bygger N 1h-lys med close = 100 + i (eldst → nyest). OKX: nyeste først. */
function buildHourlyCandles(count: number, startMs = 1_700_000_000_000) {
  const candles = Array.from({ length: count }, (_, i) => [
    startMs + i * 3_600_000,
    (100 + i).toFixed(2),
    (101 + i).toFixed(2),
    (99 + i).toFixed(2),
    (100 + i).toFixed(2),
    "10.5",
    "10.5",
    "1050.0",
    "1",
  ]);
  return candles.reverse(); // OKX returnerer nyeste først
}

describe("OkxMarketDataProvider", () => {
  let provider: OkxMarketDataProvider;

  beforeEach(() => {
    provider = new OkxMarketDataProvider();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
    vi.useRealTimers();
  });

  describe("symbol-mapping (interne → OKX instId)", () => {
    it.each([
      ["BTCUSDT", "BTC-USDT"],
      ["ETHUSDT", "ETH-USDT"],
      ["SOLUSDT", "SOL-USDT"],
      ["AVAXUSDT", "AVAX-USDT"],
      ["DOGEUSDT", "DOGE-USDT"],
      ["LINKUSDT", "LINK-USDT"],
      ["ADAUSDT", "ADA-USDT"],
      ["DOTUSDT", "DOT-USDT"],
      ["POLUSDT", "POL-USDT"],
      ["MATICUSDT", "POL-USDT"],
      ["XRPUSDT", "XRP-USDT"],
      ["UNIUSDT", "UNI-USDT"],
      ["BNBUSDT", "BNB-USDT"],
    ])("mapper %s → %s", async (internal, okx) => {
      const mockFetch = vi
        .fn()
        .mockResolvedValue(okResponse(tickerResult(okx, "1.23")));
      vi.stubGlobal("fetch", mockFetch);

      await provider.getPrice(internal);

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining(`instId=${okx}`),
        expect.anything(),
      );
    });

    it("kaster OKX_INSTRUMENT_UNAVAILABLE for ukjent symbol", async () => {
      const mockFetch = vi.fn();
      vi.stubGlobal("fetch", mockFetch);

      await expect(provider.getPrice("XXUSDT")).rejects.toThrow(
        "OKX_INSTRUMENT_UNAVAILABLE: XXUSDT",
      );
      expect(mockFetch).not.toHaveBeenCalled();
    });

    it("normaliserer små bokstaver og skråstrek før mapping", async () => {
      const mockFetch = vi
        .fn()
        .mockResolvedValue(okResponse(tickerResult("BTC-USDT", "1.23")));
      vi.stubGlobal("fetch", mockFetch);

      await provider.getPrice("btc/usdt");

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining("instId=BTC-USDT"),
        expect.anything(),
      );
    });
  });

  describe("getPrice", () => {
    it("returnerer ticker last som number", async () => {
      const mockFetch = vi
        .fn()
        .mockResolvedValue(okResponse(tickerResult("BTC-USDT", "64820.61")));
      vi.stubGlobal("fetch", mockFetch);

      const price = await provider.getPrice("BTCUSDT");

      expect(price).toBe(64820.61);
      expect(mockFetch).toHaveBeenCalledWith(
        `${API}/ticker?instId=BTC-USDT`,
        expect.objectContaining({
          signal: expect.any(AbortSignal),
          headers: EXPECTED_HEADERS,
        }),
      );
    });

    it("cacher pris innenfor TTL (10s) — samme symbol re-fetcher ikke", async () => {
      const mockFetch = vi
        .fn()
        .mockResolvedValue(okResponse(tickerResult("BTC-USDT", "64820.61")));
      vi.stubGlobal("fetch", mockFetch);

      const first = await provider.getPrice("BTCUSDT");
      const second = await provider.getPrice("BTCUSDT");

      expect(first).toBe(64820.61);
      expect(second).toBe(64820.61);
      expect(mockFetch).toHaveBeenCalledTimes(1);
    });

    it("kaster ved HTTP 429 (rate limit) med OkxApiError", async () => {
      vi.stubGlobal(
        "fetch",
        vi.fn().mockResolvedValue({ ok: false, status: 429 }),
      );

      const err = await provider.getPrice("BTCUSDT").catch((e) => e);
      expect(err).toBeInstanceOf(OkxApiError);
      expect(err.message).toContain("rate limited");
    });

    it("kaster ved OKX feilkode i respons", async () => {
      vi.stubGlobal(
        "fetch",
        vi.fn().mockResolvedValue(okResponse([], "51000")),
      );

      await expect(provider.getPrice("BTCUSDT")).rejects.toThrow("51000");
    });
  });

  describe("getKlines", () => {
    it("mapper OKX-candles → Kline[] (ms-timestamp, nyeste → eldst snudd)", async () => {
      const candles = [
        [
          "1722877200000",
          "105.0",
          "110.0",
          "90.0",
          "105.0",
          "500.0",
          "500.0",
          "52500.0",
          "1",
        ],
        [
          "1722873600000",
          "100.0",
          "110.0",
          "90.0",
          "105.0",
          "500.0",
          "500.0",
          "52500.0",
          "1",
        ],
      ];
      const mockFetch = vi
        .fn()
        .mockResolvedValue(okResponse(candlesResult(candles)));
      vi.stubGlobal("fetch", mockFetch);

      const klines = await provider.getKlines("BTCUSDT", "1h", 100);

      expect(klines).toHaveLength(2);
      expect(klines[0]).toEqual({
        timestamp: 1_722_873_600_000, // eldste først etter snuing
        open: 100,
        high: 110,
        low: 90,
        close: 105,
        volume: 500,
      });
      expect(klines[1].timestamp).toBe(1_722_877_200_000);
      expect(mockFetch).toHaveBeenCalledWith(
        `${API}/candles?instId=BTC-USDT&bar=1H&limit=100`,
        expect.anything(),
      );
    });

    it("beholder kun de siste `limit` lysene", async () => {
      const candles = buildHourlyCandles(4);
      vi.stubGlobal(
        "fetch",
        vi.fn().mockResolvedValue(okResponse(candlesResult(candles))),
      );

      const klines = await provider.getKlines("BTCUSDT", "1h", 2);

      expect(klines).toHaveLength(2);
      expect(klines[0].timestamp).toBe(1_700_007_200_000); // 3. lys
      expect(klines[1].timestamp).toBe(1_700_010_800_000); // 4. lys
    });

    it.each([
      ["15m", "15m"],
      ["1h", "1H"],
      ["4h", "4H"],
    ])("mapper intervall %s → %s", async (interval, okxBar) => {
      vi.stubGlobal(
        "fetch",
        vi
          .fn()
          .mockResolvedValue(okResponse(candlesResult(buildHourlyCandles(2)))),
      );

      await provider.getKlines("ETHUSDT", interval, 100);

      expect(fetch).toHaveBeenCalledWith(
        expect.stringContaining(`bar=${okxBar}`),
        expect.anything(),
      );
    });

    it("kaster for ukjent intervall", async () => {
      const mockFetch = vi.fn();
      vi.stubGlobal("fetch", mockFetch);

      await expect(provider.getKlines("BTCUSDT", "1d", 100)).rejects.toThrow(
        "OKX_INTERVAL_UNAVAILABLE: 1d",
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
          .mockResolvedValue(okResponse(candlesResult(buildHourlyCandles(24)))),
      );

      const change = await provider.get24hChange("BTCUSDT");

      expect(change).toBeCloseTo(23, 5);
      expect(fetch).toHaveBeenCalledWith(
        expect.stringContaining("instId=BTC-USDT"),
        expect.anything(),
      );
      expect(fetch).toHaveBeenCalledWith(
        expect.stringContaining("bar=1H"),
        expect.anything(),
      );
    });

    it("kaster hvis det ikke finnes nok lys", async () => {
      vi.stubGlobal(
        "fetch",
        vi.fn().mockResolvedValue(okResponse(candlesResult([]))),
      );

      await expect(provider.get24hChange("BTCUSDT")).rejects.toThrow();
    });
  });

  describe("get24hSnapshot", () => {
    it("returnerer Market24hSnapshot fra ticker", async () => {
      const mockFetch = vi
        .fn()
        .mockResolvedValue(okResponse(tickerResult("ETH-USDT", "3000.5")));
      vi.stubGlobal("fetch", mockFetch);

      const snap = await provider.get24hSnapshot("ETHUSDT");

      expect(snap).toEqual({
        price: 3000.5,
        change24hPct: ((3000.5 - 2990) / 2990) * 100,
        high24h: 3010,
        low24h: 2980,
        volume24h: 500,
      });
    });

    it("clamper absurd change24hPct til 0 (numeric-overflow-guard, 2026-08-19)", async () => {
      // open24h = 4,0 (søppel) → 1 613 950 % — må ikke nå coin_prices
      // numeric(10,4)-kolonnen og fryse hele upserten.
      const body = [
        {
          instId: "BTC-USDT",
          last: "64562.78",
          open24h: "4.0",
          high24h: "65000",
          low24h: "64000",
          vol24h: "500",
        },
      ];
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
        `${API}/books?instId=ETH-USDT&sz=20`,
        expect.anything(),
      );
    });

    it("respekterer custom limit (sz-param)", async () => {
      const mockFetch = vi
        .fn()
        .mockResolvedValue(okResponse(depthResult([], [])));
      vi.stubGlobal("fetch", mockFetch);

      await provider.getDepth("SOLUSDT", 5);

      expect(mockFetch).toHaveBeenCalledWith(
        `${API}/books?instId=SOL-USDT&sz=5`,
        expect.anything(),
      );
    });
  });
});
