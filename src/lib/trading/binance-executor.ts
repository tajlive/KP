/**
 * Binance Live Trading Executor
 *
 * Executes real orders on Binance Spot market.
 * Handles:
 * - HMAC-SHA256 signature generation
 * - Real-time order placement
 * - Balance queries
 * - Position tracking
 * - Multi-endpoint failover for egress-IP blocks (Cloudflare Workers)
 *
 * Security:
 * - API keys are passed in (not stored in this class)
 * - All requests are signed with timestamp + recvWindow
 * - Rate limiting and circuit breaker are respected
 */

import type {
  OrderExecutor,
  OrderParams,
  OrderResult,
  BalanceInfo,
  Position,
  OrderBookSnapshot,
} from './order-executor';
import { createBinanceMarketDataProvider } from './canonical/market-data';
import { binanceCircuitBreaker, CircuitBreakerOpenError } from './circuit-breaker';
import { signBinanceQuery } from './binance-signer';
import { roundToLotSize } from './canonical/symbols/lot-sizes';
import type { NormalizedWalletBalance } from '@/lib/exchanges/types';

const marketDataProvider = createBinanceMarketDataProvider();

interface BinanceApiKeys {
  apiKey: string;
  apiSecret: string;
  testnet?: boolean;
}

interface BinanceOrderResponse {
  orderId: number;
  clientOrderId: string;
  transactTime: number;
  price: string;
  origQty: string;
  executedQty: string;
  cummulativeQuoteQty: string;
  status: 'NEW' | 'PARTIALLY_FILLED' | 'FILLED' | 'CANCELED' | 'REJECTED';
  type: 'MARKET' | 'LIMIT';
  side: 'BUY' | 'SELL';
  fills?: Array<{
    price: string;
    qty: string;
    commission: string;
    commissionAsset: string;
  }>;
}

// Mainnet endpoints. Binance/WAF sometimes blocks datacenter/cloud egress IPs
// (observed from Cloudflare Workers), so we rotate through the official mirrors.
const BINANCE_SIGNED_API_BASES = [
  'https://api.binance.com',
  'https://api1.binance.com',
  'https://api2.binance.com',
  'https://api3.binance.com',
  'https://api4.binance.com',
];

const BINANCE_TESTNET_BASES = ['https://testnet.binance.vision'];

const DEFAULT_RECV_WINDOW_MS = 5000;
const DEFAULT_TIMEOUT_MS = 10000;

// Statuses that may be transient and worth retrying once on the same mirror.
const RETRYABLE_STATUSES: Record<number, true> = {
  429: true,
  500: true,
  502: true,
  503: true,
  504: true,
};

function buildSignedQueryString(params: { [key: string]: unknown }): string {
  return Object.entries(params)
    .filter(([, value]) => value !== undefined && value !== null)
    .map(([key, value]) => [key, String(value)] as [string, string])
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(value)}`)
    .join('&');
}

function safeJsonParse(text: string): { msg?: string } | null {
  try {
    return JSON.parse(text) as { msg?: string };
  } catch {
    return null;
  }
}

export class BinanceExecutor implements OrderExecutor {
  private baseUrls: string[];
  private keys: BinanceApiKeys;

  constructor(keys: BinanceApiKeys) {
    this.keys = keys;
    this.baseUrls = keys.testnet ? BINANCE_TESTNET_BASES : BINANCE_SIGNED_API_BASES;
  }

  /**
   * Generate HMAC-SHA256 signature for Binance API
   */
  private async generateSignature(queryString: string): Promise<string> {
    return signBinanceQuery(this.keys.apiSecret, queryString);
  }

  /**
   * Single fetch attempt with timeout and safe error parsing.
   */
  private async fetchOnce<T>(
    url: string,
    method: 'GET' | 'POST',
  ): Promise<{ success: true; data: T } | { success: false; error: Error; status?: number }> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), DEFAULT_TIMEOUT_MS);

    try {
      const response = await fetch(url, {
        method,
        headers: {
          'X-MBX-APIKEY': this.keys.apiKey,
          Accept: 'application/json',
          'User-Agent': 'Klarpakke/1.0',
        },
        signal: controller.signal,
      });
      clearTimeout(timeoutId);

      if (!response.ok) {
        const body = await response.text().catch(() => '');
        const parsed = safeJsonParse(body);
        const message = parsed?.msg ?? response.statusText;
        const error = new Error(`Binance API error: ${response.status} ${message}`);
        return { success: false, error, status: response.status };
      }

      const data = (await response.json()) as T;
      return { success: true, data };
    } catch (error) {
      clearTimeout(timeoutId);
      return { success: false, error: error instanceof Error ? error : new Error(String(error)) };
    }
  }

  /**
   * Make an authenticated, signed request to Binance API with mirror failover.
   */
  private async makeRequest<T>(
    endpoint: string,
    method: 'GET' | 'POST' = 'GET',
    params: { [key: string]: unknown } = {},
  ): Promise<T> {
    const timestamp = Date.now();
    const queryParams = { ...params, recvWindow: DEFAULT_RECV_WINDOW_MS, timestamp };
    const queryString = buildSignedQueryString(queryParams);
    const signature = await this.generateSignature(queryString);
    const signedQuery = `${queryString}&signature=${signature}`;

    let lastError: Error | undefined;

    for (const base of this.baseUrls) {
      const url = `${base}${endpoint}?${signedQuery}`;
      const result = await this.fetchOnce<T>(url, method);

      if (result.success) {
        return result.data;
      }

      lastError = result.error;

      // Retry once on the same mirror for transient failures.
      if (result.status && RETRYABLE_STATUSES[result.status]) {
        const retryResult = await this.fetchOnce<T>(url, method);
        if (retryResult.success) {
          return retryResult.data;
        }
        lastError = retryResult.error;
      }
    }

    throw lastError ?? new Error('All Binance API endpoints failed');
  }

  /**
   * Execute a real trade order on Binance.
   * Protected by circuit breaker and lot-size validation.
   */
  async executeOrder(params: OrderParams): Promise<OrderResult> {
    try {
      return await binanceCircuitBreaker.execute(() => this.executeOrderInternal(params));
    } catch (error) {
      if (error instanceof CircuitBreakerOpenError) {
        return {
          success: false,
          orderId: '',
          error: 'Binance API temporarily unavailable (circuit breaker open). Please try again later.',
          executedPrice: 0,
          executedQuantity: 0,
          fee: 0,
          timestamp: new Date(),
        };
      }

      return {
        success: false,
        orderId: '',
        error: error instanceof Error ? error.message : 'Binance order failed',
        executedPrice: 0,
        executedQuantity: 0,
        fee: 0,
        timestamp: new Date(),
      };
    }
  }

  /**
   * Internal order execution (called through circuit breaker).
   */
  private async executeOrderInternal(params: OrderParams): Promise<OrderResult> {
    const normalizedSymbol = params.symbol.toUpperCase();
    const roundedQuantity = roundToLotSize(normalizedSymbol, params.quantity);

    if (roundedQuantity <= 0) {
      throw new Error(
        `Order quantity ${params.quantity} is below minimum lot size for ${normalizedSymbol}`,
      );
    }

    const orderParams: { [key: string]: unknown } = {
      symbol: normalizedSymbol,
      side: params.side.toUpperCase(),
      type: params.orderType.toUpperCase(),
      quantity: roundedQuantity,
    };

    if (params.orderType === 'limit' && params.price) {
      orderParams.price = params.price;
      orderParams.timeInForce = 'GTC'; // Good Till Cancel
    }

    const order = await this.makeRequest<BinanceOrderResponse>(
      '/api/v3/order',
      'POST',
      orderParams,
    );

    // Calculate average execution price
    const totalValue = order.fills?.reduce(
      (sum, fill) => sum + parseFloat(fill.price) * parseFloat(fill.qty),
      0,
    ) || 0;
    const executedQty = parseFloat(order.executedQty);
    const executedPrice = executedQty > 0 ? totalValue / executedQty : parseFloat(order.price);

    // Calculate total fees
    const fee = order.fills?.reduce(
      (sum, fill) => sum + parseFloat(fill.commission),
      0,
    ) || 0;

    return {
      success: true,
      orderId: order.orderId.toString(),
      executedPrice,
      executedQuantity: executedQty,
      fee,
      timestamp: new Date(order.transactTime),
    };
  }

  /**
   * Get current account balance
   */
  async getBalance(): Promise<BalanceInfo> {
    try {
      const account = await this.makeRequest<{
        balances: Array<{ asset: string; free: string; locked: string }>;
      }>('/api/v3/account');

      // Get USDT balance
      const usdtBalance = account.balances.find((b) => b.asset === 'USDT');

      if (!usdtBalance) {
        return { available: 0, locked: 0, total: 0 };
      }

      const available = parseFloat(usdtBalance.free);
      const locked = parseFloat(usdtBalance.locked);

      return {
        available,
        locked,
        total: available + locked,
      };
    } catch (error) {
      console.error('Failed to fetch balance:', error);
      return { available: 0, locked: 0, total: 0 };
    }
  }

  /**
   * Fetch all non-zero wallet balances from Binance account.
   */
  async fetchBalances(): Promise<NormalizedWalletBalance[]> {
    const account = await this.makeRequest<{
      balances: Array<{ asset: string; free: string; locked: string }>;
    }>('/api/v3/account');

    return account.balances
      .map((row) => ({
        currency: row.asset,
        balance: Number(row.free) + Number(row.locked),
      }))
      .filter((row) => Number.isFinite(row.balance) && row.balance > 0);
  }

  /**
   * Get current open position
   * Note: Binance Spot doesn't have native positions, we track via open orders
   */
  async getPosition(symbol: string): Promise<Position | null> {
    try {
      const normalizedSymbol = symbol.toUpperCase();

      // Get open orders for symbol
      const orders = await this.makeRequest<Array<{
        orderId: number;
        symbol: string;
        side: 'BUY' | 'SELL';
        price: string;
        origQty: string;
        executedQty: string;
        status: string;
        time: number;
      }>>('/api/v3/openOrders', 'GET', { symbol: normalizedSymbol });

      if (orders.length === 0) {
        return null;
      }

      // Calculate average entry (for buy orders)
      const buyOrders = orders.filter((o) => o.side === 'BUY');
      if (buyOrders.length === 0) {
        return null;
      }

      const totalQty = buyOrders.reduce((sum, o) => sum + parseFloat(o.executedQty), 0);
      const totalValue = buyOrders.reduce(
        (sum, o) => sum + parseFloat(o.price) * parseFloat(o.executedQty),
        0,
      );
      const entryPrice = totalValue / totalQty;

      // Calculate unrealized P&L
      const currentPrice = await this.getMarketPrice(normalizedSymbol);
      const currentValue = totalQty * currentPrice;
      const entryValue = totalValue;
      const unrealizedPnL = currentValue - entryValue;
      const unrealizedPnLPct = entryValue > 0 ? (unrealizedPnL / entryValue) * 100 : 0;

      return {
        symbol: normalizedSymbol,
        quantity: totalQty,
        entryPrice,
        entryTime: new Date(buyOrders[0].time),
        unrealizedPnL,
        unrealizedPnLPct,
      };
    } catch (error) {
      console.error('Failed to fetch position:', error);
      return null;
    }
  }

  /**
   * Validate API keys by making a test request
   */
  async validateApiKeys(): Promise<boolean> {
    try {
      await this.makeRequest('/api/v3/account');
      return true;
    } catch (error) {
      console.error('API key validation failed:', error);
      return false;
    }
  }

  /**
   * Get current market price
   */
  async getMarketPrice(symbol: string): Promise<number> {
    return marketDataProvider.getPrice(symbol);
  }

  /**
   * Get current order book (depth)
   */
  async fetchOrderBook(symbol: string, limit: number = 20): Promise<OrderBookSnapshot> {
    return marketDataProvider.getDepth(symbol, limit);
  }

  /**
   * Query the status of an existing order on Binance.
   * Returns the exchange status and filled quantity, or null on failure.
   * Protected by the Binance circuit breaker.
   */
  async getOrderStatus(symbol: string, orderId: string): Promise<{ status: string; filled: number } | null> {
    try {
      return await binanceCircuitBreaker.execute(() => this.getOrderStatusInternal(symbol, orderId));
    } catch (error) {
      if (error instanceof CircuitBreakerOpenError) {
        console.warn(`[BinanceExecutor] getOrderStatus circuit breaker open for ${symbol}/${orderId}`);
        return null;
      }
      console.error(`[BinanceExecutor] getOrderStatus failed for ${symbol}/${orderId}:`, error);
      return null;
    }
  }

  private async getOrderStatusInternal(symbol: string, orderId: string): Promise<{ status: string; filled: number } | null> {
    const order = await this.makeRequest<{
      orderId: number;
      status: string;
      executedQty: string;
    }>('/api/v3/order', 'GET', {
      symbol: symbol.toUpperCase(),
      orderId,
    });
    return {
      status: order.status,
      filled: parseFloat(order.executedQty),
    };
  }
}
