/**
 * Kraken API Client
 * Dokumentasjon: https://docs.kraken.com/api/
 */

const KRAKEN_API_URL = "https://api.kraken.com";
const KRAKEN_API_VERSION = "0";

/**
 * Kraken rate-limit-lockout (EGeneral:Temporary lockout / EService:Unavailable).
 * Skilles fra vanlige feil så kallere kan stoppe tidlig i stedet for å hamre
 * videre (hvert kall under lockout forlenger den).
 */
export class KrakenLockoutError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "KrakenLockoutError";
  }
}

/** Jitter (0–20 %) unngår thundering-herd når flere workers rammes samtidig. */
const jitter = (ms: number) => ms * (1 + Math.random() * 0.2);

export interface KrakenBalance {
  [asset: string]: string;
}

export interface KrakenOrder {
  txid: string[];
  descr: {
    pair: string;
    type: "buy" | "sell";
    ordertype: "market" | "limit";
    price: string;
    price2: string;
    leverage: string;
    order: string;
    close: string;
  };
}

export interface KrakenTicker {
  a: string[]; // Ask
  b: string[]; // Bid
  c: string[]; // Last trade closed
  v: string[]; // Volume
  p: string[]; // Volume weighted avg price
  t: number[]; // Number of trades
  l: string[]; // Low
  h: string[]; // High
  o: string; // Open
}

export class KrakenClient {
  private apiKey: string;
  private apiSecret: string;
  /** Minste intervall mellom private kall (Kraken: ~1 req/s per IP/nøkkel). */
  private readonly privateSpacingMs: number;
  /** Lockout-backoff: lockout varer typisk 30–120s — retries må overleve det. */
  private readonly lockoutBackoffMs: number[];
  private lastPrivateCallAt = 0;

  constructor(
    apiKey: string,
    apiSecret: string,
    opts: { privateSpacingMs?: number; lockoutBackoffMs?: number[] } = {},
  ) {
    this.apiKey = apiKey;
    this.apiSecret = apiSecret;
    this.privateSpacingMs = opts.privateSpacingMs ?? 1100;
    this.lockoutBackoffMs = opts.lockoutBackoffMs ?? [15_000, 30_000, 60_000];
  }

  /** Pacing: minst `privateSpacingMs` mellom private kall (per instans). */
  private async pacePrivateCall(): Promise<void> {
    const wait = this.lastPrivateCallAt + this.privateSpacingMs - Date.now();
    if (wait > 0) await new Promise((r) => setTimeout(r, wait));
    this.lastPrivateCallAt = Date.now();
  }

  private getNonce(): string {
    // μs-nonce: API-nøkkelen er konfigurert med 10000ms nonce-window for μs.
    // ms-nonce gir EAPI:Invalid nonce (samme fix som kraken-grid-manager 2026-08-07).
    return (Date.now() * 1000).toString();
  }

  private async signRequest(
    path: string,
    params: Record<string, string>,
    nonce: string,
  ): Promise<string> {
    const postData = new URLSearchParams({ nonce, ...params }).toString();
    const encoder = new TextEncoder();

    // Web Crypto API (edge-compatible — Cloudflare Workers)
    const keyData = Uint8Array.from(atob(this.apiSecret), (c) =>
      c.charCodeAt(0),
    );
    const key = await crypto.subtle.importKey(
      "raw",
      keyData,
      { name: "HMAC", hash: "SHA-512" },
      false,
      ["sign"],
    );

    const sha256Hash = await crypto.subtle.digest(
      "SHA-256",
      encoder.encode(nonce + postData),
    );
    const message = new Uint8Array([
      ...encoder.encode(path),
      ...new Uint8Array(sha256Hash),
    ]);

    const signature = await crypto.subtle.sign("HMAC", key, message);
    return btoa(String.fromCharCode(...new Uint8Array(signature)));
  }

  private async request<T>(
    endpoint: string,
    params: Record<string, string> = {},
    isPublic: boolean = false,
    retries: number = 3,
  ): Promise<T> {
    const path = `/${KRAKEN_API_VERSION}/${isPublic ? "public" : "private"}/${endpoint}`;
    const url = `${KRAKEN_API_URL}${path}`;

    const headers: Record<string, string> = {
      "Content-Type": "application/x-www-form-urlencoded",
    };

    let body: string;

    if (isPublic) {
      const query = new URLSearchParams(params).toString();
      const fullUrl = query ? `${url}?${query}` : url;

      for (let attempt = 0; attempt < retries; attempt++) {
        try {
          const response = await fetch(fullUrl, { headers });
          return await this.handleResponse<T>(response);
        } catch (error) {
          if (attempt === retries - 1) throw error;
          await this.backoff(attempt);
        }
      }
      throw new Error("Max retries exceeded");
    } else {
      const nonce = this.getNonce();
      const signature = await this.signRequest(path, params, nonce);

      headers["API-Key"] = this.apiKey;
      headers["API-Sign"] = signature;

      body = new URLSearchParams({ nonce, ...params }).toString();

      for (let attempt = 0; attempt < retries; attempt++) {
        try {
          await this.pacePrivateCall();
          const response = await fetch(url, {
            method: "POST",
            headers,
            body,
          });
          return await this.handleResponse<T>(response);
        } catch (error) {
          if (attempt === retries - 1) throw error;
          await this.backoff(attempt, error);
        }
      }
      throw new Error("Max retries exceeded");
    }
  }

  private async backoff(attempt: number, error?: unknown): Promise<void> {
    // Lockout krever mye lengre venting enn vanlige feil (1s/2s/4s holder ikke).
    const delay =
      error instanceof KrakenLockoutError
        ? jitter(this.lockoutBackoffMs[Math.min(attempt, this.lockoutBackoffMs.length - 1)])
        : Math.pow(2, attempt) * 1000;
    await new Promise((resolve) => setTimeout(resolve, delay));
  }

  private async handleResponse<T>(response: Response): Promise<T> {
    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Kraken API error: ${response.status} - ${error}`);
    }

    const data = await response.json();

    if (data.error && data.error.length > 0) {
      const errors: string[] = data.error;
      const joined = errors.join(", ");
      if (
        errors.some(
          (e) =>
            e.includes("Temporary lockout") ||
            e.includes("EService:Unavailable") ||
            e.includes("Rate limit exceeded"),
        )
      ) {
        throw new KrakenLockoutError(`Kraken API error: ${joined}`);
      }
      throw new Error(`Kraken API error: ${joined}`);
    }

    return data.result as T;
  }

  // ==================== PUBLIC METHODS ====================

  /**
   * Henter ticker-info for ett eller flere par (kommaseparert).
   * Returnerer Record<par, KrakenTicker> — alltid full resultat.
   */
  async getTicker(pair: string): Promise<KrakenTicker> {
    const result = await this.request<Record<string, KrakenTicker>>(
      "Ticker",
      { pair },
      true,
    );
    return result[pair];
  }

  /**
   * Henter ticker for flere par — returnerer hele resultatet direkte.
   */
  async getTickers(pairs: string[]): Promise<Record<string, KrakenTicker>> {
    return this.request<Record<string, KrakenTicker>>(
      "Ticker",
      { pair: pairs.join(",") },
      true,
    );
  }

  /**
   * Henter alle tilgjengelige asset-par
   */
  async getAssetPairs(): Promise<Record<string, unknown>> {
    return this.request("AssetPairs", {}, true);
  }

  // ==================== PRIVATE METHODS ====================

  /**
   * Henter kontobalanse
   */
  async getBalance(): Promise<KrakenBalance> {
    return this.request("Balance");
  }

  /**
   * Plasserer market-ordre med volum oppgitt i QUOTE-valuta
   * (f.eks. "kjøp USDT for 60 EUR" på USDTEUR — oflag=viqc)
   */
  async marketBuyQuote(
    pair: string,
    quoteVolume: string,
  ): Promise<KrakenOrder> {
    return this.request("AddOrder", {
      pair,
      type: "buy",
      ordertype: "market",
      volume: quoteVolume,
      oflag: "viqc",
    });
  }

  /**
   * Plasserer market-ordre
   */
  async marketBuy(pair: string, volume: string): Promise<KrakenOrder> {
    return this.request("AddOrder", {
      pair,
      type: "buy",
      ordertype: "market",
      volume,
    });
  }

  /**
   * Plasserer limit-ordre
   */
  async limitBuy(
    pair: string,
    volume: string,
    price: string,
  ): Promise<KrakenOrder> {
    return this.request("AddOrder", {
      pair,
      type: "buy",
      ordertype: "limit",
      volume,
      price,
    });
  }

  /**
   * Selger med limit-ordre
   */
  async limitSell(
    pair: string,
    volume: string,
    price: string,
  ): Promise<KrakenOrder> {
    return this.request("AddOrder", {
      pair,
      type: "sell",
      ordertype: "limit",
      volume,
      price,
    });
  }

  /**
   * Selger med market-ordre
   */
  async marketSell(pair: string, volume: string): Promise<KrakenOrder> {
    return this.request("AddOrder", {
      pair,
      type: "sell",
      ordertype: "market",
      volume,
    });
  }

  /**
   * Henter åpne ordrer
   */
  async getOpenOrders(): Promise<Record<string, unknown>> {
    return this.request("OpenOrders");
  }

  /**
   * Kansellerer ordre
   */
  async cancelOrder(txid: string): Promise<Record<string, unknown>> {
    return this.request("CancelOrder", { txid });
  }

  /**
   * Henter trade-historikk
   */
  async getTradeHistory(): Promise<Record<string, unknown>> {
    return this.request("TradesHistory");
  }

  /**
   * Henter deposit-historikk
   */
  async getDepositHistory(): Promise<Record<string, unknown>> {
    return this.request("DepositStatus");
  }
}

// Singleton for enkel bruk
let defaultClient: KrakenClient | null = null;

export function getKrakenClient(): KrakenClient {
  if (!defaultClient) {
    const apiKey = process.env.KRAKEN_API_KEY;
    const apiSecret = process.env.KRAKEN_API_SECRET;

    if (!apiKey || !apiSecret) {
      throw new Error("KRAKEN_API_KEY and KRAKEN_API_SECRET must be set");
    }

    defaultClient = new KrakenClient(apiKey, apiSecret);
  }

  return defaultClient;
}

// For testing
export function setKrakenClient(client: KrakenClient): void {
  defaultClient = client;
}
