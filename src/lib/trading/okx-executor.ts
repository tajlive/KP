/**
 * OkxExecutor — OrderExecutor-adapter for OKX (live trading, børs #2).
 *
 * EU/EØS-fakta (2026): Kraken er primær børs (MiCA), OKX er børs #2
 * (MiCA via Malta, lavere fees: 0,08 % maker / 0,10 % taker).
 * Denne adapteren kobler den kanoniske executeTrade-pipelinen til OKX:
 *   - Symboler konverteres (BTCUSDT → BTC-USDT — OKX bruker bindestrek)
 *   - Market/limit-ordrer utføres via OkxClient (V5-signering, brokerCode-tag)
 *   - Fill-pris hentes fra /trade/fills (sann utført pris, ikke estimat)
 *
 * Kontrakt-parity med KrakenExecutor: samme OrderParams/OrderResult-kontrakt,
 * samme fill-modell, samme P&L — kun utførelsesadapteren er forskjellig.
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database.types";
import type {
  BalanceInfo,
  OrderBookSnapshot,
  OrderExecutor,
  OrderParams,
  OrderResult,
  Position,
} from "./order-executor";
import { OkxClient, OkxLockoutError } from "@/lib/exchanges/okx/client";
import { decryptApiKey } from "@/lib/crypto/encrypt-api-keys";

/**
 * Interne symboler (BTCUSDT) → OKX-instId (bindestrek-format).
 * MÅ matche okx-provider.ts (priskilde) — ellers blir priser og utførelse
 * i ulike valutaer, og P&L lyver.
 */
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
  // EU-konto (eea.okx.com): USDC-kvote (MiCA). Toms konto er USDC-denominert.
  BTCUSDC: "BTC-USDC",
  ETHUSDC: "ETH-USDC",
  SOLUSDC: "SOL-USDC",
};

function toOkxPair(symbol: string): string {
  const s = symbol.toUpperCase().replace("/", "");
  const mapped = INTERNAL_TO_OKX[s];
  if (mapped) return mapped;
  // OKX-konvensjon: bindestrek mellom base og quote (XRPUSDT → XRP-USDT)
  return s.replace(/^(.*?)(USDT|USDC)$/, "$1-$2");
}

/** Maks millisekunder tilbake vi søker i fills for fill-prisen. */
const FILL_LOOKBACK_MS = 120_000;

export class OkxExecutor implements OrderExecutor {
  private client: OkxClient;

  constructor(clientOrKeys: OkxClient | {
    apiKey: string;
    apiSecret: string;
    passphrase: string;
    brokerCode?: string;
  }) {
    this.client =
      clientOrKeys instanceof OkxClient
        ? clientOrKeys
        : new OkxClient(clientOrKeys);
  }

  /**
   * Oppretter OkxExecutor fra brukerens lagrede (krypterte) OKX-nøkler.
   * Brukes av ExecutorFactory — samme dekrypteringsmønster som KrakenExecutor.
   */
  static async fromUser(
    supabase: SupabaseClient<Database>,
    userId: string,
  ): Promise<OkxExecutor | null> {
    const { data, error } = await supabase
      .from("user_okx_keys")
      .select(
        "api_key_encrypted, api_secret_encrypted, passphrase_encrypted, broker_code, is_active",
      )
      .eq("user_id", userId)
      .eq("is_active", true)
      .maybeSingle();

    if (error) {
      console.error("[OkxExecutor] fetch keys failed:", error.code, error.message);
      return null;
    }
    if (
      !data?.api_key_encrypted ||
      !data.api_secret_encrypted ||
      !data.passphrase_encrypted
    ) {
      return null;
    }

    try {
      const apiKey = await decryptApiKey(data.api_key_encrypted);
      const apiSecret = await decryptApiKey(data.api_secret_encrypted);
      const passphrase = await decryptApiKey(data.passphrase_encrypted);
      return new OkxExecutor({
        apiKey,
        apiSecret,
        passphrase,
        brokerCode: data.broker_code ?? undefined,
      });
    } catch (err) {
      console.error("[OkxExecutor] key decryption failed:", err);
      return null;
    }
  }

  async executeOrder(params: OrderParams): Promise<OrderResult> {
    const instId = toOkxPair(params.symbol.toUpperCase());
    const quantity = params.quantity;

    if (quantity <= 0 || !Number.isFinite(quantity)) {
      return {
        success: false,
        orderId: "",
        executedPrice: 0,
        executedQuantity: 0,
        fee: 0,
        timestamp: new Date(),
        error: "Invalid quantity",
      };
    }

    // OKX aksepterer volum som desimalstreng (maks 18 desimaler).
    const sz = quantity.toString();

    try {
      let ordId: string;
      if (params.orderType === "limit") {
        const price = params.price ?? 0;
        if (price <= 0) {
          return {
            success: false,
            orderId: "",
            executedPrice: 0,
            executedQuantity: 0,
            fee: 0,
            timestamp: new Date(),
            error: "Limit price required for limit order",
          };
        }
        const order = await this.client.placeOrder({
          instId,
          side: params.side,
          ordType: "limit",
          sz,
          px: price.toString(),
        });
        ordId = order[0]?.ordId ?? "";
      } else {
        const order = await this.client.placeOrder({
          instId,
          side: params.side,
          ordType: "market",
          sz,
        });
        ordId = order[0]?.ordId ?? "";
      }

      if (!ordId) {
        return {
          success: false,
          orderId: "",
          executedPrice: 0,
          executedQuantity: 0,
          fee: 0,
          timestamp: new Date(),
          error: "OKX accepted order but returned no ordId",
        };
      }

      // Fill-pris: hent sann utført pris fra /trade/fills (siste 2 min).
      const fill = await this.resolveFill(ordId, instId);

      return {
        success: true,
        orderId: ordId,
        executedPrice: fill.price,
        executedQuantity: fill.quantity,
        fee: fill.fee,
        timestamp: new Date(),
        slippagePct: 0, // Ekte fill — slippage er inneholdt i utført pris
      };
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      console.error(`[OkxExecutor] Order failed (${params.symbol} ${params.side}):`, msg);
      return {
        success: false,
        orderId: "",
        executedPrice: 0,
        executedQuantity: 0,
        fee: 0,
        timestamp: new Date(),
        error: msg,
        ...(error instanceof OkxLockoutError ? { permanent: false } : {}),
      };
    }
  }

  /** Hent fill (pris/kvantum/fee) fra /trade/fills; fallback til ticker. */
  private async resolveFill(
    ordId: string,
    instId: string,
  ): Promise<{ price: number; quantity: number; fee: number }> {
    try {
      const fills = await this.client.getFills(instId, ordId);
      const nowMs = Date.now();
      let price = 0;
      let quantity = 0;
      let fee = 0;
      for (const f of fills) {
        if (f.ordId && f.ordId !== ordId) continue;
        if (f.ts && nowMs - Number(f.ts) > FILL_LOOKBACK_MS) continue;
        const p = parseFloat(f.fillPx ?? "0");
        const q = parseFloat(f.fillSz ?? "0");
        const fe = parseFloat(f.fillFee ?? "0");
        if (p > 0 && q > 0) {
          price += p * q;
          quantity += q;
          fee += fe;
        }
      }
      if (price > 0 && quantity > 0) {
        // Vektet snitt-pris — unngå flyttallsfeil (64820.5*0.001/0.001 = 64820.499…)
        const avgPrice = Math.round((price / quantity) * 100) / 100;
        return { price: avgPrice, quantity, fee };
      }
    } catch (err) {
      console.warn("[OkxExecutor] fills lookup failed:", err);
    }

    // Fallback: siste utført pris fra ticker
    try {
      const ticker = await this.client.getTicker(instId);
      const price = parseFloat(ticker?.last ?? "0");
      if (price > 0) return { price, quantity: 0, fee: 0 };
    } catch {
      // siste fallback nedenfor
    }

    return { price: 0, quantity: 0, fee: 0 };
  }

  async getBalance(): Promise<BalanceInfo> {
    try {
      const balance = await this.client.getBalance();
      // Toms OKX-konto er EU (eea.okx.com) — kvote er USDC (MiCA), ikke USDT.
      // Les USDC først, fall tilbake til USDT for konti som har begge.
      const available =
        parseFloat(balance.USDC ?? "0") || parseFloat(balance.USDT ?? "0") || 0;
      // Kontrakt-parity med PaperExecutor: locked er eksplisitt 0.
      return { available, locked: 0, total: available };
    } catch (error) {
      console.error("[OkxExecutor] getBalance failed:", error);
      return { available: 0, locked: 0, total: 0 };
    }
  }

  async validateApiKeys(): Promise<boolean> {
    try {
      await this.client.getBalance();
      return true;
    } catch {
      return false;
    }
  }

  async getMarketPrice(symbol: string): Promise<number> {
    const instId = toOkxPair(symbol.toUpperCase());
    const ticker = await this.client.getTicker(instId);
    const price = parseFloat(ticker?.last ?? "0");
    if (price <= 0) {
      throw new Error(`OKX returned no price for ${instId}`);
    }
    return price;
  }

  async fetchOrderBook(
    symbol: string,
    _limit: number = 20,
  ): Promise<OrderBookSnapshot> {
    const instId = toOkxPair(symbol.toUpperCase());
    const ticker = await this.client.getTicker(instId);
    const ask = parseFloat(ticker?.askPx ?? "0");
    const bid = parseFloat(ticker?.bidPx ?? "0");
    const last = parseFloat(ticker?.last ?? "0");
    const mid = last > 0 ? last : (ask + bid) / 2;
    return {
      bids: bid > 0 ? [{ price: bid, quantity: 0 }] : [],
      asks: ask > 0 ? [{ price: ask, quantity: 0 }] : [],
      timestamp: new Date(),
      // Merk: OKX Ticker gir kun best-bid/ask (ikke full depth uten ekstra
      // kjøring mot /market/books). For fill-modellen holder dette.
    };
  }

  async getPosition(symbol: string): Promise<Position | null> {
    try {
      const instId = toOkxPair(symbol.toUpperCase());
      const base = symbol.toUpperCase().replace(/USDT$/, "");
      const balance = await this.client.getBalance();
      const quantity = parseFloat(balance[base] ?? "0") || 0;
      if (quantity <= 0) return null;

      const ticker = await this.client.getTicker(instId);
      const price = parseFloat(ticker?.last ?? "0");
      return {
        symbol: symbol.toUpperCase(),
        quantity,
        entryPrice: price, // Nyeste pris som proxy — OKX gir ikke avg-cost enkelt
        entryTime: new Date(),
        unrealizedPnL: 0,
        unrealizedPnLPct: 0,
      };
    } catch (error) {
      console.error(`[OkxExecutor] getPosition failed (${symbol}):`, error);
      return null;
    }
  }
}
