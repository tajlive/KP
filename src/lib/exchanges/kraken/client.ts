/**
 * Kraken API Client
 * Dokumentasjon: https://docs.kraken.com/api/
 */

import crypto from "crypto";

const KRAKEN_API_URL = "https://api.kraken.com";
const KRAKEN_API_VERSION = "0";

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
  o: string;   // Open
}

export class KrakenClient {
  private apiKey: string;
  private apiSecret: string;

  constructor(apiKey: string, apiSecret: string) {
    this.apiKey = apiKey;
    this.apiSecret = apiSecret;
  }

  private getNonce(): string {
    return Date.now().toString();
  }

  private signRequest(path: string, params: Record<string, string>): string {
    const nonce = this.getNonce();
    const postData = new URLSearchParams({ nonce, ...params }).toString();
    
    const hash = crypto.createHash("sha256")
      .update(nonce + postData)
      .digest();
    
    const hmac = crypto.createHmac("sha512", Buffer.from(this.apiSecret, "base64"))
      .update(path)
      .update(hash)
      .digest("base64");
    
    return hmac;
  }

  private async request<T>(
    endpoint: string,
    params: Record<string, string> = {},
    isPublic: boolean = false,
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
      const response = await fetch(fullUrl, { headers });
      return this.handleResponse<T>(response);
    } else {
      const nonce = this.getNonce();
      const signature = this.signRequest(path, params);
      
      headers["API-Key"] = this.apiKey;
      headers["API-Sign"] = signature;
      
      body = new URLSearchParams({ nonce, ...params }).toString();
      
      const response = await fetch(url, {
        method: "POST",
        headers,
        body,
      });
      return this.handleResponse<T>(response);
    }
  }

  private async handleResponse<T>(response: Response): Promise<T> {
    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Kraken API error: ${response.status} - ${error}`);
    }
    
    const data = await response.json();
    
    if (data.error && data.error.length > 0) {
      throw new Error(`Kraken API error: ${data.error.join(", ")}`);
    }
    
    return data.result as T;
  }

  // ==================== PUBLIC METHODS ====================

  /**
   * Henter ticker-info for et par
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
  async limitBuy(pair: string, volume: string, price: string): Promise<KrakenOrder> {
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
  async limitSell(pair: string, volume: string, price: string): Promise<KrakenOrder> {
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
