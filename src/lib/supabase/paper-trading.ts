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
  // Respect user's auto-trading config if enabled.
  // NOTE: user_auto_trading_configs.strategy_id is a risk PROFILE
  // (e.g. "offensive"), NOT a trading engine strategy.  We map it to
  // the default engine strategy "dca".  The real strategy choice
  // happens via BotWizard which POSTs to /api/auto-trading/paper.
  const strategyId = 'dca';
  let startingCapital = 100000;
  try {
    const { data: cfg } = await supabase
      .from("user_auto_trading_configs")
      .select("strategy_id, is_enabled, trading_capital_nok, risk_level")
      .eq("user_id", userId)
      .single();
    if (cfg?.is_enabled && cfg?.trading_capital_nok) {
      startingCapital = cfg.trading_capital_nok;
    }
  } catch {
    // ignore config fetch errors
  }

  const { data, error } = await supabase
    .from("trading_sessions")
    .insert({
      user_id: userId,
      trading_pair: 'BTCUSDT',
      mode: 'paper',
      strategy_id: strategyId,
      status: 'active',
      starting_capital_nok: startingCapital,
      current_capital_nok: startingCapital,
      started_at: new Date().toISOString(),
      total_trades: 0,
      winning_trades: 0,
      losing_trades: 0,
      total_pnl: 0,
      strategy_config: {},
      last_heartbeat: new Date().toISOString(),
      initial_capital: startingCapital,
      current_capital: startingCapital,
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
    .maybeSingle();

  if (error) {
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
      fee: totalValue * 0.001,
      order_type: 'market',
      is_copy: false,
      status: 'filled',
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
 * Reset paper trading session (P1: full reset inkl. alle counters)
 */
export async function resetPaperTradingSession(
  supabase: Supa,
  sessionId: string,
  startingCapital: number = 100000,
): Promise<void> {
  const { error: deleteError } = await supabase
    .from('trades')
    .delete()
    .eq('session_id', sessionId);

  if (deleteError) {
    console.error('[paper-trading] resetPaperTradingSession delete trades:', deleteError.message);
    throw new Error('Failed to delete trades during reset');
  }

  const now = new Date().toISOString();
  const { error: updateError } = await supabase
    .from('trading_sessions')
    .update({
      current_capital_nok: startingCapital,
      current_capital: startingCapital,
      starting_capital_nok: startingCapital,
      initial_capital: startingCapital,
      total_pnl: 0,
      total_trades: 0,
      winning_trades: 0,
      losing_trades: 0,
      status: 'active',
      updated_at: now,
      last_heartbeat: now,
    })
    .eq('id', sessionId);

  if (updateError) {
    console.error('[paper-trading] resetPaperTradingSession update:', updateError.message);
    throw new Error('Failed to reset session balance');
  }
}

/**
 * Get or create paper trading session (auto-initialization).
 * P1: Rydder opp duplikate aktive paper-sessions for brukeren
 * og fikser manglende felter i gamle rader (soft migration).
 */
export async function getOrCreatePaperTradingSession(
  supabase: Supa,
  userId: string,
): Promise<PaperTradingSession> {
  // Hent ALLE aktive paper-sessions for brukeren
  const { data: allActive, error: fetchErr } = await supabase
    .from('trading_sessions')
    .select('*')
    .eq('user_id', userId)
    .eq('mode', 'paper')
    .eq('status', 'active')
    .order('started_at', { ascending: false });

  if (fetchErr) {
    console.error('[paper-trading] getOrCreate fetch error:', fetchErr.message);
    throw new Error('Failed to fetch paper trading sessions');
  }

  // Ingen aktive: opprett ny
  if (!allActive || allActive.length === 0) {
    return createPaperTradingSession(supabase, userId);
  }

  // Behold nyeste, sett resten til stopped
  const [newest, ...duplicates] = allActive;

  if (duplicates.length > 0) {
    const duplicateIds = duplicates.map((s: { id: string }) => s.id);
    const { error: stopErr } = await supabase
      .from('trading_sessions')
      .update({ status: 'stopped', updated_at: new Date().toISOString() })
      .in('id', duplicateIds);
    if (stopErr) {
      console.error('[paper-trading] getOrCreate dedup error:', stopErr.message);
    } else {
      console.log(`[paper-trading] Stoppet ${duplicates.length} duplikat(er) for user ${userId}`);
    }
  }

  // Soft migration: fyll inn manglende felter pa nyeste rad
  const s = newest as unknown as Record<string, unknown>;
  const needsUpdate = {} as Database['public']['Tables']['trading_sessions']['Update'];
  if (s.initial_capital == null) needsUpdate.initial_capital = (s.starting_capital_nok as number | null | undefined) ?? 100000;
  if (s.current_capital == null) needsUpdate.current_capital = (s.current_capital_nok as number | null | undefined) ?? 100000;
  if (s.total_pnl == null) needsUpdate.total_pnl = 0;
  if (s.total_trades == null) needsUpdate.total_trades = 0;
  if (s.winning_trades == null) needsUpdate.winning_trades = 0;
  if (s.losing_trades == null) needsUpdate.losing_trades = 0;
  if (s.strategy_config == null) needsUpdate.strategy_config = {};
  if (s.last_heartbeat == null) needsUpdate.last_heartbeat = new Date().toISOString();

  if (Object.keys(needsUpdate).length > 0) {
    needsUpdate.updated_at = new Date().toISOString();
    const { error: patchErr } = await supabase
      .from('trading_sessions')
      .update(needsUpdate)
      .eq('id', (newest as unknown as { id: string }).id);
    if (patchErr) {
      console.error('[paper-trading] getOrCreate soft-migration error:', patchErr.message);
    } else {
      console.log(`[paper-trading] Soft-migrert rad ${(newest as { id: string }).id} med ${Object.keys(needsUpdate).length} felt`);
    }
  }

  return newest as unknown as PaperTradingSession;
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
