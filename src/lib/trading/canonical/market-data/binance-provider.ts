/**
 * Binance REST API implementasjon av MarketDataProvider.
 *
 * Bruker Binance public API for:
 * - siste pris (/api/v3/ticker/price)
 * - order book depth (/api/v3/depth)
 * - OHLCV-lys (/api/v3/klines)
 */

import type {
  Kline,
  MarketDataProvider,
  OrderBookSnapshot,
} from "./types";

const BINANCE_API_BASE = "https://api.binance.com";

async function binanceFetch<T>(url: string, timeoutMs: number): Promise<T> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, { signal: controller.signal });
    clearTimeout(timeoutId);

    if (!response.ok) {
      throw new Error(`Binance API error: ${response.status}`);
    }

    return (await response.json()) as T;
  } catch (error) {
    clearTimeout(timeoutId);
    throw error;
  }
}

export class BinanceMarketDataProvider implements MarketDataProvider {
  async getPrice(symbol: string): Promise<number> {
    const normalized = symbol.toUpperCase();
    const url = `${BINANCE_API_BASE}/api/v3/ticker/price?symbol=${normalized}`;
    const data = await binanceFetch<{ price: string }>(url, 5000);
    return parseFloat(data.price);
  }

  async getDepth(symbol: string, limit = 20): Promise<OrderBookSnapshot> {
    const normalized = symbol.toUpperCase();
    const url = `${BINANCE_API_BASE}/api/v3/depth?symbol=${normalized}&limit=${limit}`;
    const data = await binanceFetch<{
      bids: [string, string][];
      asks: [string, string][];
    }>(url, 5000);

    return {
      bids: data.bids.map(([p, q]) => ({
        price: parseFloat(p),
        quantity: parseFloat(q),
      })),
      asks: data.asks.map(([p, q]) => ({
        price: parseFloat(p),
        quantity: parseFloat(q),
      })),
      timestamp: new Date(),
    };
  }

  async getKlines(
    symbol: string,
    interval: string,
    limit: number,
    startTime?: number,
    endTime?: number,
  ): Promise<Kline[]> {
    const normalized = symbol.toUpperCase();
    let url = `${BINANCE_API_BASE}/api/v3/klines?symbol=${normalized}&interval=${interval}&limit=${limit}`;
    if (startTime !== undefined) {
      url += `&startTime=${Math.floor(startTime)}`;
    }
    if (endTime !== undefined) {
      url += `&endTime=${Math.floor(endTime)}`;
    }
    const data = await binanceFetch<unknown[]>(url, 15000);

    return data.map((candle) => {
      const c = candle as unknown[];
      return {
        timestamp: c[0] as number,
        open: parseFloat(c[1] as string),
        high: parseFloat(c[2] as string),
        low: parseFloat(c[3] as string),
        close: parseFloat(c[4] as string),
        volume: parseFloat(c[5] as string),
      };
    });
  }

  async get24hChange(symbol: string): Promise<number> {
    const normalized = symbol.toUpperCase();
    const url = `${BINANCE_API_BASE}/api/v3/ticker/24hr?symbol=${normalized}`;
    const data = await binanceFetch<{ priceChangePercent: string }>(url, 5000);
    return parseFloat(data.priceChangePercent);
  }
}
