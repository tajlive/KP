"use client";
import { getSupabaseClient } from "@/lib/supabase/client";
import type { Database, Json } from "@/types/database.types";
import {
  enrichStrategyConfigForSession,
  parseInitialCapitalFromConfig,
  parseTradingPairFromConfig,
  getDbRiskLevelEnum,
} from "@/lib/auto-trading/strategy-catalog";
import type { ProductStrategyId } from "@/lib/trading/strategy-id-aliases";
import { clampDCAConfig } from "@/lib/trading/dca-validation";

const supabase = getSupabaseClient();

type TradesRow = Database["public"]["Tables"]["trades"]["Row"];

export type TradingMode = "paper" | "live";
export type StrategyType =
  | "dca_trygg"
  | "trend_balansert"
  | "multisignal_aktiv"
  | "simple_grid"
  | "grid_bot"
  | "ensemble_ai"
  | "ai_copy";

export interface Trade {
  id: string;
  session_id: string;
  symbol: string;
  side: "buy" | "sell";
  quantity: number;
  price: number;
  total_value: number;
  fee: number;
  realized_pnl: number | null;
  status: "pending" | "filled" | "partially_filled" | "cancelled" | "failed";
  mode: TradingMode;
  is_copy: boolean;
  strategy_signal?: Record<string, unknown>;
  executed_at: string;
  created_at: string;
  /** 🎭 PilotTrade: var dette en AI-automatisk handel? */
  pilot_trade?: boolean;
  /** 🎭 PilotTrade: forklaring på hvorfor handelen skjedde */
  pilot_explanation?: string | null;
}

/** Synkroniserer JWT med Realtime slik at RLS-filterte postgres_changes faktisk leveres (ellers tom strøm). */
async function syncRealtimeJwt(): Promise<void> {
  const {
    data: { session },
  } = await supabase.auth.getSession();
  await supabase.realtime.setAuth(session?.access_token ?? null);
}

export function mapDbTradeRowToTrade(row: TradesRow): Trade {
  const sideLower = String(row.side).toLowerCase();
  const side: Trade["side"] = sideLower === "sell" ? "sell" : "buy";
  const st = String(row.status).toLowerCase();
  const status: Trade["status"] =
    st === "filled" ||
    st === "pending" ||
    st === "partially_filled" ||
    st === "cancelled" ||
    st === "failed"
      ? st
      : "filled";

  return {
    id: row.id,
    session_id: row.session_id,
    symbol: row.trading_pair,
    side,
    quantity: row.quantity,
    price: row.price,
    total_value: row.total_value,
    fee: row.fee,
    realized_pnl: row.realized_pnl,
    status,
    mode: row.mode as TradingMode,
    is_copy: row.is_copy,
    strategy_signal:
      row.strategy_signal !== null &&
      typeof row.strategy_signal === "object" &&
      !Array.isArray(row.strategy_signal)
        ? (row.strategy_signal as Record<string, unknown>)
        : undefined,
    executed_at: row.executed_at,
    created_at: row.created_at,
    pilot_trade: row.pilot_trade ?? false,
    pilot_explanation: row.pilot_explanation,
  };
}

export function mergeTradeIntoList(
  prev: Trade[],
  incoming: Trade,
  maxLen = 50,
): Trade[] {
  const i = prev.findIndex((t) => t.id === incoming.id);
  if (i === -1) {
    return [incoming, ...prev].slice(0, maxLen);
  }
  const next = [...prev];
  next[i] = incoming;
  return next;
}

export interface Portfolio {
  session_id: string;
  total_value: number;
  cash_balance: number;
  invested_value: number;
  total_pnl: number;
  total_trades: number;
  win_rate: number;
}

export interface UserStrategy {
  id: string;
  strategy_id: StrategyType;
  strategy_config: Record<string, unknown>;
  is_active: boolean;
  mode: TradingMode;
  trading_pair: string;
  current_capital: number;
  initial_capital: number;
  total_trades: number;
  winning_trades: number;
  total_pnl: number;
  started_at: string | null;
  status: "active" | "paused" | "crashed" | "stopped";
}

async function getUser() {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Ikke innlogget");
  return user;
}

export async function getPortfolio(
  mode: TradingMode,
): Promise<Portfolio | null> {
  const user = await getUser();
  const { data: sessions } = await supabase
    .from("trading_sessions")
    .select(
      "id, current_capital, initial_capital, current_capital_nok, starting_capital_nok, total_pnl, total_trades, winning_trades, open_position",
    )
    .eq("user_id", user.id)
    .eq("mode", mode)
    .eq("status", "active")
    .eq("archived", false)
    .order("updated_at", { ascending: false });

  if (!sessions || sessions.length === 0) return null;

  /** Summer alle aktive sessions for riktig portefølje-aggregering */
  let totalCash = 0;
  let totalInitial = 0;
  let totalPnl = 0;
  let totalTrades = 0;
  let totalWins = 0;
  let investedValue = 0;

  for (const s of sessions) {
    const cash = Number(s.current_capital_nok ?? s.current_capital ?? 0);
    const initial = Number(s.starting_capital_nok ?? s.initial_capital ?? cash);
    totalCash += cash;
    totalInitial += initial;
    totalPnl += cash - initial;
    totalTrades += Number(s.total_trades ?? 0);
    totalWins += Number(s.winning_trades ?? 0);

    // Beregn invested_value fra åpne posisjoner (FIFO lots)
    const openPos = s.open_position as Record<string, unknown> | null;
    if (openPos) {
      const entryPrice = Number(openPos.entry_price ?? 0);
      const quantity = Number(openPos.quantity ?? 0);
      if (entryPrice > 0 && quantity > 0) {
        investedValue += entryPrice * quantity;
      }
    }
  }

  const winRate = totalTrades > 0 ? (totalWins / totalTrades) * 100 : 0;

  return {
    session_id: sessions[0].id,
    total_value: totalCash,
    cash_balance: totalCash,
    invested_value: investedValue,
    total_pnl: totalPnl,
    total_trades: totalTrades,
    win_rate: winRate,
  };
}

/**
 * Siste handler for innlogget bruker.
 * Uten `mode`: paper + live (unified dashboard skal ikke «skjule» gårsdagens handler ved modusbytte).
 */
export async function getRecentTrades(params?: {
  mode?: TradingMode;
  limit?: number;
}): Promise<Trade[]> {
  const limit = params?.limit ?? 50;
  const user = await getUser();
  let q = supabase
    .from("trades")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(limit);
  if (params?.mode) {
    q = q.eq("mode", params.mode);
  }
  const { data } = await q;
  if (!data?.length) return [];
  return data.map((row) => mapDbTradeRowToTrade(row as TradesRow));
}

export async function getActiveStrategies(
  mode: TradingMode,
): Promise<UserStrategy[]> {
  const user = await getUser();
  const { data } = await supabase
    .from("trading_sessions")
    .select("*")
    .eq("user_id", user.id)
    .eq("mode", mode)
    .eq("status", "active");

  if (!data) return [];

  // Map trading_sessions to UserStrategy format
  return data.map((session) => ({
    id: session.id,
    strategy_id: session.strategy_id as StrategyType,
    strategy_config: (session.strategy_config || {}) as Record<string, unknown>,
    is_active: session.status === "active",
    mode: session.mode as TradingMode,
    trading_pair: session.trading_pair ?? "",
    current_capital: Number(
      session.current_capital_nok ?? session.current_capital ?? 0,
    ),
    initial_capital: Number(
      session.starting_capital_nok ?? session.initial_capital ?? 0,
    ),
    total_trades: session.total_trades ?? 0,
    winning_trades: session.winning_trades ?? 0,
    total_pnl: Number(session.current_capital_nok ?? session.current_capital ?? 0) - Number(session.starting_capital_nok ?? session.initial_capital ?? 0),
    started_at: session.started_at ?? null,
    status: session.status as UserStrategy["status"],
  }));
}

export async function getAllStrategies(
  mode: TradingMode,
): Promise<UserStrategy[]> {
  const user = await getUser();
  const { data } = await supabase
    .from("trading_sessions")
    .select("*")
    .eq("user_id", user.id)
    .eq("mode", mode)
    .order("created_at", { ascending: false });

  if (!data) return [];

  return data.map((session) => ({
    id: session.id,
    strategy_id: session.strategy_id as StrategyType,
    strategy_config: (session.strategy_config || {}) as Record<string, unknown>,
    is_active: session.status === "active",
    mode: session.mode as TradingMode,
    trading_pair: session.trading_pair ?? "",
    current_capital: Number(
      session.current_capital_nok ?? session.current_capital ?? 0,
    ),
    initial_capital: Number(
      session.starting_capital_nok ?? session.initial_capital ?? 0,
    ),
    total_trades: session.total_trades ?? 0,
    winning_trades: session.winning_trades ?? 0,
    total_pnl: Number(session.current_capital_nok ?? session.current_capital ?? 0) - Number(session.starting_capital_nok ?? session.initial_capital ?? 0),
    started_at: session.started_at ?? null,
    status: session.status as UserStrategy["status"],
  }));
}

export async function startStrategy(
  strategyType: StrategyType,
  mode: TradingMode,
  config: Record<string, unknown>,
): Promise<UserStrategy> {
  const user = await getUser();

  const productId = strategyType as ProductStrategyId;
  const tradingPair = parseTradingPairFromConfig(productId, config);
  const initialCapital = parseInitialCapitalFromConfig(config);
  const strategy_config = enrichStrategyConfigForSession(productId, config);

  // Clamp DCA config values to safe bounds on the server
  if (productId === "dca_trygg") {
    const dcaClamped = clampDCAConfig({
      position_size: strategy_config.position_size as number | undefined,
      interval_minutes: strategy_config.interval_minutes as number | undefined,
    });
    strategy_config.position_size = dcaClamped.position_size;
    strategy_config.interval_minutes = dcaClamped.interval_minutes;
  }

  // Archive any existing active session for this mode before creating a new one.
  // This prevents zombie sessions from accumulating.
  await supabase
    .from("trading_sessions")
    .update({
      status: "stopped",
      stopped_at: new Date().toISOString(),
      archived: true,
      archived_at: new Date().toISOString(),
    })
    .eq("user_id", user.id)
    .eq("mode", mode)
    .eq("status", "active");

  // Create new trading session
  const { data, error } = await supabase
    .from("trading_sessions")
    .insert({
      user_id: user.id,
      mode,
      status: "active",
      strategy_id: strategyType,
      strategy_config: strategy_config as unknown as Json,
      trading_pair: tradingPair,
      risk_level: getDbRiskLevelEnum(productId),
      current_capital: initialCapital,
      initial_capital: initialCapital,
      total_trades: 0,
      winning_trades: 0,
      losing_trades: 0,
      total_pnl: 0,
      started_at: new Date().toISOString(),
    })
    .select()
    .single();

  if (error) throw error;

  return {
    id: data.id,
    strategy_id: data.strategy_id as StrategyType,
    strategy_config: (data.strategy_config || {}) as Record<string, unknown>,
    is_active: true,
    mode: data.mode as TradingMode,
    trading_pair: data.trading_pair ?? "",
    current_capital: Number(data.current_capital ?? 0),
    initial_capital: Number(data.initial_capital ?? 0),
    total_trades: data.total_trades ?? 0,
    winning_trades: data.winning_trades ?? 0,
    total_pnl: data.total_pnl ?? 0,
    started_at: data.started_at ?? null,
    status: data.status as UserStrategy["status"],
  };
}

export async function stopStrategy(
  strategyType: StrategyType,
  mode: TradingMode,
): Promise<void> {
  const user = await getUser();
  await supabase
    .from("trading_sessions")
    .update({
      status: "stopped",
      stopped_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      archived: true,
      archived_at: new Date().toISOString(),
    })
    .eq("user_id", user.id)
    .eq("mode", mode)
    .eq("strategy_id", strategyType)
    .eq("status", "active");
}

export type TradeRealtimeKind = "INSERT" | "UPDATE";

/**
 * Abonnerer på egne rader i `trades`. Kaller `realtime.setAuth` + lytter på token-refresh,
 * ellers mottar ikke klienten events under RLS (klassisk årsak til «må refreshe»).
 * Lytter på INSERT og UPDATE (ordre som går pending → filled kommer ofte som UPDATE).
 * `mode === null`: alle moduser (samme som getRecentTrades uten mode-filter).
 */
export function subscribeToTrades(
  mode: TradingMode | null,
  userId: string,
  onTrade: (trade: Trade, kind: TradeRealtimeKind) => void,
): () => void {
  let channel: ReturnType<typeof supabase.channel> | null = null;
  let cancelled = false;

  const {
    data: { subscription: authSubscription },
  } = supabase.auth.onAuthStateChange((_event, session) => {
    void supabase.realtime.setAuth(session?.access_token ?? null);
  });

  const handler =
    (kind: TradeRealtimeKind) =>
    (payload: { new: Record<string, unknown> }) => {
      const trade = mapDbTradeRowToTrade(payload.new as TradesRow);
      if (mode !== null && trade.mode !== mode) return;
      onTrade(trade, kind);
    };

  void (async () => {
    await syncRealtimeJwt();
    if (cancelled) return;
    const channelSuffix = mode ?? "all";
    channel = supabase
      .channel(`trades-${channelSuffix}-${userId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "trades",
          filter: `user_id=eq.${userId}`,
        },
        handler("INSERT"),
      )
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "trades",
          filter: `user_id=eq.${userId}`,
        },
        handler("UPDATE"),
      )
      .subscribe();
  })();

  return () => {
    cancelled = true;
    authSubscription.unsubscribe();
    if (channel) {
      void supabase.removeChannel(channel);
    }
  };
}

// Helper to create a paper trade (for testing/demo)
export async function createPaperTrade(
  sessionId: string,
  trade: Omit<
    Trade,
    "id" | "session_id" | "user_id" | "created_at" | "idempotency_key"
  >,
): Promise<Trade> {
  const user = await getUser();

  const idempotencyKey = `${sessionId}-${trade.side}-${Date.now()}`;

  const { data, error } = await supabase
    .from("trades")
    .insert({
      session_id: sessionId,
      user_id: user.id,
      idempotency_key: idempotencyKey,
      mode: trade.mode,
      trading_pair: trade.symbol,
      side: trade.side,
      order_type: "market",
      quantity: trade.quantity,
      price: trade.price,
      total_value: trade.total_value,
      fee: trade.fee || 0,
      status: trade.status,
      realized_pnl: trade.realized_pnl,
      is_copy: trade.is_copy || false,
      strategy_signal: trade.strategy_signal as unknown as Json,
      executed_at: trade.executed_at || new Date().toISOString(),
    })
    .select()
    .single();

  if (error) throw error;
  return mapDbTradeRowToTrade(data as TradesRow);
}
