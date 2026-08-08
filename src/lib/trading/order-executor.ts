/**
 * Unified Order Execution Interface
 *
 * This abstraction allows strategies to work identically in paper and live mode.
 * The strategy doesn't know if it's executing on Kraken or simulating - it just
 * calls executor.executeOrder() and gets back a result.
 *
 * Pattern: Strategy Pattern + Factory Pattern
 */

export interface OrderBookLevel {
  price: number;
  quantity: number;
}

export interface OrderBookSnapshot {
  bids: OrderBookLevel[];
  asks: OrderBookLevel[];
  timestamp: Date;
}

export interface OrderParams {
  symbol: string;                    // e.g., 'BTCUSDT'
  side: 'buy' | 'sell';
  quantity: number;                  // In base asset (e.g., BTC amount)
  orderType: 'market' | 'limit';
  price?: number;                    // Required for limit orders
  stopLoss?: number;                 // Optional stop loss price
  takeProfit?: number;               // Optional take profit price
}

export interface OrderResult {
  success: boolean;
  orderId: string;                   // Unique order ID (Kraken txid or synthetic)
  executedPrice: number;             // Actual execution price
  executedQuantity: number;          // Actual quantity filled
  fee: number;                       // Trading fee in quote currency (USDT)
  timestamp: Date;
  error?: string;                    // Error message if failed
  slippagePct?: number;              // Slippage percentage (paper mode estimate)
}

export interface BalanceInfo {
  available: number;                 // Available capital in quote currency
  locked?: number;                   // Capital in open orders
  total?: number;                    // Total = available + locked
}

export interface Position {
  symbol: string;
  quantity: number;                  // Current position size
  entryPrice: number;                // Average entry price
  entryTime: Date;
  unrealizedPnL: number;             // Current P&L
  unrealizedPnLPct: number;
}

/**
 * OrderExecutor Interface
 *
 * Implemented by:
 * - PaperExecutor: Simulates orders using real market prices
 * - KrakenExecutor: Executes real orders on Kraken
 */
export interface OrderExecutor {
  /**
   * Execute a trade order
   */
  executeOrder(params: OrderParams): Promise<OrderResult>;

  /**
   * Get current account balance
   */
  getBalance(): Promise<BalanceInfo>;

  /**
   * Get current open position for a symbol
   */
  getPosition(symbol: string): Promise<Position | null>;

  /**
   * Validate API keys (only relevant for live trading)
   */
  validateApiKeys(): Promise<boolean>;

  /**
   * Get current market price for a symbol
   */
  getMarketPrice(symbol: string): Promise<number>;

  /**
   * Get current order book for a symbol
   */
  fetchOrderBook(symbol: string, limit?: number): Promise<OrderBookSnapshot>;

  /**
   * Query the status of an existing exchange order.
   * Optional until all executors implement it.
   */
  getOrderStatus?(symbol: string, orderId: string): Promise<{ status: string; filled: number } | null>;
}

import { createKrakenMarketDataProvider } from "./canonical/market-data";

const marketDataProvider = createKrakenMarketDataProvider();

/**
 * Helper: Fetch real-time market price from Kraken public API
 * Used by both paper and live executors
 *
 * @deprecated Bruk canonical/market-data provider direkte i ny kode.
 */
export async function fetchKrakenPrice(symbol: string): Promise<number> {
  try {
    return await marketDataProvider.getPrice(symbol);
  } catch (error) {
    throw new Error(
      `Failed to fetch price for ${symbol}: ${error instanceof Error ? error.message : "Unknown error"}`,
    );
  }
}

/**
 * Helper: Fetch depth (order book) from Kraken public API
 *
 * @deprecated Bruk canonical/market-data provider direkte i ny kode.
 */
export async function fetchKrakenDepth(
  symbol: string,
  limit: number = 20,
): Promise<OrderBookSnapshot> {
  try {
    return await marketDataProvider.getDepth(symbol, limit);
  } catch (error) {
    throw new Error(
      `Failed to fetch depth for ${symbol}: ${error instanceof Error ? error.message : "Unknown error"}`,
    );
  }
}

/**
 * Helper: Calculate trading fee
 * Kraken spot taker fee (juli 2026): 0.80% Tier 1 (matching fill-constants)
 */
export function calculateFee(quantity: number, price: number, feePct: number = 0.008): number {
  return quantity * price * feePct;
}
