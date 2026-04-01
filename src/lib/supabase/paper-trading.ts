import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/types/database.types'

type Supa = SupabaseClient<Database>

export interface PaperTradingSession {
  id: string;
  user_id: string;
  trading_pair: string;
  mode: 'paper' | 'live';
  strategy_id: string;
  status: 'active' | 'paused' | 'stopped';
  starting_capital_nok: number;
  current_capital_nok: number;
  started_at: string;
  stopped_at?: string;
  total_trades: number;
  winning_trades: number;
  losing_trades: number;
  pnl: number;
  created_at?: string;
}

export interface PaperTrade {
  session_id: string;
  symbol: string;
  side: "buy" | "sell";
  quantity: number;
  price: number;
  total_value: number;
}

export interface TradeHistoryItem {
  id: string;
  session_id: string;
  symbol: string;
  side: "buy" | "sell";
  quantity: number;
  price: number;
  total_value: number;
  created_at: string;
}

/**
 * Create a new paper trading session for a user
 */
export async function createPaperTradingSession(
  supabase: Supa,
  userId: string,
): Promise<PaperTradingSession> {
  const { data, error } = await supabase
    .from("trading_sessions")
    .insert({
      user_id: userId,
      trading_pair: 'BTCUSDT',
      mode: 'paper',
      strategy_id: 'manual',
      status: 'active',
      starting_capital_nok: 100000,
      current_capital_nok: 100000,
      started_at: new Date().toISOString(),
    })
    .select()
    .single();

  if (error) {
    console.error("Failed to create paper trading session:", error);
    throw new Error("Failed to create paper trading session");
  }

  return data as unknown as PaperTradingSession;
}

/**
 * Get user's active paper trading session
 */
export async function getPaperTradingSession(
  supabase: Supa,
  userId: string,
): Promise<PaperTradingSession | null> {
  const { data, error } = await supabase
    .from("trading_sessions")
    .select("*")
    .eq("user_id", userId)
    .eq("mode", 'paper')
    .eq("status", 'active')
    .single();

  if (error) {
    if (error.code === "PGRST116") {
      // No session found
      return null;
    }
    console.error("Failed to get paper trading session:", error);
    throw new Error("Failed to get paper trading session");
  }

  return data as unknown as PaperTradingSession;
}

/**
 * Execute a paper trade
 */
export async function executePaperTrade(
  supabase: Supa,
  userId: string,
  trade: Omit<PaperTrade, "session_id">,
): Promise<{ success: boolean; new_balance: number; trade_id: string }> {
  // Get current session
  const session = await getPaperTradingSession(supabase, userId);
  if (!session) {
    throw new Error("No active paper trading session found");
  }

  const totalValue = trade.quantity * trade.price;

  // Validate balance for buy orders
  if (trade.side === "buy" && session.current_capital_nok < totalValue) {
    throw new Error("Insufficient balance for this trade");
  }

  // Calculate new balance
  const newBalance =
    trade.side === "buy"
      ? session.current_capital_nok - totalValue
      : session.current_capital_nok + totalValue;

  // Execute trade and update balance in a transaction-like manner
  const { data: tradeData, error: tradeError } = await supabase
    .from("trades")
    .insert({
      session_id: session.id,
      user_id: userId,
      trading_pair: trade.symbol,
      side: trade.side,
      quantity: trade.quantity,
      price: trade.price,
      total_value: totalValue,
      fee: 0,
      status: 'executed',
      idempotency_key: `${Date.now()}-${Math.random()}`,
      executed_at: new Date().toISOString(),
      mode: 'paper',
    })
    .select()
    .single();

  if (tradeError) {
    console.error("Failed to execute trade:", tradeError);
    throw new Error("Failed to execute trade");
  }

  // Update session balance
  const { error: updateError } = await supabase
    .from("trading_sessions")
    .update({
      current_capital_nok: newBalance,
    })
    .eq("id", session.id);

  if (updateError) {
    console.error("Failed to update balance:", updateError);
    throw new Error("Failed to update balance");
  }

  return {
    success: true,
    new_balance: newBalance,
    trade_id: tradeData.id,
  };
}

/**
 * Get trade history for a session
 */
export async function getPaperTradeHistory(
  supabase: Supa,
  sessionId: string,
  limit: number = 50,
): Promise<TradeHistoryItem[]> {
  const { data, error } = await supabase
    .from("trades")
    .select("*")
    .eq("session_id", sessionId)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) {
    console.error("Failed to get trade history:", error);
    throw new Error("Failed to get trade history");
  }

  return (data ?? []) as unknown as TradeHistoryItem[];
}

/**
 * Reset paper trading session
 */
export async function resetPaperTradingSession(
  supabase: Supa,
  sessionId: string,
): Promise<void> {
  // Delete all trades for this session
  const { error: deleteError } = await supabase
    .from("trades")
    .delete()
    .eq("session_id", sessionId);

  if (deleteError) {
    console.error("Failed to delete trades:", deleteError);
    throw new Error("Failed to reset session");
  }

  // Reset balance
  const { error: updateError } = await supabase
    .from("trading_sessions")
    .update({
      current_capital_nok: 100000,
    })
    .eq("id", sessionId);

  if (updateError) {
    console.error("Failed to reset balance:", updateError);
    throw new Error("Failed to reset session");
  }
}

/**
 * Get or create paper trading session (auto-initialization)
 */
export async function getOrCreatePaperTradingSession(
  supabase: Supa,
  userId: string,
): Promise<PaperTradingSession> {
  const existing = await getPaperTradingSession(supabase, userId);
  if (existing) {
    return existing;
  }
  return createPaperTradingSession(supabase, userId);
}

/**
 * Calculate P&L for a session
 */
export function calculatePnL(session: PaperTradingSession): {
  absolute: number;
  percentage: number;
  isPositive: boolean;
} {
  const absolute = session.current_capital_nok - session.starting_capital_nok;
  const percentage = (absolute / session.starting_capital_nok) * 100;

  return {
    absolute,
    percentage,
    isPositive: absolute >= 0,
  };
}
