/**
 * Binance REST API implementasjon av MarketDataProvider.
 *
 * Bruker Binance public API for:
 * - siste pris (/api/v3/ticker/price)
 * - order book depth (/api/v3/depth)
 * - OHLCV-lys (/api/v3/klines)
 *
 * Failover: mainnet (api.binance.com) blokkeres fra enkelte sky-egress-IP-er
 * (observert fra Cloudflare Workers). Vi prøver deretter api[1-4].binance.com,
 * deretter data-api.binance.vision, og til slutt testnet.binance.vision.
 * Testnet er en siste nødløsning for å holde tick i live.
 */

import type { Kline, MarketDataProvider, OrderBookSnapshot } from "./types";

// Prioritert liste. Mainnet først for paper/live-paritet; .vision-endepunkter
// er tilbakefall hvis CloudFront/WAF blokkerer egress-IP-en.
const BINANCE_API_BASES = [
  "https://api.binance.com",
  "https://api1.binance.com",
  "https://api2.binance.com",
  "https://api3.binance.com",
  "https://api4.binance.com",
  "https://data-api.binance.vision",
  "https://testnet.binance.vision",
];

// Statuser som kan være midlertidige; 403 prøves ikke på nytt samme endpoint.
const RETRYABLE_STATUSES: Record<number, true> = {
  429: true,
  500: true,
  502: true,
  503: true,
  504: true,
};

class BinanceApiError extends Error {
  status: number;
  responseBody?: string;
  constructor(status: number, responseBody?: string) {
    super(`Binance API error: ${status}`);
    this.status = status;
    this.responseBody = responseBody;
  }
}

async function fetchFromEndpoint<T>(
  base: string,
  path: string,
  timeoutMs: number,
): Promise<T> {
  const url = `${base}${path}`;
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

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
      const body =
        typeof response.text === "function"
          ? await response.text().catch(() => "")
          : "";
      console.warn(
        `[BinanceMarketDataProvider] ${url} failed HTTP ${response.status}: ${body.slice(0, 200)}`,
      );
      throw new BinanceApiError(response.status, body);
    }

    return (await response.json()) as T;
  } catch (error) {
    clearTimeout(timeoutId);
    throw error;
  }
}

async function binanceFetch<T>(
  path: string,
  timeoutMs: number,
  onEndpointUsed?: (base: string) => void,
): Promise<T> {
  let lastError: Error | undefined;

  for (const base of BINANCE_API_BASES) {
    try {
      const result = await fetchFromEndpoint<T>(base, path, timeoutMs);
      onEndpointUsed?.(base);
      return result;
    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err));

      // 5xx/429 kan være transient; prøv samme endpoint én gang til.
      if (err instanceof BinanceApiError && RETRYABLE_STATUSES[err.status]) {
        try {
          return await fetchFromEndpoint<T>(base, path, timeoutMs);
        } catch (retryErr) {
          lastError =
            retryErr instanceof Error ? retryErr : new Error(String(retryErr));
        }
      }

      console.warn(
        `[BinanceMarketDataProvider] ${base} failed: ${lastError.message}; trying next endpoint`,
      );
    }
  }

  throw lastError ?? new Error("All Binance API endpoints failed");
}

export class BinanceMarketDataProvider implements MarketDataProvider {
  private lastEndpointUsed: string | undefined;

  /**
   * Returns the last Binance endpoint that successfully served a request.
   * Useful for health checks to verify whether the primary endpoint is reachable.
   */
  getLastEndpointUsed(): string | undefined {
    return this.lastEndpointUsed;
  }

  async getPrice(symbol: string): Promise<number> {
    const normalized = symbol.toUpperCase();
    const data = await binanceFetch<{ price: string }>(
      `/api/v3/ticker/price?symbol=${normalized}`,
      5000,
      (base) => {
        this.lastEndpointUsed = base;
      },
    );
    return parseFloat(data.price);
  }

  async getDepth(symbol: string, limit = 20): Promise<OrderBookSnapshot> {
    const normalized = symbol.toUpperCase();
    const data = await binanceFetch<{
      bids: [string, string][];
      asks: [string, string][];
    }>(`/api/v3/depth?symbol=${normalized}&limit=${limit}`, 5000, (base) => {
      this.lastEndpointUsed = base;
    });

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
    let path = `/api/v3/klines?symbol=${normalized}&interval=${interval}&limit=${limit}`;
    if (startTime !== undefined) {
      path += `&startTime=${Math.floor(startTime)}`;
    }
    if (endTime !== undefined) {
      path += `&endTime=${Math.floor(endTime)}`;
    }
    const data = await binanceFetch<unknown[]>(path, 15000, (base) => {
      this.lastEndpointUsed = base;
    });

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
    const data = await binanceFetch<{ priceChangePercent: string }>(
      `/api/v3/ticker/24hr?symbol=${normalized}`,
      5000,
      (base) => {
        this.lastEndpointUsed = base;
      },
    );
    return parseFloat(data.priceChangePercent);
  }
}
