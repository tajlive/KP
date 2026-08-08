/**
 * KrakenExecutor — OrderExecutor-adapter for Kraken (live trading).
 *
 * EU/EØS-fakta (2026): Kraken er eneste børs (MiCA).
 * Kraken er MiCA-regulert og Klarpakkes eneste sanne live-vei. Denne
 * adapteren kobler den kanoniske executeTrade-pipelinen til Kraken:
 *   - Symboler konverteres (BTCUSDT → XBTUSDT, SOLUSDT → SOLUSDT)
 *   - Market-ordrer utføres via KrakenClient (μs-nonce, lockout-backoff)
 *   - Fill-pris hentes fra TradesHistory (sann utført pris, ikke estimat)
 *
 * Papir og live deler DÆRME samme engine: samme risiko-validering, samme
 * fill-modell, samme P&L — kun utførelsesadapteren er forskjellig.
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
import { KrakenClient, KrakenLockoutError } from "@/lib/exchanges/kraken/client";
import { decryptApiKey } from "@/lib/crypto/encrypt-api-keys";

/**
 * Interne symboler (BTCUSDT) → Kraken-par med USDC-kvote.
 * MÅ matche kraken-provider.ts (priskilde) — ellers blir priser og utførelse
 * i ulike valutaer, og P&L lyver. USDT er blokkert for norske brukere (MiCA).
 */
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

/** Kraken asset-koder for saldouttrekk (Kraken rapporterer XXBT, XDG osv.). */
const INTERNAL_TO_KRAKEN_ASSET: Record<string, string> = {
  BTC: "XXBT",
  DOGE: "XDG",
  ETH: "XETH",
  LINK: "XLINK",
};

function toKrakenPair(symbol: string): string {
  const s = symbol.toUpperCase().replace("/", "");
  return INTERNAL_TO_KRAKEN[s] ?? s;
}

function toKrakenAsset(base: string): string {
  return INTERNAL_TO_KRAKEN_ASSET[base] ?? base;
}

interface KrakenTradeRecord {
  ordertxid?: string;
  price?: string;
  cost?: string;
  fee?: string;
  vol?: string;
  time?: number;
}

interface KrakenTradesHistory {
  trades?: Record<string, KrakenTradeRecord>;
}

/** Maks sekunder tilbake vi søker i TradesHistory for fill-prisen. */
const FILL_LOOKBACK_SECONDS = 120;

export class KrakenExecutor implements OrderExecutor {
  private client: KrakenClient;

  constructor(private readonly clientOrKeys: KrakenClient | { apiKey: string; apiSecret: string }) {
    this.client =
      clientOrKeys instanceof KrakenClient
        ? clientOrKeys
        : new KrakenClient(clientOrKeys.apiKey, clientOrKeys.apiSecret);
  }

  /**
   * Oppretter KrakenExecutor fra brukerens lagrede (krypterte) Kraken-nøkler.
   * Brukes av ExecutorFactory — samme dekrypteringsmønster som autopilot-orkestratoren.
   */
  static async fromUser(
    supabase: SupabaseClient<Database>,
    userId: string,
  ): Promise<KrakenExecutor | null> {
    const { data, error } = await supabase
      .from("user_kraken_keys")
      .select("api_key_encrypted, api_secret_encrypted, is_active")
      .eq("user_id", userId)
      .eq("is_active", true)
      .maybeSingle();

    if (error) {
      console.error("[KrakenExecutor] fetch keys failed:", error.code, error.message);
      return null;
    }
    if (!data?.api_key_encrypted || !data.api_secret_encrypted) return null;

    try {
      const apiKey = await decryptApiKey(data.api_key_encrypted);
      const apiSecret = await decryptApiKey(data.api_secret_encrypted);
      return new KrakenExecutor({ apiKey, apiSecret });
    } catch (err) {
      console.error("[KrakenExecutor] key decryption failed:", err);
      return null;
    }
  }

  async executeOrder(params: OrderParams): Promise<OrderResult> {
    const krakenPair = toKrakenPair(params.symbol.toUpperCase());
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

    // Kraken krever volum med begrenset presisjon per par (KRAKEN_MIN_ORDER / 8 desimaler).
    const volume = quantity.toFixed(8);

    try {
      let txid: string;
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
        const limitPrice = price.toFixed(2);
        const order =
          params.side === "buy"
            ? await this.client.limitBuy(krakenPair, volume, limitPrice)
            : await this.client.limitSell(krakenPair, volume, limitPrice);
        txid = order.txid?.[0] ?? "";
      } else {
        const order =
          params.side === "buy"
            ? await this.client.marketBuy(krakenPair, volume)
            : await this.client.marketSell(krakenPair, volume);
        txid = order.txid?.[0] ?? "";
      }

      if (!txid) {
        return {
          success: false,
          orderId: "",
          executedPrice: 0,
          executedQuantity: 0,
          fee: 0,
          timestamp: new Date(),
          error: "Kraken accepted order but returned no txid",
        };
      }

      // Fill-pris: hent sann utført pris fra TradesHistory (siste 2 min).
      // Fallback: ticker-pris hvis trades ennå ikke er synlige.
      const fill = await this.resolveFill(txid, krakenPair);

      return {
        success: true,
        orderId: txid,
        executedPrice: fill.price,
        executedQuantity: fill.quantity,
        fee: fill.fee,
        timestamp: new Date(),
        slippagePct: 0, // Ekte fill — slippage er inneholdt i utført pris
      };
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      console.error(`[KrakenExecutor] Order failed (${params.symbol} ${params.side}):`, msg);
      return {
        success: false,
        orderId: "",
        executedPrice: 0,
        executedQuantity: 0,
        fee: 0,
        timestamp: new Date(),
        error: msg,
        ...(error instanceof KrakenLockoutError ? { permanent: false } : {}),
      };
    }
  }

  /** Hent fill (pris/kvantum/fee) fra TradesHistory; fallback til ticker. */
  private async resolveFill(
    txid: string,
    krakenPair: string,
  ): Promise<{ price: number; quantity: number; fee: number }> {
    try {
      const history = (await this.client.getTradeHistory()) as KrakenTradesHistory;
      const trades = history?.trades ?? {};
      const nowSec = Date.now() / 1000;
      for (const t of Object.values(trades)) {
        if (t.ordertxid !== txid) continue;
        if (t.time && nowSec - t.time > FILL_LOOKBACK_SECONDS) continue;
        const price = parseFloat(t.price ?? "0");
        const quantity = parseFloat(t.vol ?? "0");
        const fee = parseFloat(t.fee ?? "0");
        if (price > 0 && quantity > 0) {
          return { price, quantity, fee };
        }
      }
    } catch (err) {
      console.warn("[KrakenExecutor] TradesHistory lookup failed:", err);
    }

    // Fallback: siste utført pris fra ticker
    try {
      const ticker = await this.client.getTicker(krakenPair);
      const price = parseFloat(ticker.c?.[0] ?? "0");
      if (price > 0) return { price, quantity: 0, fee: 0 };
    } catch {
      // siste fallback nedenfor
    }

    return { price: 0, quantity: 0, fee: 0 };
  }

  async getBalance(): Promise<BalanceInfo> {
    try {
      const balance = await this.client.getBalance();
      // Klarpakke-kontrakt: live-kapital er USDC (USDT er blokkert for norske
      // brukere — MiCA). USDC-saldoen er tilgjengelig kapital for nye handler.
      const available = parseFloat(balance.USDC ?? "0") || 0;
      // Kontrakt-parity med PaperExecutor: locked er eksplisitt 0.
      return { available, locked: 0, total: available };
    } catch (error) {
      console.error("[KrakenExecutor] getBalance failed:", error);
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
    const krakenPair = toKrakenPair(symbol.toUpperCase());
    const ticker = await this.client.getTicker(krakenPair);
    const price = parseFloat(ticker.c?.[0] ?? "0");
    if (price <= 0) {
      throw new Error(`Kraken returned no price for ${krakenPair}`);
    }
    return price;
  }

  async fetchOrderBook(
    symbol: string,
    _limit: number = 20,
  ): Promise<OrderBookSnapshot> {
    const krakenPair = toKrakenPair(symbol.toUpperCase());
    const ticker = await this.client.getTicker(krakenPair);
    const ask = parseFloat(ticker.a?.[0] ?? "0");
    const bid = parseFloat(ticker.b?.[0] ?? "0");
    const last = parseFloat(ticker.c?.[0] ?? "0");
    const mid = last > 0 ? last : (ask + bid) / 2;
    return {
      bids: bid > 0 ? [{ price: bid, quantity: 0 }] : [],
      asks: ask > 0 ? [{ price: ask, quantity: 0 }] : [],
      timestamp: new Date(),
      // Merk: Kraken Ticker gir kun best-bid/ask (ikke full depth uten ekstra
      // kjøring mot public Depth-endepunktet). For fill-modellen holder dette.
    };
  }

  async getPosition(symbol: string): Promise<Position | null> {
    try {
      const krakenPair = toKrakenPair(symbol.toUpperCase());
      const base = symbol.toUpperCase().replace(/USDT$/, "");
      const asset = toKrakenAsset(base);
      const balance = await this.client.getBalance();
      const quantity = parseFloat(balance[asset] ?? "0") || 0;
      if (quantity <= 0) return null;

      const ticker = await this.client.getTicker(krakenPair);
      const price = parseFloat(ticker.c?.[0] ?? "0");
      return {
        symbol: symbol.toUpperCase(),
        quantity,
        entryPrice: price, // Nyeste pris som proxy — kraken gir ikke avg-cost enkelt
        entryTime: new Date(),
        unrealizedPnL: 0,
        unrealizedPnLPct: 0,
      };
    } catch (error) {
      console.error(`[KrakenExecutor] getPosition failed (${symbol}):`, error);
      return null;
    }
  }
}
