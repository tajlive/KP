/**
 * Unified Order Execution Interface
 *
 * This abstraction allows strategies to work identically in paper and live mode.
 * The strategy doesn't know if it's executing on Binance or simulating - it just
 * calls executor.executeOrder() and gets back a result.
 *
 * Pattern: Strategy Pattern + Factory Pattern
 */

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
  orderId: string;                   // Unique order ID (Binance ID or synthetic)
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
 * - BinanceExecutor: Executes real orders on Binance
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
}

/**
 * Helper: Fetch real-time market price from Binance public API
 * Used by both paper and live executors
 */
export async function fetchBinancePrice(symbol: string): Promise<number> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 5000);

  try {
    const response = await fetch(
      `https://api.binance.com/api/v3/ticker/price?symbol=${symbol}`,
      { signal: controller.signal }
    );

    clearTimeout(timeoutId);

    if (!response.ok) {
      throw new Error(`Binance API error: ${response.status}`);
    }

    const data = await response.json();
    return parseFloat(data.price);
  } catch (error) {
    clearTimeout(timeoutId);
    throw new Error(`Failed to fetch price for ${symbol}: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Helper: Calculate trading fee
 * Binance spot fee: 0.1% (with BNB discount: 0.075%)
 */
export function calculateFee(quantity: number, price: number, feePct: number = 0.001): number {
  return quantity * price * feePct;
}
