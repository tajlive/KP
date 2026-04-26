import { getSupabaseClient } from "./supabase/client";

const supabase = getSupabaseClient();
import type { Trade, PortfolioItem, Wallet, TradingStats } from "@/types";

// Trading fee (0.1% - matching Binance)
export const TRADING_FEE_PERCENT = 0.001;

/**
 * @deprecated Use session-based capital for live mode.
 * Only valid as a paper trading baseline. Will be removed in Q3 2026.
 */
export const STARTING_CAPITAL = 100000;

// ---------------------------------------------------------------------------
// P0 LIVE-MODE SAFETY TYPES
// ---------------------------------------------------------------------------

/** Trading mode — always pass explicitly, never assume. */
export type TradingMode = "paper" | "live";

/**
 * Canonical trade input for executeBuy / executeSell.
 * For live mode: sessionId is REQUIRED.
 */
export interface TradeInput {
  userId: string;
  /** Always pass explicitly — never inferred from context. */
  mode: TradingMode;
  /**
   * Required for live mode.
   * Maps to trading_sessions.id — ensures capital is scoped to the correct session.
   */
  sessionId?: string;
  symbol: string;
  side: "buy" | "sell";
  quantity: number;
  price: number;
}

// ---------------------------------------------------------------------------
// INTERNAL RPC TYPES
// ---------------------------------------------------------------------------

type ExecuteTradeRpcParams = {
  p_user_id: string;
  p_symbol: string;
  p_type: "buy" | "sell";
  p_quantity: number;
  p_price: number;
};

type TriggerPanicRpcParams = {
  p_user_id: string;
  p_reason: string;
};

type RpcError = { message: string } | null;
type RpcResult<T> = Promise<{ data: T | null; error: RpcError }>;
type ExecuteTradeRpc = (
  fn: "execute_trade",
  params: ExecuteTradeRpcParams,
) => RpcResult<{ success?: boolean; message?: string; trade_id?: string }>;
type TriggerPanicRpc = (
  fn: "trigger_panic_button",
  params: TriggerPanicRpcParams,
) => RpcResult<{
  success?: boolean;
  positions_closed?: number;
  total_value?: number;
}>;
type TradingStatsFromFn = (table: "trading_stats") => {
  select: (columns: "*") => {
    eq: (
      column: "user_id",
      value: string,
    ) => {
      single: () => Promise<{ data: TradingStats | null; error: RpcError }>;
    };
  };
};

// ---------------------------------------------------------------------------
// INPUT VALIDATION HELPERS
// ---------------------------------------------------------------------------

function validateTradeInput(
  input: TradeInput,
): { valid: true } | { valid: false; error: string } {
  if (!input.userId) return { valid: false, error: "userId is required" };
  if (input.mode !== "paper" && input.mode !== "live")
    return { valid: false, error: `Unknown trading mode: ${input.mode}` };
  if (input.mode === "live" && !input.sessionId)
    return { valid: false, error: "session_id required for live mode" };
  if (!input.price || input.price <= 0 || isNaN(input.price))
    return { valid: false, error: "price must be a positive number" };
  if (!input.quantity || input.quantity <= 0 || isNaN(input.quantity))
    return { valid: false, error: "quantity must be a positive number" };
  if (!input.symbol || input.symbol.length === 0)
    return { valid: false, error: "symbol is required" };
  return { valid: true };
}

// ---------------------------------------------------------------------------
// EXECUTE BUY
// ---------------------------------------------------------------------------

/**
 * Execute a buy trade.
 * Accepts TradeInput (preferred, mode-aware) or legacy positional params.
 *
 * @note For live mode: always pass sessionId. Capital source is
 * trading_sessions.current_capital_nok, NOT wallets.balance_usdt.
 * The wallets precheck below is a client-side guard only and is NOT atomic
 * with the RPC call. TODO: move to server-side atomic validation (P1).
 */
export const executeBuy = async (
  userIdOrInput: string | TradeInput,
  symbol?: string,
  quantity?: number,
  price?: number,
): Promise<{ success: boolean; trade?: Trade; error?: string }> => {
  // Normalise arguments
  const input: TradeInput =
    typeof userIdOrInput === "object"
      ? userIdOrInput
      : {
          userId: userIdOrInput,
          mode: "paper",
          symbol: symbol!,
          side: "buy",
          quantity: quantity!,
          price: price!,
        };

  // Input validation (P0 guard)
  const validation = validateTradeInput(input);
  if (!validation.valid) return { success: false, error: validation.error };

  try {
    const totalAmount = input.quantity * input.price;
    const fee = totalAmount * TRADING_FEE_PERCENT;
    const totalCost = totalAmount + fee;

    /**
     * @note PAPER MODE ONLY: wallet precheck.
     * For live mode this check is informational — actual capital enforcement
     * MUST happen server-side in the execute_trade RPC.
     * TODO(P1): remove client-side precheck; enforce atomically in RPC.
     */
    if (input.mode === "paper") {
      const { data: walletData, error: walletError } = await supabase
        .from("wallets")
        .select("*")
        .eq("user_id", input.userId)
        .single();

      if (walletError || !walletData) {
        return { success: false, error: "Wallet not found" };
      }

      const wallet = walletData as unknown as Wallet;
      if (wallet.balance_usdt < totalCost) {
        return { success: false, error: "Insufficient balance" };
      }
    }

    // Execute trade via RPC
    const { data: result, error: tradeError } = await (
      supabase as unknown as { rpc: ExecuteTradeRpc }
    ).rpc("execute_trade", {
      p_user_id: input.userId,
      p_symbol: input.symbol,
      p_type: "buy",
      p_quantity: input.quantity,
      p_price: input.price,
    });

    if (tradeError) {
      console.error("Trade execution error:", tradeError);
      return { success: false, error: tradeError.message };
    }

    const tradeResult = result as {
      success?: boolean;
      message?: string;
      trade_id?: string;
    } | null;

    if (!tradeResult?.success) {
      return { success: false, error: tradeResult?.message || "Trade failed" };
    }

    // Fetch the created trade
    const { data: trade, error: fetchError } = await supabase
      .from("trades")
      .select("*")
      .eq("id", tradeResult.trade_id as string)
      .single();

    if (fetchError || !trade) {
      return { success: false, error: "Failed to fetch trade" };
    }

    return { success: true, trade: trade as unknown as Trade };
  } catch (error) {
    console.error("Buy execution error:", error);
    return { success: false, error: "Unexpected error occurred" };
  }
};

// ---------------------------------------------------------------------------
// EXECUTE SELL
// ---------------------------------------------------------------------------

/**
 * Execute a sell trade.
 * Accepts TradeInput (preferred, mode-aware) or legacy positional params.
 *
 * @note For live mode: always pass sessionId.
 * TODO(P1): positions vs portfolios schema inconsistency.
 * executeSell validates against `positions` table, but getPortfolio reads
 * from `portfolios`. These must be reconciled to a single source of truth.
 */
export const executeSell = async (
  userIdOrInput: string | TradeInput,
  symbol?: string,
  quantity?: number,
  price?: number,
): Promise<{ success: boolean; trade?: Trade; error?: string }> => {
  // Normalise arguments
  const input: TradeInput =
    typeof userIdOrInput === "object"
      ? userIdOrInput
      : {
          userId: userIdOrInput,
          mode: "paper",
          symbol: symbol!,
          side: "sell",
          quantity: quantity!,
          price: price!,
        };

  // Input validation (P0 guard)
  const validation = validateTradeInput(input);
  if (!validation.valid) return { success: false, error: validation.error };

  try {
    /**
     * TODO(P1): `positions` table is used for sell validation, but
     * `portfolios` is used for display (getPortfolio). Consolidate to one
     * source of truth. Risk: sell may be rejected if live data is only
     * in `portfolios` and not reflected in `positions`.
     */
    const { data: portfolioData, error: portfolioError } = await supabase
      .from("positions")
      .select("*")
      .eq("user_id", input.userId)
      .eq("symbol", input.symbol)
      .single();

    if (portfolioError || !portfolioData) {
      return { success: false, error: "No position found for this symbol" };
    }

    const position = portfolioData as unknown as PortfolioItem;

    if (position.quantity < input.quantity) {
      return { success: false, error: "Insufficient quantity to sell" };
    }

    // Execute trade via RPC
    const { data: result, error: tradeError } = await (
      supabase as unknown as { rpc: ExecuteTradeRpc }
    ).rpc("execute_trade", {
      p_user_id: input.userId,
      p_symbol: input.symbol,
      p_type: "sell",
      p_quantity: input.quantity,
      p_price: input.price,
    });

    if (tradeError) {
      console.error("Trade execution error:", tradeError);
      return { success: false, error: tradeError.message };
    }

    const tradeResult = result as {
      success?: boolean;
      message?: string;
      trade_id?: string;
    } | null;

    if (!tradeResult?.success) {
      return { success: false, error: tradeResult?.message || "Trade failed" };
    }

    // Fetch the created trade
    const { data: trade, error: fetchError } = await supabase
      .from("trades")
      .select("*")
      .eq("id", tradeResult.trade_id as string)
      .single();

    if (fetchError || !trade) {
      return { success: false, error: "Failed to fetch trade" };
    }

    return { success: true, trade: trade as unknown as Trade };
  } catch (error) {
    console.error("Sell execution error:", error);
    return { success: false, error: "Unexpected error occurred" };
  }
};

// ---------------------------------------------------------------------------
// WALLET / PORTFOLIO / TRADES
// ---------------------------------------------------------------------------

/**
 * Get user's paper trading wallet.
 *
 * @note For live mode: this returns the paper wallet (wallets table).
 * Live capital MUST be fetched from trading_sessions.current_capital_nok.
 * Do NOT use this function as capital source for live order sizing.
 */
export const getWallet = async (userId: string): Promise<Wallet | null> => {
  const { data, error } = await supabase
    .from("wallets")
    .select("*")
    .eq("user_id", userId)
    .single();

  if (error) {
    console.error("Error fetching wallet:", error);
    return null;
  }

  return data as unknown as Wallet;
};

/**
 * Get user's portfolio.
 *
 * @param mode Optional — future live/paper filtering. Currently returns all.
 * TODO(P1): when mode='live', filter to live session positions only.
 * TODO(P1): reconcile portfolios vs positions table inconsistency.
 */
export const getPortfolio = async (
  userId: string,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  mode?: TradingMode,
): Promise<PortfolioItem[]> => {
  const { data, error } = await supabase
    .from("portfolios")
    .select("*")
    .eq("user_id", userId)
    .gt("quantity", 0)
    .order("current_value", { ascending: false });

  if (error) {
    console.error("Error fetching portfolio:", error);
    return [];
  }

  return (data || []) as unknown as PortfolioItem[];
};

/**
 * Get user's trades.
 *
 * @param mode Optional — future live/paper filtering. Currently returns all.
 * TODO(P1): filter by mode when mode param is passed (live vs paper trades).
 * TODO(P1): `trading_pair` column used here must match `p_symbol` from execute
 * RPC — verify mapping in DB to avoid silent trade history gaps.
 */
export const getTrades = async (
  userId: string,
  options: {
    limit?: number;
    offset?: number;
    symbol?: string;
    mode?: TradingMode;
  } = {},
): Promise<Trade[]> => {
  const { limit = 50, offset = 0, symbol } = options;

  let query = supabase
    .from("trades")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .range(offset, offset + limit - 1);

  if (symbol) {
    query = query.eq("trading_pair", symbol);
  }

  const { data, error } = await query;

  if (error) {
    console.error("Error fetching trades:", error);
    return [];
  }

  return (data || []) as unknown as Trade[];
};

/**
 * Get trading stats.
 */
export const getTradingStats = async (
  userId: string,
): Promise<TradingStats | null> => {
  const { data, error } = await (
    supabase as unknown as { from: TradingStatsFromFn }
  )
    .from("trading_stats")
    .select("*")
    .eq("user_id", userId)
    .single();

  if (error) {
    console.error("Error fetching trading stats:", error);
    return null;
  }

  return data;
};

// ---------------------------------------------------------------------------
// P&L CALCULATIONS
// ---------------------------------------------------------------------------

/** Calculate unrealized P&L for a position. */
export const calculateUnrealizedPnL = (
  quantity: number,
  avgBuyPrice: number,
  currentPrice: number,
): { pnl: number; pnlPercent: number } => {
  const costBasis = quantity * avgBuyPrice;
  const currentValue = quantity * currentPrice;
  const pnl = currentValue - costBasis;
  const pnlPercent = costBasis > 0 ? (pnl / costBasis) * 100 : 0;
  return { pnl, pnlPercent };
};

/** Calculate total portfolio value. */
export const calculatePortfolioValue = (portfolio: PortfolioItem[]): number => {
  return portfolio.reduce((total, item) => total + item.current_value, 0);
};

/**
 * Calculate total P&L.
 *
 * @param startingCapital The actual starting capital for the account or session.
 * For paper mode: STARTING_CAPITAL (100k NOK) is a valid default.
 * For live mode: pass trading_sessions.starting_capital_nok explicitly.
 * DO NOT use the deprecated STARTING_CAPITAL constant for live P&L%.
 */
export const calculateTotalPnL = (
  wallet: Wallet,
  portfolio: PortfolioItem[],
  stats: TradingStats | null,
  startingCapital?: number,
): {
  totalValue: number;
  unrealizedPnL: number;
  realizedPnL: number;
  totalPnL: number;
  totalPnLPercent: number;
} => {
  const portfolioValue = calculatePortfolioValue(portfolio);
  const totalValue = wallet.balance_usdt + portfolioValue;
  const unrealizedPnL = portfolio.reduce(
    (sum, item) => sum + item.unrealized_pnl,
    0,
  );
  const realizedPnL = stats?.total_pnl || 0;
  const totalPnL = unrealizedPnL + realizedPnL;
  // Use provided startingCapital; fall back to deprecated constant only for paper.
  const base = startingCapital ?? STARTING_CAPITAL;
  const totalPnLPercent = base > 0 ? (totalPnL / base) * 100 : 0;

  return { totalValue, unrealizedPnL, realizedPnL, totalPnL, totalPnLPercent };
};

// ---------------------------------------------------------------------------
// PANIC BUTTON
// ---------------------------------------------------------------------------

/**
 * Trigger panic button — close all positions.
 *
 * @param mode Pass mode explicitly so the RPC reason is scoped correctly.
 * @param sessionId Pass for live mode to scope the panic to a session.
 *
 * @note The actual scope of what gets closed depends entirely on
 * trigger_panic_button RPC implementation. Verify that the RPC respects
 * mode/session boundaries before enabling in production.
 * TODO(P0): audit trigger_panic_button RPC — ensure it scopes to session.
 */
export const triggerPanicButton = async (
  userId: string,
  reason?: string,
  mode: TradingMode = "paper",
  sessionId?: string,
): Promise<{
  success: boolean;
  positionsClosed: number;
  totalValue: number;
  error?: string;
}> => {
  try {
    const scopedReason = [
      `[mode=${mode}`,
      sessionId ? `,session=${sessionId}]` : "]",
      " ",
      reason || "User triggered panic",
    ].join("");

    const { data: result, error } = await (
      supabase as unknown as { rpc: TriggerPanicRpc }
    ).rpc("trigger_panic_button", {
      p_user_id: userId,
      p_reason: scopedReason,
    });

    if (error) {
      console.error("Panic button error:", error);
      return { success: false, positionsClosed: 0, totalValue: 0, error: error.message };
    }

    return {
      success: result?.success || false,
      positionsClosed: result?.positions_closed || 0,
      totalValue: result?.total_value || 0,
    };
  } catch (error) {
    console.error("Panic button error:", error);
    return { success: false, positionsClosed: 0, totalValue: 0, error: "Unexpected error occurred" };
  }
};

// ---------------------------------------------------------------------------
// FORMATTING UTILITIES
// ---------------------------------------------------------------------------

export const formatCurrency = (
  value: number,
  currency: string = "USDT",
): string => {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: currency === "USDT" ? "USD" : currency,
    minimumFractionDigits: value >= 1000 ? 0 : 2,
    maximumFractionDigits: value >= 1000 ? 0 : 2,
  }).format(value);
};

export const formatPercentage = (
  value: number,
  decimals: number = 2,
): string => {
  const sign = value >= 0 ? "+" : "";
  return `${sign}${value.toFixed(decimals)}%`;
};

export const getValueColor = (value: number): string => {
  if (value > 0) return "text-emerald-400";
  if (value < 0) return "text-red-400";
  return "text-gray-400";
};

export const getValueBgColor = (value: number): string => {
  if (value > 0) return "bg-emerald-500/10";
  if (value < 0) return "bg-red-500/10";
  return "bg-gray-500/10";
};

export const validateQuantity = (
  quantity: number,
  minQty: number = 0.0001,
  maxQty?: number,
): { valid: boolean; error?: string } => {
  if (quantity <= 0) return { valid: false, error: "Quantity must be greater than 0" };
  if (quantity < minQty) return { valid: false, error: `Minimum quantity is ${minQty}` };
  if (maxQty !== undefined && quantity > maxQty) return { valid: false, error: `Maximum quantity is ${maxQty}` };
  return { valid: true };
};

export const calculatePositionSize = (
  accountBalance: number,
  riskPercent: number,
  entryPrice: number,
  stopLossPrice: number,
): { quantity: number; positionValue: number; riskAmount: number } => {
  const riskAmount = accountBalance * (riskPercent / 100);
  const priceRisk = Math.abs(entryPrice - stopLossPrice);
  const quantity = priceRisk > 0 ? riskAmount / priceRisk : 0;
  const positionValue = quantity * entryPrice;
  return { quantity, positionValue, riskAmount };
};
