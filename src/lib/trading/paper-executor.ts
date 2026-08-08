/**
 * Paper Trading Executor
 *
 * Simulates order execution using real market prices from Kraken.
 * Provides realistic simulation including:
 * - Real-time market prices (Kraken — EU/EØS-sannhet, MiCA-regulert)
 * - Trading fees (0.8% — Kraken spot taker fee, Tier 1)
 * - Slippage estimation
 * - Balance management
 *
 * Uses trading_sessions table to track paper capital.
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import type { OpenPosition } from "@/lib/shared";
import type {
  BalanceInfo,
  OrderExecutor,
  OrderParams,
  OrderResult,
  Position,
  OrderBookSnapshot,
} from "./order-executor";
import { createKrakenMarketDataProvider } from "./canonical/market-data";
import { computeFill } from "./canonical/execution/fill-model";
import { FILL_CONSTANTS } from "./canonical/execution/fill-constants";
import { getUsdtToNokRateAsync, getUsdtToNokRate, usdtToNok } from "./currency";

const marketDataProvider = createKrakenMarketDataProvider();

/** Paper-adapter parametere – re-eksportert fra canonical FILL_CONSTANTS. */
export const PAPER_PARAMS = FILL_CONSTANTS;

export class PaperExecutor implements OrderExecutor {
  constructor(
    private supabase: SupabaseClient,
    private userId: string,
    private sessionId?: string, // Optional: if not provided, finds active session
  ) {}

  /**
   * Execute a paper trade order
   */
  async executeOrder(params: OrderParams): Promise<OrderResult> {
    try {
      // 1. Fetch current market price (kanonisk markedsdata)
      const currentPrice = await marketDataProvider.getPrice(params.symbol);

      // 2. Balance i USDT for fill-modellen (paper-kapital er NOK)
      const rate = await getUsdtToNokRateAsync(this.supabase);
      const balanceNok = await this.getBalance();
      const availableUsdt =
        rate > 0 ? balanceNok.available / rate : balanceNok.available;

      // 3. Beregn fill via kanonisk modell
      const fill = computeFill({
        side: params.side,
        quantity: params.quantity,
        orderType: params.orderType,
        limitPrice: params.price,
        marketPrice: currentPrice,
        feeRate: PAPER_PARAMS.feeRate,
        marketSlippageRate: PAPER_PARAMS.marketSlippageRate,
        minOrderValue: PAPER_PARAMS.minOrderValue,
        availableCapital: params.side.toLowerCase() === "buy" ? availableUsdt : undefined,
        quoteCurrency: "USDT",
      });

      if (!fill.success) {
        return {
          success: false,
          orderId: "",
          executedPrice: 0,
          executedQuantity: 0,
          fee: 0,
          timestamp: new Date(),
          error: fill.error,
        };
      }

      // 4. Generate synthetic order ID
      const orderId = `paper-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;

      return {
        success: true,
        orderId,
        executedPrice: fill.executedPrice,
        executedQuantity: fill.executedQuantity,
        fee: fill.fee,
        timestamp: new Date(),
        slippagePct: fill.slippagePct,
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
    const supabase = this.supabase;

    // Find active paper session
    let sessionId = this.sessionId;
    if (!sessionId) {
      const { data: session } = await supabase
        .from("trading_sessions")
        .select("id, current_capital_nok")
        .eq("user_id", this.userId)
        .eq("mode", "paper")
        .in("status", ["active", "paused"])
        .order("started_at", { ascending: false })
        .limit(1)
        .single();

      if (!session) {
        return { available: 0, locked: 0, total: 0 };
      }

      sessionId = session.id;
    }

    if (!sessionId) return { available: 0, locked: 0, total: 0 };

    // Fetch session capital
    const { data: session } = await supabase
      .from("trading_sessions")
      .select("current_capital_nok, open_position")
      .eq("id", sessionId)
      .single();

    if (!session) {
      return { available: 0, locked: 0, total: 0 };
    }

    // Calculate locked capital (position value in NOK)
    // FIKS (2026-07-30): paper open_position.entry_price er lagret i NOK
    // (DB-trigger kopierer trades.price=NOK). usdtToNok() her ga ~9,6×
    // dobbelkonvertering av låst kapital.
    const position = session.open_position as OpenPosition | null;
    const lockedNok = position ? position.quantity * position.entry_price : 0;

    const cap = session.current_capital_nok ?? 0;
    return {
      available: cap,
      locked: lockedNok,
      total: cap + lockedNok,
    };
  }

  /**
   * Get current open position
   */
  async getPosition(symbol: string): Promise<Position | null> {
    const supabase = this.supabase;

    // Find active paper session
    let sessionId = this.sessionId;
    if (!sessionId) {
      const { data: session } = await supabase
        .from("trading_sessions")
        .select("id")
        .eq("user_id", this.userId)
        .eq("mode", "paper")
        .in("status", ["active", "paused"])
        .order("started_at", { ascending: false })
        .limit(1)
        .single();

      if (!session) return null;
      sessionId = session.id;
    }

    if (!sessionId) return null;

    // Fetch open position
    const { data: session } = await supabase
      .from("trading_sessions")
      .select("open_position, trading_pair")
      .eq("id", sessionId)
      .single();

    if (!session || !session.open_position || session.trading_pair !== symbol) {
      return null;
    }

    const position = session.open_position as unknown as OpenPosition;

    // Calculate unrealized P&L
    // FIKS (2026-07-30): entry_price er NOK (paper), getMarketPrice er USDT —
    // konverter markedspris til NOK før sammenligning, ellers vises alle
    // posisjoner som ~90 % tap.
    const currentPriceUsdt = await this.getMarketPrice(symbol);
    const currentPriceNok = currentPriceUsdt * getUsdtToNokRate();
    const entryValue = position.quantity * position.entry_price;
    const currentValue = position.quantity * currentPriceNok;
    const unrealizedPnL = currentValue - entryValue;
    const unrealizedPnLPct = entryValue > 0 ? (unrealizedPnL / entryValue) * 100 : 0;

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
    return marketDataProvider.getPrice(symbol);
  }

  /**
   * Get current order book (depth)
   */
  async fetchOrderBook(symbol: string, limit: number = 20): Promise<OrderBookSnapshot> {
    return marketDataProvider.getDepth(symbol, limit);
  }
}
