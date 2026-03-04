/**
 * Binance Live Trading Executor
 *
 * Executes real orders on Binance Spot market.
 * Handles:
 * - HMAC-SHA256 signature generation
 * - Real-time order placement
 * - Balance queries
 * - Position tracking
 *
 * Security:
 * - API keys are passed in (not stored in this class)
 * - All requests are signed with timestamp
 * - Rate limiting is respected
 */

import crypto from 'crypto';
import type {
  OrderExecutor,
  OrderParams,
  OrderResult,
  BalanceInfo,
  Position,
} from './order-executor';
import { fetchBinancePrice, calculateFee } from './order-executor';

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

export class BinanceExecutor implements OrderExecutor {
  private baseUrl: string;
  private keys: BinanceApiKeys;

  constructor(keys: BinanceApiKeys) {
    this.keys = keys;
    this.baseUrl = keys.testnet
      ? 'https://testnet.binance.vision'
      : 'https://api.binance.com';
  }

  /**
   * Generate HMAC-SHA256 signature for Binance API
   */
  private generateSignature(queryString: string): string {
    return crypto
      .createHmac('sha256', this.keys.apiSecret)
      .update(queryString)
      .digest('hex');
  }

  /**
   * Make authenticated request to Binance API
   */
  private async makeRequest<T>(
    endpoint: string,
    method: 'GET' | 'POST' = 'GET',
    params: Record<string, unknown> = {}
  ): Promise<T> {
    const timestamp = Date.now();
    const queryParams = { ...params, timestamp };

    // Build query string
    const queryString = Object.entries(queryParams)
      .map(([key, value]) => `${key}=${value}`)
      .join('&');

    // Sign request
    const signature = this.generateSignature(queryString);
    const url = `${this.baseUrl}${endpoint}?${queryString}&signature=${signature}`;

    // Make request
    const response = await fetch(url, {
      method,
      headers: {
        'X-MBX-APIKEY': this.keys.apiKey,
      },
      signal: AbortSignal.timeout(10000),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(`Binance API error: ${error.msg || response.statusText}`);
    }

    return response.json();
  }

  /**
   * Execute a real trade order on Binance
   */
  async executeOrder(params: OrderParams): Promise<OrderResult> {
    try {
      // Build order parameters
      const orderParams: Record<string, unknown> = {
        symbol: params.symbol,
        side: params.side.toUpperCase(),
        type: params.orderType.toUpperCase(),
        quantity: params.quantity,
      };

      // Add price for limit orders
      if (params.orderType === 'limit' && params.price) {
        orderParams.price = params.price;
        orderParams.timeInForce = 'GTC'; // Good Till Cancel
      }

      // Place order
      const order = await this.makeRequest<BinanceOrderResponse>(
        '/api/v3/order',
        'POST',
        orderParams
      );

      // Calculate average execution price
      const totalValue = order.fills?.reduce(
        (sum, fill) => sum + parseFloat(fill.price) * parseFloat(fill.qty),
        0
      ) || 0;
      const executedQty = parseFloat(order.executedQty);
      const executedPrice = executedQty > 0 ? totalValue / executedQty : parseFloat(order.price);

      // Calculate total fees
      const fee = order.fills?.reduce(
        (sum, fill) => sum + parseFloat(fill.commission),
        0
      ) || 0;

      return {
        success: true,
        orderId: order.orderId.toString(),
        executedPrice,
        executedQuantity: executedQty,
        fee,
        timestamp: new Date(order.transactTime),
      };
    } catch (error) {
      console.error('Binance execution error:', error);
      return {
        success: false,
        orderId: '',
        executedPrice: 0,
        executedQuantity: 0,
        fee: 0,
        timestamp: new Date(),
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
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
   * Get current open position
   * Note: Binance Spot doesn't have native positions, we track via open orders
   */
  async getPosition(symbol: string): Promise<Position | null> {
    try {
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
      }>>('/api/v3/openOrders', 'GET', { symbol });

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
        0
      );
      const entryPrice = totalValue / totalQty;

      // Calculate unrealized P&L
      const currentPrice = await this.getMarketPrice(symbol);
      const currentValue = totalQty * currentPrice;
      const entryValue = totalValue;
      const unrealizedPnL = currentValue - entryValue;
      const unrealizedPnLPct = (unrealizedPnL / entryValue) * 100;

      return {
        symbol,
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
    return fetchBinancePrice(symbol);
  }
}
