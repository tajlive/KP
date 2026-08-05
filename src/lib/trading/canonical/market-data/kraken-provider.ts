/**
 * Kraken REST API implementasjon av MarketDataProvider.
 *
 * Bruker Krakens offentlige API (ingen API-nøkkel) for:
 * - siste pris (/0/public/Ticker → result[pair].c[0])
 * - OHLCV-lys (/0/public/OHLC)
 * - order book depth (/0/public/Depth)
 *
 * Symbol-mapping: interne symboler (BTCUSDT) → Kraken-par med USDC-kvote
 * (USDT er blokkert for norske brukere). POLUSDT → POLUSD (POLUSDC finnes ikke).
 *
 * Failover: tick-rouen faller tilbake til Binance hvis et kall kaster
 * (f.eks. KRAKEN_PAIR_UNAVAILABLE for symboler Kraken ikke støtter).
 */

import type { Kline, MarketDataProvider, OrderBookSnapshot } from "./types";

// Interne symboler (BTCUSDT) → Kraken-par med USDC-kvote (USDT blokkert for NO)
const INTERNAL_TO_KRAKEN: Record<string, string> = {
  BTCUSDT: "XBTUSDC",
  ETHUSDT: "ETHUSDC",
  SOLUSDT: "SOLUSDC",
  AVAXUSDT: "AVAXUSDC",
  DOGEUSDT: "XDGUSDC",
  LINKUSDT: "LINKUSDC",
  ADAUSDT: "ADAUSDC",
  DOTUSDT: "DOTUSDC",
  POLUSDT: "POLUSD",
};

// Interne intervaller → Kraken OHLC-intervall i minutter
const INTERVAL_MAP: Record<string, number> = {
  "15m": 15,
  "1h": 60,
  "4h": 240,
};

const API_BASE = "https://api.kraken.com/0/public";
const REQUEST_TIMEOUT_MS = 10_000;
const PRICE_CACHE_TTL_MS = 10_000;

interface KrakenResponse<T> {
  error: string[];
  result: T;
}

/**
 * Henter resultatet for et par fra en Kraken-respons.
 * Kraken kan normalisere paret i responsen (case/alias), så vi matcher
 * eksakt først, deretter case-insensitivt.
 */
function extractPairData<T>(result: Record<string, T>, pair: string): T {
  if (result[pair] !== undefined) return result[pair];
  const key = Object.keys(result).find(
    (k) => k.toUpperCase() === pair.toUpperCase(),
  );
  if (key !== undefined) return result[key];
  throw new Error(`Kraken API error: pair ${pair} not found in response`);
}

async function krakenFetch<T>(path: string): Promise<T> {
  const url = `${API_BASE}${path}`;
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        Accept: "application/json",
        "User-Agent": "Klarpakke/1.0",
      },
    });
    clearTimeout(timeoutId);

    if (!response.ok) {
      throw new Error(`Kraken API error: HTTP ${response.status} for ${url}`);
    }

    const body = (await response.json()) as KrakenResponse<T>;
    if (body.error && body.error.length > 0) {
      throw new Error(`Kraken API error: ${body.error.join(", ")}`);
    }
    return body.result;
  } catch (error) {
    clearTimeout(timeoutId);
    throw error;
  }
}

export class KrakenMarketDataProvider implements MarketDataProvider {
  private priceCache = new Map<string, { price: number; timestamp: number }>();

  private toKraken(symbol: string): string {
    const s = symbol.toUpperCase().replace("/", "");
    const mapped = INTERNAL_TO_KRAKEN[s];
    if (!mapped) throw new Error(`KRAKEN_PAIR_UNAVAILABLE: ${s}`);
    return mapped;
  }

  private toKrakenInterval(interval: string): number {
    const mapped = INTERVAL_MAP[interval];
    if (mapped === undefined) {
      throw new Error(`KRAKEN_INTERVAL_UNAVAILABLE: ${interval}`);
    }
    return mapped;
  }

  async getPrice(symbol: string): Promise<number> {
    const pair = this.toKraken(symbol);

    // Cache først — samme mønster som Binance-provideren (10s TTL)
    const cached = this.priceCache.get(pair);
    if (cached && Date.now() - cached.timestamp < PRICE_CACHE_TTL_MS) {
      return cached.price;
    }

    const result = await krakenFetch<Record<string, { c: [string, string] }>>(
      `/Ticker?pair=${pair}`,
    );
    const ticker = extractPairData(result, pair);
    const price = parseFloat(ticker.c[0]);
    if (Number.isNaN(price)) {
      throw new Error(`Kraken API error: invalid price for ${pair}`);
    }
    this.priceCache.set(pair, { price, timestamp: Date.now() });
    return price;
  }

  async getKlines(
    symbol: string,
    interval: string,
    limit: number,
    startTime?: number,
    endTime?: number,
  ): Promise<Kline[]> {
    const pair = this.toKraken(symbol);
    const krakenInterval = this.toKrakenInterval(interval);

    let path = `/OHLC?pair=${pair}&interval=${krakenInterval}`;
    if (startTime !== undefined) {
      // Kraken tar UNIX-sekunder, ikke millisekunder
      path += `&since=${Math.floor(startTime / 1000)}`;
    }

    const result = await krakenFetch<Record<string, unknown>>(path);
    const rawCandles = extractPairData(result, pair); // "last"-nøkkelen filtreres ut her
    if (!Array.isArray(rawCandles)) {
      throw new Error(`Kraken API error: invalid OHLC response for ${pair}`);
    }

    let klines = (rawCandles as unknown[]).map((candle) => {
      const c = candle as unknown[];
      return {
        timestamp: Number(c[0]) * 1000, // sekunder → ms (samme enhet som Binance)
        open: parseFloat(String(c[1])),
        high: parseFloat(String(c[2])),
        low: parseFloat(String(c[3])),
        close: parseFloat(String(c[4])),
        volume: parseFloat(String(c[6])), // [5] = vwap, [6] = volume
      };
    });

    if (endTime !== undefined) {
      klines = klines.filter((k) => k.timestamp <= endTime);
    }

    // Kraken returnerer opptil 720 lys (eldst → nyest); behold de nyeste `limit`.
    return klines.slice(-limit);
  }

  async get24hChange(symbol: string): Promise<number> {
    // Beregn fra 24 stk 1h-lys — tickerens o[0]-felt er upålitelig (observert "6")
    const klines = await this.getKlines(symbol, "1h", 24);
    if (klines.length < 2) {
      throw new Error(
        `Kraken API error: not enough klines for 24h change (${symbol})`,
      );
    }
    const lastClose = klines[klines.length - 1].close;
    const firstClose = klines[0].close;
    return ((lastClose - firstClose) / firstClose) * 100;
  }

  async getDepth(symbol: string, limit = 20): Promise<OrderBookSnapshot> {
    const pair = this.toKraken(symbol);
    const result = await krakenFetch<
      Record<string, { bids: [string, string][]; asks: [string, string][] }>
    >(`/Depth?pair=${pair}&count=${limit}`);
    const book = extractPairData(result, pair);
    return {
      bids: book.bids.map(([p, q]) => ({
        price: parseFloat(p),
        quantity: parseFloat(q),
      })),
      asks: book.asks.map(([p, q]) => ({
        price: parseFloat(p),
        quantity: parseFloat(q),
      })),
      timestamp: new Date(),
    };
  }
}
