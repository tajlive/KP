/**
 * Binance Proxy Executor
 *
 * Routes signed Binance API requests through the Supabase Edge Function
 * `binance-proxy` to avoid Cloudflare Worker egress IP blocks.
 *
 * Implements OrderExecutor so ExecutorFactory callers are unchanged.
 *
 * Security:
 * - API keys live only in this request and the Edge Function invocation.
 * - Uses SUPABASE_SERVICE_ROLE_KEY for Edge Function auth.
 * - Public market data (price, order book) stays in the Worker via MarketDataProvider.
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import {
  type OrderExecutor,
  type OrderParams,
  type OrderResult,
  type BalanceInfo,
  type Position,
  type OrderBookSnapshot,
} from "./order-executor";
import { createBinanceMarketDataProvider } from "./canonical/market-data";
import { binanceCircuitBreaker, CircuitBreakerOpenError } from "./circuit-breaker";
import { roundToLotSize } from "./canonical/symbols/lot-sizes";

const marketDataProvider = createBinanceMarketDataProvider();

interface BinanceProxyResponse {
  ok: true;
  status: number;
  data: unknown;
  endpointUsed?: string;
}

interface BinanceProxyError {
  ok: false;
  error: string;
  status?: number;
  endpointUsed?: string;
}

interface BinanceOrderResponse {
  orderId: number;
  clientOrderId: string;
  transactTime: number;
  price: string;
  origQty: string;
  executedQty: string;
  cummulativeQuoteQty: string;
  status: "NEW" | "PARTIALLY_FILLED" | "FILLED" | "CANCELED" | "REJECTED";
  type: "MARKET" | "LIMIT";
  side: "BUY" | "SELL";
  fills?: Array<{
    price: string;
    qty: string;
    commission: string;
    commissionAsset: string;
  }>;
}

type Action = "account" | "order" | "balance" | "openOrders" | "cancelOrder" | "orderStatus" | "testConnection";

export class BinanceProxyExecutor implements OrderExecutor {
  private proxyUrl: string;

  constructor(
    private supabase: SupabaseClient,
    private userId: string,
    private apiKey: string,
    private apiSecret: string,
    private testnet: boolean,
  ) {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    if (!supabaseUrl) {
      throw new Error("NEXT_PUBLIC_SUPABASE_URL is not configured");
    }
    this.proxyUrl = `${supabaseUrl}/functions/v1/binance-proxy`;
  }

  private async invokeProxy(
    action: Action,
    params?: Record<string, string | number>,
  ): Promise<unknown> {
    const proxySecret = process.env.BINANCE_PROXY_SECRET;
    if (!proxySecret) {
      throw new Error("BINANCE_PROXY_SECRET is not configured");
    }

    // Supabase Edge Functions require a valid JWT in the Authorization header.
    // The anonymous key is sufficient for the gateway; the actual proxy access
    // control is enforced via X-Binance-Proxy-Secret inside the function.
    const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    if (!anonKey) {
      throw new Error("NEXT_PUBLIC_SUPABASE_ANON_KEY is not configured");
    }

    const response = await fetch(this.proxyUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${anonKey}`,
        "X-Binance-Proxy-Secret": proxySecret,
      },
      body: JSON.stringify({
        action,
        apiKey: this.apiKey,
        apiSecret: this.apiSecret,
        testnet: this.testnet,
        params,
      }),
    });

    let payload: BinanceProxyResponse | BinanceProxyError;
    try {
      payload = await response.json() as BinanceProxyResponse | BinanceProxyError;
    } catch {
      throw new Error(`Binance proxy returned non-JSON: ${response.status} ${response.statusText}`);
    }

    if (!response.ok || !payload.ok) {
      const message = "error" in payload && payload.error ? payload.error : `Proxy error: ${response.status}`;
      const error = new Error(message);
      (error as Error & { status?: number }).status = payload.status ?? response.status;
      throw error;
    }

    return payload.data;
  }

  async executeOrder(params: OrderParams): Promise<OrderResult> {
    try {
      return await binanceCircuitBreaker.execute(() => this.executeOrderInternal(params));
    } catch (error) {
      if (error instanceof CircuitBreakerOpenError) {
        return {
          success: false,
          orderId: "",
          error: "Binance API temporarily unavailable (circuit breaker open). Please try again later.",
          executedPrice: 0,
          executedQuantity: 0,
          fee: 0,
          timestamp: new Date(),
        };
      }
      return {
        success: false,
        orderId: "",
        error: error instanceof Error ? error.message : "Binance order failed",
        executedPrice: 0,
        executedQuantity: 0,
        fee: 0,
        timestamp: new Date(),
      };
    }
  }

  private async executeOrderInternal(params: OrderParams): Promise<OrderResult> {
    const normalizedSymbol = params.symbol.toUpperCase();
    const roundedQuantity = roundToLotSize(normalizedSymbol, params.quantity);

    if (roundedQuantity <= 0) {
      throw new Error(
        `Order quantity ${params.quantity} is below minimum lot size for ${normalizedSymbol}`,
      );
    }

    const orderParams: Record<string, string | number> = {
      symbol: normalizedSymbol,
      side: params.side.toUpperCase(),
      type: params.orderType.toUpperCase(),
      quantity: roundedQuantity,
    };

    if (params.orderType === "limit" && params.price) {
      orderParams.price = params.price;
      orderParams.timeInForce = "GTC";
    }

    const order = (await this.invokeProxy("order", orderParams)) as BinanceOrderResponse;

    const totalValue =
      order.fills?.reduce(
        (sum, fill) => sum + parseFloat(fill.price) * parseFloat(fill.qty),
        0,
      ) || 0;
    const executedQty = parseFloat(order.executedQty);
    const executedPrice = executedQty > 0 ? totalValue / executedQty : parseFloat(order.price);

    const fee =
      order.fills?.reduce((sum, fill) => sum + parseFloat(fill.commission), 0) || 0;

    return {
      success: true,
      orderId: order.orderId.toString(),
      executedPrice,
      executedQuantity: executedQty,
      fee,
      timestamp: new Date(order.transactTime),
    };
  }

  async getBalance(): Promise<BalanceInfo> {
    try {
      const account = (await this.invokeProxy("balance")) as {
        balances: Array<{ asset: string; free: string; locked: string }>;
      };

      const usdtBalance = account.balances.find((b) => b.asset === "USDT");

      if (!usdtBalance) {
        return { available: 0, locked: 0, total: 0 };
      }

      const available = parseFloat(usdtBalance.free);
      const locked = parseFloat(usdtBalance.locked);

      return { available, locked, total: available + locked };
    } catch (error) {
      console.error("Failed to fetch balance via proxy:", error);
      return { available: 0, locked: 0, total: 0 };
    }
  }

  async getPosition(symbol: string): Promise<Position | null> {
    try {
      const normalizedSymbol = symbol.toUpperCase();

      const orders = (await this.invokeProxy("openOrders", { symbol: normalizedSymbol })) as Array<{
        orderId: number;
        symbol: string;
        side: "BUY" | "SELL";
        price: string;
        origQty: string;
        executedQty: string;
        status: string;
        time: number;
      }>;

      if (orders.length === 0) {
        return null;
      }

      const buyOrders = orders.filter((o) => o.side === "BUY");
      if (buyOrders.length === 0) {
        return null;
      }

      const totalQty = buyOrders.reduce((sum, o) => sum + parseFloat(o.executedQty), 0);
      const totalValue = buyOrders.reduce(
        (sum, o) => sum + parseFloat(o.price) * parseFloat(o.executedQty),
        0,
      );
      const entryPrice = totalValue / totalQty;

      const currentPrice = await this.getMarketPrice(normalizedSymbol);
      const currentValue = totalQty * currentPrice;
      const unrealizedPnL = currentValue - totalValue;
      const unrealizedPnLPct = totalValue > 0 ? (unrealizedPnL / totalValue) * 100 : 0;

      return {
        symbol: normalizedSymbol,
        quantity: totalQty,
        entryPrice,
        entryTime: new Date(buyOrders[0].time),
        unrealizedPnL,
        unrealizedPnLPct,
      };
    } catch (error) {
      console.error("Failed to fetch position via proxy:", error);
      return null;
    }
  }

  async validateApiKeys(): Promise<boolean> {
    try {
      await this.invokeProxy("testConnection");
      return true;
    } catch (error) {
      console.error("API key validation via proxy failed:", error);
      return false;
    }
  }

  async getMarketPrice(symbol: string): Promise<number> {
    return marketDataProvider.getPrice(symbol);
  }

  async fetchOrderBook(symbol: string, limit: number = 20): Promise<OrderBookSnapshot> {
    return marketDataProvider.getDepth(symbol, limit);
  }

  async getOrderStatus(symbol: string, orderId: string): Promise<{ status: string; filled: number } | null> {
    try {
      return await binanceCircuitBreaker.execute(() => this.getOrderStatusInternal(symbol, orderId));
    } catch (error) {
      if (error instanceof CircuitBreakerOpenError) {
        console.warn(`[BinanceProxyExecutor] getOrderStatus circuit breaker open for ${symbol}/${orderId}`);
        return null;
      }
      console.error(`[BinanceProxyExecutor] getOrderStatus failed for ${symbol}/${orderId}:`, error);
      return null;
    }
  }

  private async getOrderStatusInternal(symbol: string, orderId: string): Promise<{ status: string; filled: number } | null> {
    const order = (await this.invokeProxy("orderStatus", {
      symbol: symbol.toUpperCase(),
      orderId,
    })) as { orderId: number; status: string; executedQty: string };

    return {
      status: order.status,
      filled: parseFloat(order.executedQty),
    };
  }
}
