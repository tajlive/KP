/**
 * Paper Trading Executor
 *
 * Simulates order execution using real market prices from Binance.
 * Provides realistic simulation including:
 * - Real-time market prices
 * - Trading fees (0.1%)
 * - Slippage estimation
 * - Balance management
 *
 * Uses trading_sessions table to track paper capital.
 */

import type { OpenPosition } from "@/lib/shared";
import { createClient } from "@/lib/supabase/server";
import type {
  BalanceInfo,
  OrderExecutor,
  OrderParams,
  OrderResult,
  Position,
} from "./order-executor";
import { calculateFee, fetchBinancePrice } from "./order-executor";

export class PaperExecutor implements OrderExecutor {
  constructor(
    private userId: string,
    private sessionId?: string, // Optional: if not provided, finds active session
  ) {}

  /**
   * Execute a paper trade order
   */
  async executeOrder(params: OrderParams): Promise<OrderResult> {
    try {
      // 1. Fetch current market price
      const currentPrice = await fetchBinancePrice(params.symbol);

      // 2. Calculate execution details
      const executedPrice =
        params.orderType === "limit" && params.price
          ? params.price
          : currentPrice;

      const executedQuantity = params.quantity;
      const fee = calculateFee(executedQuantity, executedPrice);

      // 3. Simulate slippage (0.05% for market orders)
      const slippagePct = params.orderType === "market" ? 0.05 : 0;

      // 4. Generate synthetic order ID
      const orderId = `paper-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;

      return {
        success: true,
        orderId,
        executedPrice,
        executedQuantity,
        fee,
        timestamp: new Date(),
        slippagePct,
      };
    } catch (error) {
      console.error("Paper execution error:", error);
      return {
        success: false,
        orderId: "",
        executedPrice: 0,
        executedQuantity: 0,
        fee: 0,
        timestamp: new Date(),
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }

  /**
   * Get current paper trading balance
   */
  async getBalance(): Promise<BalanceInfo> {
    const supabase = await createClient();

    // Find active paper session
    let sessionId = this.sessionId;
    if (!sessionId) {
      const { data: session } = await supabase
        .from("trading_sessions")
        .select("id, current_capital_nok")
        .eq("user_id", this.userId)
        .eq("mode", "paper")
        .eq("status", "active")
        .order("started_at", { ascending: false })
        .limit(1)
        .single();

      if (!session) {
        return { available: 0, locked: 0, total: 0 };
      }

      sessionId = session.id;
    }

    // Fetch session capital
    const { data: session } = await supabase
      .from("trading_sessions")
      .select("current_capital_nok, open_position")
      .eq("id", sessionId)
      .single();

    if (!session) {
      return { available: 0, locked: 0, total: 0 };
    }

    // Calculate locked capital (in open position)
    const position = session.open_position as OpenPosition | null;
    const locked = position ? position.quantity * position.entry_price : 0;

    return {
      available: session.current_capital_nok,
      locked,
      total: session.current_capital_nok + locked,
    };
  }

  /**
   * Get current open position
   */
  async getPosition(symbol: string): Promise<Position | null> {
    const supabase = await createClient();

    // Find active paper session
    let sessionId = this.sessionId;
    if (!sessionId) {
      const { data: session } = await supabase
        .from("trading_sessions")
        .select("id")
        .eq("user_id", this.userId)
        .eq("mode", "paper")
        .eq("status", "active")
        .single();

      if (!session) return null;
      sessionId = session.id;
    }

    // Fetch open position
    const { data: session } = await supabase
      .from("trading_sessions")
      .select("open_position, trading_pair")
      .eq("id", sessionId)
      .single();

    if (!session || !session.open_position || session.trading_pair !== symbol) {
      return null;
    }

    const position = session.open_position as OpenPosition;

    // Calculate unrealized P&L
    const currentPrice = await this.getMarketPrice(symbol);
    const entryValue = position.quantity * position.entry_price;
    const currentValue = position.quantity * currentPrice;
    const unrealizedPnL = currentValue - entryValue;
    const unrealizedPnLPct = (unrealizedPnL / entryValue) * 100;

    return {
      symbol,
      quantity: position.quantity,
      entryPrice: position.entry_price,
      entryTime: new Date(position.entry_time),
      unrealizedPnL,
      unrealizedPnLPct,
    };
  }

  /**
   * Validate API keys (not applicable for paper trading)
   */
  async validateApiKeys(): Promise<boolean> {
    // Paper trading doesn't need API keys
    return true;
  }

  /**
   * Get current market price
   */
  async getMarketPrice(symbol: string): Promise<number> {
    return fetchBinancePrice(symbol);
  }
}
