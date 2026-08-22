/**
 * Tester for kanonisk markedsdata-provider (Kraken implementasjon).
 * EU/EØS (2026): Kraken er eneste tallkilde.
 */

import {
  describe,
  it,
  expect,
  vi,
  beforeEach,
  afterEach,
  type Mock,
} from "vitest";
import { KrakenMarketDataProvider } from "../market-data/kraken-provider";

const TICKER_RESPONSE = {
  error: [],
  result: {
    XBTUSDC: {
      c: ["618914.46", "0.5"],
      h: ["623830.04", "623830.04"],
      l: ["612143.64", "612143.64"],
      o: ["613200.00", "613200.00"],
      v: ["11885.64", "11885.64"],
    },
  },
};

describe("KrakenMarketDataProvider", () => {
  let provider: KrakenMarketDataProvider;

  beforeEach(() => {
    provider = new KrakenMarketDataProvider();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it("getPrice henter siste pris fra Ticker", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => TICKER_RESPONSE,
      }),
    );

    const price = await provider.getPrice("BTCUSDT");
    expect(price).toBe(618914.46);

    const mockFetch = fetch as Mock;
    const url = String(mockFetch.mock.calls[0][0]);
    expect(url).toContain("XBTUSDC");
    expect(url).toContain("api.kraken.com");
  });

  it("get24hSnapshot henter pris, endring, high, low og volum i ETT kall", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => TICKER_RESPONSE,
      }),
    );

    const snap = await provider.get24hSnapshot("BTCUSDT");

    expect(snap.price).toBe(618914.46);
    // 24h-endring fra o[1] → c[0]: (618914.46 − 613200) / 613200
    expect(snap.change24hPct).toBeCloseTo(0.9317, 3);
    expect(snap.high24h).toBe(623830.04);
    expect(snap.low24h).toBe(612143.64);
    expect(snap.volume24h).toBe(11885.64);

    const mockFetch = fetch as Mock;
    expect(mockFetch.mock.calls).toHaveLength(1);
  });

  it("get24hSnapshot kaster KRAKEN_PAIR_UNAVAILABLE for symboler Kraken ikke støtter", async () => {
    await expect(provider.get24hSnapshot("BNBUSDT")).rejects.toThrow(
      "KRAKEN_PAIR_UNAVAILABLE",
    );
  });

  it("getKlines mapper OHLCV-lys fra Kraken-format", async () => {
    const rawCandle = [
      1723104000, // timestamp (sekunder)
      "613000.0", // open
      "615000.0", // high
      "612000.0", // low
      "614000.0", // close
      "614500.0", // vwap
      "100.5", // volume
      "5", // count
    ];
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          error: [],
          result: {
            last: 1723104000,
            XBTUSDC: [rawCandle],
          },
        }),
      }),
    );

    const klines = await provider.getKlines("BTCUSDT", "1h", 1);

    expect(klines).toHaveLength(1);
    expect(klines[0]).toEqual({
      timestamp: 1723104000 * 1000,
      open: 613000,
      high: 615000,
      low: 612000,
      close: 614000,
      volume: 100.5,
    });
  });

  it("get24hChange beregnes fra 24 1h-lys", async () => {
    const makeCandle = (i: number) => [
      1723000000 + i * 3600,
      String(100 + i),
      String(101 + i),
      String(99 + i),
      String(100 + i),
      String(100 + i),
      "10",
      "1",
    ];
    const candles = Array.from({ length: 24 }, (_, i) => makeCandle(i));
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          error: [],
          result: {
            last: 1723000000 + 24 * 3600,
            XBTUSDC: candles,
          },
        }),
      }),
    );

    const change = await provider.get24hChange("BTCUSDT");
    // første close 100 → siste close 123 → +23 %
    expect(change).toBeCloseTo(23, 2);
  });

  it("kaster tydelig feil når Kraken returnerer API-error", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          error: ["EQuery:Unknown asset pair"],
          result: {},
        }),
      }),
    );

    await expect(provider.getPrice("BTCUSDT")).rejects.toThrow(
      "EQuery:Unknown asset pair",
    );
  });
});
