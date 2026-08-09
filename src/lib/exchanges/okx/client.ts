/**
 * OKX V5 REST-klient — autentiserte kall (spot, private).
 *
 * Signering (OKX V5):
 *   - OK-ACCESS-SIGN = base64(HMAC_SHA256(timestamp + method + requestPath + body, secretKey))
 *   - OK-ACCESS-TIMESTAMP = ISO8601 UTC (f.eks. 2026-08-08T12:00:00.000Z)
 *   - OK-ACCESS-PASSPHRASE = passphrase satt ved API-nøkkel-opprettelse
 *
 * OKX har IKKE nonce-window-problemet som Kraken — timestamp er ISO-streng.
 * Rate-limit: 429 → OkxLockoutError (konsistent med KrakenLockoutError).
 */

const API_BASE = "https://eea.okx.com/api/v5";
const REQUEST_TIMEOUT_MS = 15_000;

/** Kastet ved OKX rate-limit (HTTP 429) eller midlertidige feil — retry med backoff. */
export class OkxLockoutError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "OkxLockoutError";
  }
}

export interface OkxClientConfig {
  apiKey: string;
  apiSecret: string;
  passphrase: string;
  brokerCode?: string;
  simulate?: boolean; // x-simulated-trading: 1 (OKX demo-trading)
}

export interface OkxOrderResult {
  ordId: string;
  clOrdId: string;
  tag: string;
  sCode: string;
  sMsg: string;
}

export interface OkxFillRecord {
  ordId?: string;
  fillPx?: string;
  fillSz?: string;
  fillFee?: string;
  feeCcy?: string;
  ts?: string;
  side?: string;
  instId?: string;
}

export class OkxClient {
  private readonly apiKey: string;
  private readonly apiSecret: string;
  private readonly passphrase: string;
  private readonly brokerCode?: string;
  private readonly simulate: boolean;

  constructor(config: OkxClientConfig) {
    this.apiKey = config.apiKey;
    this.apiSecret = config.apiSecret;
    this.passphrase = config.passphrase;
    this.brokerCode = config.brokerCode;
    this.simulate = config.simulate ?? false;
  }

  private async sign(timestamp: string, method: string, requestPath: string, body: string): Promise<string> {
    const message = `${timestamp}${method}${requestPath}${body}`;
    const key = new TextEncoder().encode(this.apiSecret);
    const data = new TextEncoder().encode(message);
    return signHmacSha256Base64(key, data);
  }

  private async request<T>(
    method: "GET" | "POST",
    path: string,
    body?: Record<string, unknown>,
  ): Promise<T> {
    const timestamp = new Date().toISOString();
    const bodyStr = body ? JSON.stringify(body) : "";
    // OKX-signering krever requestPath inkl. /api/v5-prefiks
    // (f.eks. /api/v5/trade/order) — GET query-string er også del av stien.
    const requestPath = `/api/v5${path}`;
    const sign = await this.sign(timestamp, method, requestPath, bodyStr);

    const headers: Record<string, string> = {
      "OK-ACCESS-KEY": this.apiKey,
      "OK-ACCESS-SIGN": sign,
      "OK-ACCESS-TIMESTAMP": timestamp,
      "OK-ACCESS-PASSPHRASE": this.passphrase,
      "Content-Type": "application/json",
    };
    if (this.simulate) {
      headers["x-simulated-trading"] = "1";
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

    try {
      const response = await fetch(`${API_BASE}${path}`, {
        method,
        headers,
        body: bodyStr || undefined,
        signal: controller.signal,
      });
      clearTimeout(timeoutId);

      if (response.status === 429) {
        throw new OkxLockoutError("OKX rate limited (HTTP 429)");
      }
      if (!response.ok) {
        throw new Error(`OKX API error: HTTP ${response.status} for ${path}`);
      }

      const json = (await response.json()) as { code: string; msg: string; data: T };
      if (json.code !== "0") {
        // 51000+ = generisk feil; 50111 = rate limit (OKX "Too many requests")
        if (json.code === "50111" || json.code === "50011") {
          throw new OkxLockoutError(`OKX rate limited (${json.code} ${json.msg})`);
        }
        throw new Error(`OKX API error: ${json.code} ${json.msg}`);
      }
      return json.data;
    } catch (error) {
      clearTimeout(timeoutId);
      throw error;
    }
  }

  /** Plasser ordre. `tag` = brokerCode for rebate-tagging (OKX Broker Program). */
  async placeOrder(params: {
    instId: string;
    side: "buy" | "sell";
    ordType: "market" | "limit";
    sz: string;
    px?: string;
  }): Promise<OkxOrderResult[]> {
    const body: Record<string, unknown> = {
      instId: params.instId,
      tdMode: "cash", // spot-handel uten margin
      side: params.side,
      ordType: params.ordType,
      sz: params.sz,
    };
    if (params.px !== undefined) body.px = params.px;
    if (this.brokerCode) body.tag = this.brokerCode;

    return this.request<OkxOrderResult[]>("POST", "/trade/order", body);
  }

  /** Saldo (funding + trading). Klarpakke-kontrakt: USDT-kvote (OKX). */
  async getBalance(): Promise<Record<string, string>> {
    const data = await this.request<
      Array<{ details?: Array<{ ccy: string; availBal?: string; eq?: string }> }>
    >("GET", "/account/balance");
    const details = data?.[0]?.details ?? [];
    const result: Record<string, string> = {};
    for (const d of details) {
      result[d.ccy] = d.eq ?? d.availBal ?? "0";
    }
    return result;
  }

  /** Fills (utførte delhandler) for en ordre — sanne fill-priser. */
  async getFills(instId: string, ordId: string): Promise<OkxFillRecord[]> {
    return this.request<OkxFillRecord[]>(
      "GET",
      `/trade/fills?instId=${instId}&ordId=${ordId}`,
    );
  }

  /** Ticker (public — brukes som fallback for fill-pris). */
  async getTicker(instId: string): Promise<{ last: string; askPx: string; bidPx: string } | null> {
    const data = await this.request<
      Array<{ last?: string; askPx?: string; bidPx?: string }>
    >("GET", `/market/ticker?instId=${instId}`);
    if (data.length === 0) return null;
    return {
      last: data[0].last ?? "0",
      askPx: data[0].askPx ?? "0",
      bidPx: data[0].bidPx ?? "0",
    };
  }
}

/** HMAC-SHA256 → base64 (Web Crypto, ingen node:crypto — edge-kompatibel). */
export async function signHmacSha256Base64(
  key: Uint8Array,
  data: Uint8Array,
): Promise<string> {
  const cryptoObj = globalThis.crypto;
  const imported = await cryptoObj.subtle.importKey(
    "raw",
    key as BufferSource,
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const signature = await cryptoObj.subtle.sign("HMAC", imported, data as BufferSource);
  return btoa(String.fromCharCode(...new Uint8Array(signature)));
}
