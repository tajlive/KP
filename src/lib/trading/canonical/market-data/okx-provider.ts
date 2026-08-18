/**
 * OKX REST API implementasjon av MarketDataProvider.
 *
 * Bruker OKXs offentlige V5 API (ingen API-nøkkel) for:
 * - siste pris (/api/v5/market/ticker → data[0].last)
 * - OHLCV-lys (/api/v5/market/candles)
 * - 24h-snapshot (/api/v5/market/ticker)
 * - order book depth (/api/v5/market/books)
 *
 * Symbol-mapping: interne symboler (BTCUSDT) → OKX-instId med bindestrek
 * (BTC-USDT). OKX har IKKE XBT/XETH-prefiks-fellen som Kraken — BTC er «BTC».
 *
 * Feilkoder: OKX bruker numeriske koder («0» = ok, «51000»+ = feil).
 * Rate-limit: IP-basert (~20 req/2s for ticker) — bygger egen
 * OkxLockoutError-klasse + backoff for konsistens med Kraken.
 */

import type {
  Kline,
  Market24hSnapshot,
  MarketDataProvider,
  OrderBookSnapshot,
} from "./types";

// Interne symboler (BTCUSDT) → OKX-instId (bindestrek-format)
const INTERNAL_TO_OKX: Record<string, string> = {
  BTCUSDT: "BTC-USDT",
  ETHUSDT: "ETH-USDT",
  SOLUSDT: "SOL-USDT",
  AVAXUSDT: "AVAX-USDT",
  DOGEUSDT: "DOGE-USDT",
  LINKUSDT: "LINK-USDT",
  ADAUSDT: "ADA-USDT",
  DOTUSDT: "DOT-USDT",
  POLUSDT: "POL-USDT",
  // 2026-08-19: XRP/UNI manglet → sync-prices droppet dem stille (begge
  // kilder feilet) — OKX har XRP-USDT og UNI-USDT (verifisert live).
  XRPUSDT: "XRP-USDT",
  UNIUSDT: "UNI-USDT",
  // MATIC ble migrert til POL også på OKX (2024) — gamle konfigurasjoner
  // som fortsatt sier MATICUSDT må peke til POL-USDT.
  MATICUSDT: "POL-USDT",
};

// Interne intervaller → OKX bar-parametere
const INTERVAL_MAP: Record<string, string> = {
  "15m": "15m",
  "1h": "1H",
  "4h": "4H",
};

const API_BASE = "https://eea.okx.com/api/v5/market";
const REQUEST_TIMEOUT_MS = 10_000;
const PRICE_CACHE_TTL_MS = 10_000;

/** Kastet når OKX svarer med rate-limit/feilkode — retry med backoff. */
export class OkxApiError extends Error {
  constructor(
    message: string,
    readonly code: string,
  ) {
    super(message);
    this.name = "OkxApiError";
  }
}

interface OkxResponse<T> {
  code: string;
  msg: string;
  data: T;
}

async function okxFetch<T>(path: string): Promise<T> {
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

    if (response.status === 429) {
      throw new OkxApiError(
        `OKX API error: rate limited (HTTP 429) for ${url}`,
        "429",
      );
    }
    if (!response.ok) {
      throw new OkxApiError(
        `OKX API error: HTTP ${response.status} for ${url}`,
        String(response.status),
      );
    }

    const body = (await response.json()) as OkxResponse<T>;
    if (body.code !== "0") {
      throw new OkxApiError(
        `OKX API error: ${body.code} ${body.msg}`,
        body.code,
      );
    }
    return body.data;
  } catch (error) {
    clearTimeout(timeoutId);
    throw error;
  }
}

export class OkxMarketDataProvider implements MarketDataProvider {
  private priceCache = new Map<string, { price: number; timestamp: number }>();

  private toOkx(symbol: string): string {
    const s = symbol.toUpperCase().replace("/", "");
    const mapped = INTERNAL_TO_OKX[s];
    if (!mapped) throw new Error(`OKX_INSTRUMENT_UNAVAILABLE: ${s}`);
    return mapped;
  }

  private toOkxInterval(interval: string): string {
    const mapped = INTERVAL_MAP[interval];
    if (mapped === undefined) {
      throw new Error(`OKX_INTERVAL_UNAVAILABLE: ${interval}`);
    }
    return mapped;
  }

  async getPrice(symbol: string): Promise<number> {
    const instId = this.toOkx(symbol);

    // Cache først — samme mønster som Kraken-provideren (10s TTL)
    const cached = this.priceCache.get(instId);
    if (cached && Date.now() - cached.timestamp < PRICE_CACHE_TTL_MS) {
      return cached.price;
    }

    const data = await okxFetch<Array<{ instId: string; last: string }>>(
      `/ticker?instId=${instId}`,
    );
    if (data.length === 0) {
      throw new OkxApiError(`OKX API error: no ticker for ${instId}`, "404");
    }
    const price = parseFloat(data[0].last);
    if (Number.isNaN(price)) {
      throw new OkxApiError(
        `OKX API error: invalid price for ${instId}`,
        "BAD_PRICE",
      );
    }
    this.priceCache.set(instId, { price, timestamp: Date.now() });
    return price;
  }

  async getKlines(
    symbol: string,
    interval: string,
    limit: number,
    startTime?: number,
    endTime?: number,
  ): Promise<Kline[]> {
    const instId = this.toOkx(symbol);
    const bar = this.toOkxInterval(interval);

    // OKX candles: nyeste først. after/before er ms-tidsstempler.
    let path = `/candles?instId=${instId}&bar=${bar}&limit=${limit}`;
    if (endTime !== undefined) {
      path += `&after=${endTime}`;
    } else if (startTime !== undefined) {
      path += `&after=${startTime + limit * 3_600_000}`;
    }

    const data = await okxFetch<string[][]>(path);

    const klines = data.map((c) => ({
      timestamp: Number(c[0]), // ms (OKX gir ms direkte — ingen /1000 som Kraken)
      open: parseFloat(c[1]),
      high: parseFloat(c[2]),
      low: parseFloat(c[3]),
      close: parseFloat(c[4]),
      volume: parseFloat(c[5]),
    }));

    // OKX returnerer nyeste først — snu til eldst → nyest (samme som Kraken).
    klines.reverse();

    if (startTime !== undefined) {
      return klines.filter((k) => k.timestamp >= startTime).slice(-limit);
    }
    return klines.slice(-limit);
  }

  async get24hChange(symbol: string): Promise<number> {
    const klines = await this.getKlines(symbol, "1h", 24);
    if (klines.length < 2) {
      throw new Error(
        `OKX API error: not enough klines for 24h change (${symbol})`,
      );
    }
    const lastClose = klines[klines.length - 1].close;
    const firstClose = klines[0].close;
    return ((lastClose - firstClose) / firstClose) * 100;
  }

  /**
   * Full 24h-markedssnapshot for ett symbol (OKX Ticker — ETT kall).
   * Felt: siste pris, 24h endring, high, low, volum. Priser i par-valuta,
   * konverteres til NOK av kalleren.
   */
  async get24hSnapshot(symbol: string): Promise<Market24hSnapshot> {
    const instId = this.toOkx(symbol);

    const data = await okxFetch<
      Array<{
        instId: string;
        last: string;
        open24h: string;
        high24h: string;
        low24h: string;
        vol24h: string;
      }>
    >(`/ticker?instId=${instId}`);
    if (data.length === 0) {
      throw new OkxApiError(`OKX API error: no ticker for ${instId}`, "404");
    }
    const t = data[0];

    const last = parseFloat(t.last);
    const open24h = parseFloat(t.open24h);
    const change24hPct = open24h > 0 ? ((last - open24h) / open24h) * 100 : 0;

    // 2026-08-19 (samme klasse som Kraken): clamp |endring| ≤ 1000 % — absurd
    // verdi = datafeil. Beskytter coin_prices numeric(10,4)-kolonnen.
    const safeChange24hPct =
      Number.isFinite(change24hPct) && Math.abs(change24hPct) <= 1000
        ? change24hPct
        : 0;

    return {
      price: last,
      change24hPct: safeChange24hPct,
      high24h: parseFloat(t.high24h),
      low24h: parseFloat(t.low24h),
      volume24h: parseFloat(t.vol24h),
    };
  }

  async getDepth(symbol: string, limit = 20): Promise<OrderBookSnapshot> {
    const instId = this.toOkx(symbol);
    const data = await okxFetch<Array<{ bids: string[][]; asks: string[][] }>>(
      `/books?instId=${instId}&sz=${limit}`,
    );
    if (data.length === 0) {
      throw new OkxApiError(`OKX API error: no book for ${instId}`, "404");
    }
    const book = data[0];
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
