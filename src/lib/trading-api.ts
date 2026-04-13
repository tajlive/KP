"use client";
import { createBrowserClient } from "@supabase/ssr";
import { safeStorage } from "@/lib/supabase/safe-storage";
import type { Database, Json } from "@/types/database.types";
import {
  enrichStrategyConfigForSession,
  parseInitialCapitalFromConfig,
  parseTradingPairFromConfig,
  getDbRiskLevelEnum,
} from "@/lib/auto-trading/strategy-catalog";
import type { ProductStrategyId } from "@/lib/trading/strategy-id-aliases";

const supabase = createBrowserClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  {
    auth: {
      storage: safeStorage,
    },
  },
);

type TradesRow = Database["public"]["Tables"]["trades"]["Row"];

export type TradingMode = "paper" | "live";
export type StrategyType =
  | "dca_trygg"
  | "trend_balansert"
  | "multisignal_aktiv"
  | "grid_bot"
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
  const { data } = await supabase
    .from("trading_sessions")
    .select(
      "id, current_capital, initial_capital, current_capital_nok, starting_capital_nok, total_pnl, total_trades, winning_trades",
    )
    .eq("user_id", user.id)
    .eq("mode", mode)
    .eq("status", "active")
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!data) return null;

  /** Papir/live bruker primært *_nok; legacy current_capital kan være desynket. */
  const cash = Number(data.current_capital_nok ?? data.current_capital ?? 0);
  const initial = Number(
    data.starting_capital_nok ?? data.initial_capital ?? cash,
  );
  const investedValue = Math.max(0, initial - cash);
  const totalValue = cash;
  const winRate =
    data.total_trades > 0 ? (data.winning_trades / data.total_trades) * 100 : 0;

  return {
    session_id: data.id,
    total_value: totalValue,
    cash_balance: cash,
    invested_value: investedValue,
    total_pnl: data.total_pnl,
    total_trades: data.total_trades,
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
    strategy_config: session.strategy_config || {},
    is_active: session.status === "active",
    mode: session.mode,
    trading_pair: session.trading_pair,
    current_capital: Number(
      session.current_capital_nok ?? session.current_capital ?? 0,
    ),
    initial_capital: Number(
      session.starting_capital_nok ?? session.initial_capital ?? 0,
    ),
    total_trades: session.total_trades,
    winning_trades: session.winning_trades,
    total_pnl: session.total_pnl,
    started_at: session.started_at,
    status: session.status,
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
    strategy_config: session.strategy_config || {},
    is_active: session.status === "active",
    mode: session.mode,
    trading_pair: session.trading_pair,
    current_capital: Number(
      session.current_capital_nok ?? session.current_capital ?? 0,
    ),
    initial_capital: Number(
      session.starting_capital_nok ?? session.initial_capital ?? 0,
    ),
    total_trades: session.total_trades,
    winning_trades: session.winning_trades,
    total_pnl: session.total_pnl,
    started_at: session.started_at,
    status: session.status,
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

  // First, deactivate any existing active session for this mode
  await supabase
    .from("trading_sessions")
    .update({ status: "stopped", stopped_at: new Date().toISOString() })
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
      strategy_config: strategy_config as any as Json,
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
    strategy_config: data.strategy_config || {},
    is_active: true,
    mode: data.mode,
    trading_pair: data.trading_pair,
    current_capital: data.current_capital,
    initial_capital: data.initial_capital,
    total_trades: data.total_trades,
    winning_trades: data.winning_trades,
    total_pnl: data.total_pnl,
    started_at: data.started_at,
    status: data.status,
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
      strategy_signal: trade.strategy_signal,
      executed_at: trade.executed_at || new Date().toISOString(),
    })
    .select()
    .single();

  if (error) throw error;
  return mapDbTradeRowToTrade(data as TradesRow);
}
