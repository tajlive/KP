/**
 * Binance Exchange Integration
 * Free tier: 1200 requests/minute, perfect for retail traders
 * 
 * Features for free users:
 * - Spot trading (buy/sell)
 * - Market orders
 * - Basic stop-loss / take-profit
 * - Real-time balance sync
 */

import crypto from 'crypto';

const BINANCE_API_URL = 'https://api.binance.com';
const BINANCE_TESTNET_URL = 'https://testnet.binance.vision';

export interface BinanceCredentials {
  apiKey: string;
  apiSecret: string;
  isTestnet?: boolean;
}

export interface BinanceOrder {
  symbol: string;
  side: 'BUY' | 'SELL';
  type: 'MARKET' | 'LIMIT' | 'STOP_LOSS' | 'TAKE_PROFIT';
  quantity?: number;
  quoteOrderQty?: number;  // For market orders in quote asset (e.g., USDT)
  price?: number;          // Required for LIMIT orders
  stopPrice?: number;      // Required for STOP_LOSS/TAKE_PROFIT
  timeInForce?: 'GTC' | 'IOC' | 'FOK';
}

export interface BinanceOrderResponse {
  symbol: string;
  orderId: number;
  clientOrderId: string;
  transactTime: number;
  price: string;
  origQty: string;
  executedQty: string;
  status: 'NEW' | 'PARTIALLY_FILLED' | 'FILLED' | 'CANCELED' | 'REJECTED';
  timeInForce: string;
  type: string;
  side: string;
  fills?: Array<{
    price: string;
    qty: string;
    commission: string;
    commissionAsset: string;
  }>;
}

export interface BinanceAccount {
  makerCommission: number;
  takerCommission: number;
  buyerCommission: number;
  sellerCommission: number;
  canTrade: boolean;
  canWithdraw: boolean;
  canDeposit: boolean;
  balances: Array<{
    asset: string;
    free: string;
    locked: string;
  }>;
}

export interface BinanceTicker {
  symbol: string;
  price: string;
}

export interface BinanceOrderStatus {
  symbol: string;
  orderId: number;
  clientOrderId: string;
  price: string;
  origQty: string;
  executedQty: string;
  status: string;
  timeInForce: string;
  type: string;
  side: string;
  stopPrice?: string;
  time: number;
}

export interface BinanceCancelOrderResponse {
  symbol: string;
  origClientOrderId: string;
  orderId: number;
  orderListId: number;
  clientOrderId: string;
  price: string;
  origQty: string;
  executedQty: string;
  cumulativeQuoteQty: string;
  status: string;
  timeInForce: string;
  type: string;
  side: string;
  selfTradePreventionMode: string;
}

export interface BinanceTrade {
  symbol: string;
  id: number;
  orderId: number;
  orderListId: number;
  price: string;
  qty: string;
  quoteQty: string;
  commission: string;
  commissionAsset: string;
  time: number;
  isBuyer: boolean;
  isMaker: boolean;
  isBestMatch: boolean;
}

export class BinanceService {
  private apiKey: string;
  private apiSecret: string;
  private baseUrl: string;

  constructor(credentials: BinanceCredentials) {
    this.apiKey = credentials.apiKey;
    this.apiSecret = credentials.apiSecret;
    this.baseUrl = credentials.isTestnet ? BINANCE_TESTNET_URL : BINANCE_API_URL;
  }

  /**
   * Generate HMAC SHA256 signature for authenticated requests
   */
  private generateSignature(queryString: string): string {
    return crypto
      .createHmac('sha256', this.apiSecret)
      .update(queryString)
      .digest('hex');
  }

  /**
   * Make authenticated request to Binance API
   */
  private async makeRequest<T>(
    endpoint: string,
    method: 'GET' | 'POST' | 'DELETE' = 'GET',
    params: Record<string, string | number | boolean | undefined> = {},
    requiresAuth: boolean = false
  ): Promise<T> {
    const timestamp = Date.now();
    const queryParams: { [key: string]: string } = {
      timestamp: timestamp.toString(),
    };

    // Add params to query string
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        queryParams[key] = String(value);
      }
    });

    const queryString = new URLSearchParams(queryParams).toString();
    const signature = this.generateSignature(queryString);
    
    const url = `${this.baseUrl}${endpoint}?${queryString}&signature=${signature}`;

    const headers: { [key: string]: string } = {
      'X-MBX-APIKEY': this.apiKey,
      'Content-Type': 'application/json',
    };

    const options: RequestInit = {
      method,
      headers,
    };

    const response = await fetch(url, options);

    if (!response.ok) {
      const error = await response.json() as { msg?: string; message?: string };
      throw new Error(`Binance API error: ${error.msg || error.message || 'Unknown error'}`);
    }

    return response.json() as Promise<T>;
  }

  /**
   * Test API key validity
   */
  async validateApiKey(): Promise<{ valid: boolean; error?: string }> {
    try {
      await this.makeRequest<BinanceAccount>('/api/v3/account', 'GET', {}, true);
      return { valid: true };
    } catch (error) {
      return { 
        valid: false, 
        error: error instanceof Error ? error.message : 'Invalid API key' 
      };
    }
  }

  /**
   * Get account information including balances
   */
  async getAccount(): Promise<BinanceAccount> {
    return this.makeRequest<BinanceAccount>('/api/v3/account', 'GET', {}, true);
  }

  /**
   * Get current price for a symbol
   */
  async getPrice(symbol: string): Promise<number> {
    const response = await fetch(`${this.baseUrl}/api/v3/ticker/price?symbol=${symbol}`);
    const data: BinanceTicker = await response.json();
    return parseFloat(data.price);
  }

  /**
   * Place a new order
   */
  async placeOrder(order: BinanceOrder): Promise<BinanceOrderResponse> {
    const params: Record<string, string | number | undefined> = {
      symbol: order.symbol,
      side: order.side,
      type: order.type,
    };

    if (order.quantity) {
      params.quantity = order.quantity.toString();
    }

    if (order.quoteOrderQty) {
      params.quoteOrderQty = order.quoteOrderQty.toString();
    }

    if (order.price) {
      params.price = order.price.toString();
    }

    if (order.stopPrice) {
      params.stopPrice = order.stopPrice.toString();
    }

    if (order.timeInForce) {
      params.timeInForce = order.timeInForce;
    }

    return this.makeRequest<BinanceOrderResponse>('/api/v3/order', 'POST', params, true);
  }

  /**
   * Place a market buy order (simplest for beginners)
   */
  async marketBuy(symbol: string, quoteOrderQty: number): Promise<BinanceOrderResponse> {
    return this.placeOrder({
      symbol,
      side: 'BUY',
      type: 'MARKET',
      quoteOrderQty,
    });
  }

  /**
   * Place a market sell order
   */
  async marketSell(symbol: string, quantity: number): Promise<BinanceOrderResponse> {
    return this.placeOrder({
      symbol,
      side: 'SELL',
      type: 'MARKET',
      quantity,
    });
  }

  /**
   * Get order status
   */
  async getOrderStatus(symbol: string, orderId: number): Promise<BinanceOrderStatus> {
    return this.makeRequest<BinanceOrderStatus>('/api/v3/order', 'GET', { symbol, orderId }, true);
  }

  /**
   * Cancel an order
   */
  async cancelOrder(symbol: string, orderId: number): Promise<BinanceCancelOrderResponse> {
    return this.makeRequest<BinanceCancelOrderResponse>('/api/v3/order', 'DELETE', { symbol, orderId }, true);
  }

  /**
   * Get all open orders
   */
  async getOpenOrders(symbol?: string): Promise<BinanceOrderStatus[]> {
    const params: { [key: string]: string } = {};
    if (symbol) {
      params.symbol = symbol;
    }
    return this.makeRequest<BinanceOrderStatus[]>('/api/v3/openOrders', 'GET', params, true);
  }

  /**
   * Get recent trades
   */
  async getMyTrades(symbol: string, limit: number = 500): Promise<BinanceTrade[]> {
    return this.makeRequest<BinanceTrade[]>('/api/v3/myTrades', 'GET', { symbol, limit }, true);
  }

  /**
   * Calculate USD value of an asset
   */
  async getAssetValueUSD(asset: string, amount: number): Promise<number> {
    if (asset === 'USDT' || asset === 'BUSD' || asset === 'USD') {
      return amount;
    }

    try {
      // Try USDT pair first
      const price = await this.getPrice(`${asset}USDT`);
      return amount * price;
    } catch {
      try {
        // Try BTC pair and convert
        const btcPrice = await this.getPrice(`${asset}BTC`);
        const btcUsdPrice = await this.getPrice('BTCUSDT');
        return amount * btcPrice * btcUsdPrice;
      } catch {
        return 0;
      }
    }
  }
}

/**
 * Helper to extract trade details from Binance order response
 */
export function extractTradeDetails(orderResponse: BinanceOrderResponse): {
  totalQty: number;
  avgPrice: number;
  totalCommission: number;
  commissionAsset: string;
} {
  if (!orderResponse.fills || orderResponse.fills.length === 0) {
    return {
      totalQty: parseFloat(orderResponse.executedQty),
      avgPrice: parseFloat(orderResponse.price) || 0,
      totalCommission: 0,
      commissionAsset: '',
    };
  }

  let totalQty = 0;
  let totalValue = 0;
  let totalCommission = 0;
  const commissionAsset = orderResponse.fills[0]?.commissionAsset || '';

  for (const fill of orderResponse.fills) {
    const qty = parseFloat(fill.qty);
    const price = parseFloat(fill.price);
    totalQty += qty;
    totalValue += qty * price;
    totalCommission += parseFloat(fill.commission);
  }

  return {
    totalQty,
    avgPrice: totalValue / totalQty,
    totalCommission,
    commissionAsset,
  };
}
