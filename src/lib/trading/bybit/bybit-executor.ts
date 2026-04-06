/**
 * Bybit Executor – Realistic Execution med fees og slippage
 * 
 * Implements:
 * - Bybit V5 API integration
 * - 0.055% taker fee (futures)
 * - 1bps slippage på limit orders
 * - Queue time simulasjon
 * 
 * @module trading/bybit/bybit-executor
 * @version 3.0.0
 */

import crypto from 'crypto';

// Bybit API Configuration
const BYBIT_API_BASE = 'https://api.bybit.com';
const BYBIT_TESTNET_BASE = 'https://api-testnet.bybit.com';

export interface BybitConfig {
  apiKey: string;
  apiSecret: string;
  testnet?: boolean;
  recvWindow?: number;
}

export interface BybitFeeStructure {
  spotMaker: number;      // 0.001 = 0.1%
  spotTaker: number;      // 0.001 = 0.1%
  futuresMaker: number;   // 0.0002 = 0.02%
  futuresTaker: number;   // 0.00055 = 0.055%
  optionsMaker: number;   // 0.0003 = 0.03%
  optionsTaker: number;   // 0.0003 = 0.03%
}

// Standard Bybit fee structure (VIP 0)
export const DEFAULT_BYBIT_FEES: BybitFeeStructure = {
  spotMaker: 0.001,
  spotTaker: 0.001,
  futuresMaker: 0.0002,
  futuresTaker: 0.00055,
  optionsMaker: 0.0003,
  optionsTaker: 0.0003
};

export interface SlippageModel {
  baseSlippageBps: number;        // Base slippage in basis points (1 bps = 0.01%)
  volatilityFactor: number;       // Multiplier for volatility
  depthFactor: number;            // Multiplier for order book depth
  timeFactor: number;             // Multiplier for time-of-day
}

export const DEFAULT_SLIPPAGE_MODEL: SlippageModel = {
  baseSlippageBps: 1,             // 1 bps base
  volatilityFactor: 0.5,          // 0.5x per ATR unit
  depthFactor: 0.001,             // 0.1% per unit of size/depth ratio
  timeFactor: 0.2                 // Additional 20% during low liquidity hours
};

export interface OrderRequest {
  symbol: string;
  side: 'Buy' | 'Sell';
  orderType: 'Market' | 'Limit';
  qty: string;
  price?: string;
  timeInForce?: 'GTC' | 'IOC' | 'FOK';
  reduceOnly?: boolean;
  closeOnTrigger?: boolean;
  orderLinkId?: string;
}

export interface OrderResponse {
  orderId: string;
  orderLinkId: string;
  symbol: string;
  side: 'Buy' | 'Sell';
  orderType: 'Market' | 'Limit';
  price: string;
  qty: string;
  executedQty: string;
  status: 'Created' | 'New' | 'PartiallyFilled' | 'Filled' | 'Cancelled' | 'Rejected';
  avgPrice: string;
  cumExecFee: string;
  createdTime: string;
  updatedTime: string;
}

export interface Position {
  symbol: string;
  side: 'Buy' | 'Sell' | 'None';
  size: string;
  entryPrice: string;
  leverage: string;
  markPrice: string;
  unrealisedPnl: string;
  cumRealisedPnl: string;
}

export interface ExecutionResult {
  success: boolean;
  order?: OrderResponse;
  error?: string;
  executedPrice: number;
  executedQty: number;
  fee: number;
  feeAsset: string;
  slippageBps: number;
  latencyMs: number;
  queuePosition?: number;
  estimatedFillTime?: number;
}

export interface MarketDepth {
  symbol: string;
  bids: [string, string][]; // [price, qty]
  asks: [string, string][];
  timestamp: number;
}

/**
 * Bybit Executor med realistic execution model
 */
export class BybitExecutor {
  private config: BybitConfig;
  private fees: BybitFeeStructure;
  private slippageModel: SlippageModel;
  private baseUrl: string;
  
  constructor(
    config: BybitConfig,
    fees: BybitFeeStructure = DEFAULT_BYBIT_FEES,
    slippageModel: SlippageModel = DEFAULT_SLIPPAGE_MODEL
  ) {
    this.config = {
      recvWindow: 5000,
      ...config
    };
    this.fees = fees;
    this.slippageModel = slippageModel;
    this.baseUrl = config.testnet ? BYBIT_TESTNET_BASE : BYBIT_API_BASE;
  }
  
  /**
   * Generate Bybit API signature
   */
  private generateSignature(timestamp: string, payload: string): string {
    const data = timestamp + this.config.apiKey + this.config.recvWindow + payload;
    return crypto
      .createHmac('sha256', this.config.apiSecret)
      .update(data)
      .digest('hex');
  }
  
  /**
   * Make authenticated API request
   */
  private async request<T>(
    method: 'GET' | 'POST',
    endpoint: string,
    params?: Record<string, string | number | boolean | undefined>
  ): Promise<T> {
    const timestamp = Date.now().toString();
    const queryString = params 
      ? Object.entries(params)
          .filter(([, v]) => v !== undefined)
          .map(([k, v]) => `${k}=${encodeURIComponent(String(v))}`)
          .join('&')
      : '';
    
    const payload = method === 'GET' ? queryString : JSON.stringify(params || {});
    const signature = this.generateSignature(timestamp, payload);
    
    const headers: Record<string, string> = {
      'X-BAPI-API-KEY': this.config.apiKey,
      'X-BAPI-TIMESTAMP': timestamp,
      'X-BAPI-SIGN': signature,
      'X-BAPI-RECV-WINDOW': String(this.config.recvWindow)
    };
    
    if (method === 'POST') {
      headers['Content-Type'] = 'application/json';
    }
    
    const url = method === 'GET' && queryString
      ? `${this.baseUrl}${endpoint}?${queryString}`
      : `${this.baseUrl}${endpoint}`;
    
    const response = await fetch(url, {
      method,
      headers,
      body: method === 'POST' ? payload : undefined
    });
    
    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Bybit API error: ${response.status} - ${error}`);
    }
    
    const data = await response.json() as { retCode: number; retMsg: string; result: T };
    
    if (data.retCode !== 0) {
      throw new Error(`Bybit API error: ${data.retMsg}`);
    }
    
    return data.result;
  }
  
  /**
   * Get order book depth
   */
  async getOrderBook(symbol: string, limit: number = 50): Promise<MarketDepth> {
    const result = await this.request<{
      s: string;
      b: [string, string][];
      a: [string, string][];
      ts: number;
    }>('GET', '/v5/market/orderbook', { symbol, category: 'linear', limit });
    
    return {
      symbol: result.s,
      bids: result.b,
      asks: result.a,
      timestamp: result.ts
    };
  }
  
  /**
   * Calculate slippage based on order size and market conditions
   */
  calculateSlippage(
    side: 'Buy' | 'Sell',
    qty: number,
    orderBook: MarketDepth,
    volatility: number // ATR as % of price
  ): { slippageBps: number; expectedPrice: number } {
    const bookSide = side === 'Buy' ? orderBook.asks : orderBook.bids;
    const bestPrice = parseFloat(bookSide[0][0]);
    
    // Calculate order book depth at different levels
    let cumulativeQty = 0;
    let weightedPrice = 0;
    let depthConsumed = 0;
    
    for (const [price, qtyStr] of bookSide) {
      const levelQty = parseFloat(qtyStr);
      const levelPrice = parseFloat(price);
      
      if (cumulativeQty + levelQty >= qty) {
        const remainingQty = qty - cumulativeQty;
        weightedPrice += levelPrice * remainingQty;
        cumulativeQty += remainingQty;
        depthConsumed++;
        break;
      } else {
        weightedPrice += levelPrice * levelQty;
        cumulativeQty += levelQty;
        depthConsumed++;
      }
    }
    
    const avgExecutionPrice = weightedPrice / qty;
    const baseSlippage = Math.abs(avgExecutionPrice - bestPrice) / bestPrice * 10000; // Convert to bps
    
    // Add volatility adjustment
    const volatilitySlippage = volatility * this.slippageModel.volatilityFactor * 100; // Convert to bps
    
    // Add depth adjustment
    const depthRatio = qty / cumulativeQty;
    const depthSlippage = depthRatio * this.slippageModel.depthFactor * 10000;
    
    // Add time-of-day adjustment (lower liquidity = higher slippage)
    const hour = new Date().getUTCHours();
    const isLowLiquidity = hour < 6 || hour > 22; // Outside major market hours
    const timeSlippage = isLowLiquidity ? this.slippageModel.timeFactor * baseSlippage : 0;
    
    const totalSlippageBps = this.slippageModel.baseSlippageBps + baseSlippage + volatilitySlippage + depthSlippage + timeSlippage;
    
    return {
      slippageBps: totalSlippageBps,
      expectedPrice: avgExecutionPrice
    };
  }
  
  /**
   * Estimate queue position and fill time for limit orders
   */
  estimateLimitOrderFill(
    side: 'Buy' | 'Sell',
    price: number,
    qty: number,
    orderBook: MarketDepth
  ): { queuePosition: number; estimatedFillTime: number } {
    const bookSide = side === 'Buy' ? orderBook.bids : orderBook.asks;
    
    // Count orders ahead in queue at same price level
    let queuePosition = 0;
    let foundPriceLevel = false;
    
    for (const [levelPrice, levelQty] of bookSide) {
      const levelPriceNum = parseFloat(levelPrice);
      const levelQtyNum = parseFloat(levelQty);
      
      // For buy orders, we're ahead of prices higher than ours
      // For sell orders, we're ahead of prices lower than ours
      if (side === 'Buy' && levelPriceNum > price) {
        queuePosition += levelQtyNum;
      } else if (side === 'Sell' && levelPriceNum < price) {
        queuePosition += levelQtyNum;
      } else if (Math.abs(levelPriceNum - price) < 0.0001) {
        foundPriceLevel = true;
        // Add half of this level's volume as rough estimate of queue position
        queuePosition += levelQtyNum * 0.5;
        break;
      }
    }
    
    if (!foundPriceLevel) {
      // Our price is better than current book, we'd be first in queue
      queuePosition = 0;
    }
    
    // Estimate fill time based on queue position and typical volume
    // Assuming 10% of queue clears per minute on average
    const avgClearRate = 0.1;
    const estimatedFillTime = queuePosition > 0 
      ? Math.log(queuePosition / qty + 1) / avgClearRate * 60 // seconds
      : 0;
    
    return { queuePosition, estimatedFillTime };
  }
  
  /**
   * Calculate trading fee
   */
  calculateFee(
    executedQty: number,
    executedPrice: number,
    orderType: 'Market' | 'Limit',
    category: 'spot' | 'futures' | 'options' = 'futures'
  ): { fee: number; feeAsset: string } {
    const notional = executedQty * executedPrice;
    
    let feeRate: number;
    switch (category) {
      case 'spot':
        feeRate = orderType === 'Market' ? this.fees.spotTaker : this.fees.spotMaker;
        break;
      case 'futures':
        feeRate = orderType === 'Market' ? this.fees.futuresTaker : this.fees.futuresMaker;
        break;
      case 'options':
        feeRate = orderType === 'Market' ? this.fees.optionsTaker : this.fees.optionsMaker;
        break;
    }
    
    return {
      fee: notional * feeRate,
      feeAsset: 'USDT' // Assuming USDT-settled
    };
  }
  
  /**
   * Place order med realistic execution simulation
   */
  async placeOrder(request: OrderRequest): Promise<ExecutionResult> {
    const startTime = Date.now();
    
    try {
      // Get current market depth for slippage calculation
      const orderBook = await this.getOrderBook(request.symbol);
      const qty = parseFloat(request.qty);
      
      // Simulate volatility (in production, fetch from market data)
      const volatility = 0.02; // 2% ATR
      
      let executedPrice: number;
      let slippageBps = 0;
      let queuePosition: number | undefined;
      let estimatedFillTime: number | undefined;
      
      if (request.orderType === 'Market') {
        // Market orders execute immediately with slippage
        const slippage = this.calculateSlippage(request.side, qty, orderBook, volatility);
        executedPrice = slippage.expectedPrice;
        slippageBps = slippage.slippageBps;
      } else {
        // Limit orders
        const limitPrice = parseFloat(request.price || '0');
        executedPrice = limitPrice;
        
        // Calculate queue position
        const queue = this.estimateLimitOrderFill(request.side, limitPrice, qty, orderBook);
        queuePosition = queue.queuePosition;
        estimatedFillTime = queue.estimatedFillTime;
        
        // Small slippage for limit orders due to partial fills and price improvements
        slippageBps = this.slippageModel.baseSlippageBps * 0.5;
      }
      
      // Place actual order
      const result = await this.request<{
        orderId: string;
        orderLinkId: string;
      }>('POST', '/v5/order/create', {
        category: 'linear',
        symbol: request.symbol,
        side: request.side,
        orderType: request.orderType,
        qty: request.qty,
        price: request.price,
        timeInForce: request.timeInForce || 'GTC',
        reduceOnly: request.reduceOnly,
        closeOnTrigger: request.closeOnTrigger,
        orderLinkId: request.orderLinkId || `klarpakke_${Date.now()}`
      });
      
      // Get order details
      const orderDetails = await this.getOrder(result.orderId, request.symbol);
      
      // Calculate fees
      const fee = this.calculateFee(
        parseFloat(orderDetails.executedQty),
        parseFloat(orderDetails.avgPrice),
        request.orderType,
        'futures'
      );
      
      const latencyMs = Date.now() - startTime;
      
      return {
        success: true,
        order: orderDetails,
        executedPrice: parseFloat(orderDetails.avgPrice) || executedPrice,
        executedQty: parseFloat(orderDetails.executedQty),
        fee: fee.fee,
        feeAsset: fee.feeAsset,
        slippageBps,
        latencyMs,
        queuePosition,
        estimatedFillTime
      };
      
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        executedPrice: 0,
        executedQty: 0,
        fee: 0,
        feeAsset: 'USDT',
        slippageBps: 0,
        latencyMs: Date.now() - startTime
      };
    }
  }
  
  /**
   * Get order details
   */
  async getOrder(orderId: string, symbol: string): Promise<OrderResponse> {
    const result = await this.request<{
      list: Array<{
        orderId: string;
        orderLinkId: string;
        symbol: string;
        side: string;
        orderType: string;
        price: string;
        qty: string;
        cumExecQty: string;
        orderStatus: string;
        avgPrice: string;
        cumExecFee: string;
        createdTime: string;
        updatedTime: string;
      }>;
    }>('GET', '/v5/order/realtime', {
      category: 'linear',
      symbol,
      orderId
    });
    
    const order = result.list[0];
    if (!order) {
      throw new Error(`Order ${orderId} not found`);
    }
    
    return {
      orderId: order.orderId,
      orderLinkId: order.orderLinkId,
      symbol: order.symbol,
      side: order.side as 'Buy' | 'Sell',
      orderType: order.orderType as 'Market' | 'Limit',
      price: order.price,
      qty: order.qty,
      executedQty: order.cumExecQty,
      status: order.orderStatus as OrderResponse['status'],
      avgPrice: order.avgPrice,
      cumExecFee: order.cumExecFee,
      createdTime: order.createdTime,
      updatedTime: order.updatedTime
    };
  }
  
  /**
   * Get open positions
   */
  async getPositions(symbol?: string): Promise<Position[]> {
    const params: Record<string, string> = { category: 'linear' };
    if (symbol) params.symbol = symbol;
    
    const result = await this.request<{
      list: Array<{
        symbol: string;
        side: string;
        size: string;
        avgPrice: string;
        leverage: string;
        markPrice: string;
        unrealisedPnl: string;
        cumRealisedPnl: string;
      }>;
    }>('GET', '/v5/position/list', params);
    
    return result.list.map(pos => ({
      symbol: pos.symbol,
      side: pos.side === 'Buy' ? 'Buy' : pos.side === 'Sell' ? 'Sell' : 'None',
      size: pos.size,
      entryPrice: pos.avgPrice,
      leverage: pos.leverage,
      markPrice: pos.markPrice,
      unrealisedPnl: pos.unrealisedPnl,
      cumRealisedPnl: pos.cumRealisedPnl
    }));
  }
  
  /**
   * Cancel order
   */
  async cancelOrder(orderId: string, symbol: string): Promise<void> {
    await this.request('POST', '/v5/order/cancel', {
      category: 'linear',
      symbol,
      orderId
    });
  }
  
  /**
   * Get account balance
   */
  async getBalance(): Promise<{ asset: string; walletBalance: number; availableBalance: number }[]> {
    const result = await this.request<{
      list: Array<{
        coin: Array<{
          coin: string;
          walletBalance: string;
          availableToWithdraw: string;
        }>;
      }>;
    }>('GET', '/v5/account/wallet-balance', { accountType: 'UNIFIED' });
    
    return result.list[0]?.coin.map(c => ({
      asset: c.coin,
      walletBalance: parseFloat(c.walletBalance),
      availableBalance: parseFloat(c.availableToWithdraw)
    })) || [];
  }
}

/**
 * Paper trading executor med Bybit fee model
 */
export class BybitPaperExecutor {
  private fees: BybitFeeStructure;
  private slippageModel: SlippageModel;
  private balance: number;
  private positions: Map<string, Position> = new Map();
  private orders: Map<string, OrderResponse> = new Map();
  private orderCounter = 0;
  
  constructor(
    initialBalance: number = 10000,
    fees: BybitFeeStructure = DEFAULT_BYBIT_FEES,
    slippageModel: SlippageModel = DEFAULT_SLIPPAGE_MODEL
  ) {
    this.balance = initialBalance;
    this.fees = fees;
    this.slippageModel = slippageModel;
  }
  
  /**
   * Simulate order execution
   */
  async simulateOrder(request: OrderRequest, currentPrice: number): Promise<ExecutionResult> {
    const startTime = Date.now();
    const qty = parseFloat(request.qty);
    const orderId = `paper_${++this.orderCounter}`;
    
    // Calculate execution price with slippage
    let executedPrice = currentPrice;
    let slippageBps = 0;
    
    if (request.orderType === 'Market') {
      // Add slippage for market orders
      const direction = request.side === 'Buy' ? 1 : -1;
      slippageBps = this.slippageModel.baseSlippageBps * (1 + Math.random() * 2);
      const slippageFactor = 1 + (direction * slippageBps / 10000);
      executedPrice = currentPrice * slippageFactor;
    } else {
      // Limit order - only fill if price is favorable
      const limitPrice = parseFloat(request.price || '0');
      if (request.side === 'Buy' && limitPrice < currentPrice) {
        return {
          success: false,
          error: 'Limit price below market price',
          executedPrice: 0,
          executedQty: 0,
          fee: 0,
          feeAsset: 'USDT',
          slippageBps: 0,
          latencyMs: Date.now() - startTime
        };
      }
      if (request.side === 'Sell' && limitPrice > currentPrice) {
        return {
          success: false,
          error: 'Limit price above market price',
          executedPrice: 0,
          executedQty: 0,
          fee: 0,
          feeAsset: 'USDT',
          slippageBps: 0,
          latencyMs: Date.now() - startTime
        };
      }
      executedPrice = limitPrice;
      slippageBps = this.slippageModel.baseSlippageBps * 0.3;
    }
    
    // Calculate fee
    const notional = qty * executedPrice;
    const feeRate = request.orderType === 'Market' ? this.fees.futuresTaker : this.fees.futuresMaker;
    const fee = notional * feeRate;
    
    // Update balance
    const totalCost = notional + fee;
    if (this.balance < totalCost && request.side === 'Buy') {
      return {
        success: false,
        error: 'Insufficient balance',
        executedPrice: 0,
        executedQty: 0,
        fee: 0,
        feeAsset: 'USDT',
        slippageBps: 0,
        latencyMs: Date.now() - startTime
      };
    }
    
    if (request.side === 'Buy') {
      this.balance -= totalCost;
    } else {
      this.balance += notional - fee;
    }
    
    // Create order record
    const order: OrderResponse = {
      orderId,
      orderLinkId: request.orderLinkId || `paper_${Date.now()}`,
      symbol: request.symbol,
      side: request.side,
      orderType: request.orderType,
      price: request.price || executedPrice.toFixed(2),
      qty: request.qty,
      executedQty: request.qty,
      status: 'Filled',
      avgPrice: executedPrice.toFixed(2),
      cumExecFee: fee.toFixed(4),
      createdTime: Date.now().toString(),
      updatedTime: Date.now().toString()
    };
    
    this.orders.set(orderId, order);
    
    return {
      success: true,
      order,
      executedPrice,
      executedQty: qty,
      fee,
      feeAsset: 'USDT',
      slippageBps,
      latencyMs: Date.now() - startTime
    };
  }
  
  getBalance(): number {
    return this.balance;
  }
  
  getPositions(): Position[] {
    return Array.from(this.positions.values());
  }
  
  reset(initialBalance: number = 10000): void {
    this.balance = initialBalance;
    this.positions.clear();
    this.orders.clear();
    this.orderCounter = 0;
  }
}

/**
 * Fee comparison utilities
 */
export const FeeComparison = {
  /**
   * Compare total cost across exchanges
   */
  compareExchanges(tradeValue: number): {
    bybit: { maker: number; taker: number };
    binance: { maker: number; taker: number };
    coinbase: { maker: number; taker: number };
    kraken: { maker: number; taker: number };
  } {
    return {
      bybit: {
        maker: tradeValue * DEFAULT_BYBIT_FEES.futuresMaker,
        taker: tradeValue * DEFAULT_BYBIT_FEES.futuresTaker
      },
      binance: {
        maker: tradeValue * 0.0002,
        taker: tradeValue * 0.0005
      },
      coinbase: {
        maker: tradeValue * 0.004,
        taker: tradeValue * 0.006
      },
      kraken: {
        maker: tradeValue * 0.0002,
        taker: tradeValue * 0.0005
      }
    };
  },
  
  /**
   * Calculate break-even point for a trade
   */
  calculateBreakEven(entryPrice: number, qty: number, isMaker: boolean): number {
    const notional = entryPrice * qty;
    const feeRate = isMaker ? DEFAULT_BYBIT_FEES.futuresMaker : DEFAULT_BYBIT_FEES.futuresTaker;
    const entryFee = notional * feeRate;
    
    // Need to cover entry fee + exit fee
    const totalFees = entryFee * 2;
    const requiredProfit = totalFees;
    
    return entryPrice + (requiredProfit / qty);
  }
};
