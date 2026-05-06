"use client";

import { useAuth } from "@/hooks/useAuth";
import { createClient } from "@/lib/utils";
import { TradingMode } from "@/types/trading";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { useWebSocketPrice } from "@/hooks/useWebSocketPrice";
import { executeTradeAction } from "@/app/actions/trading";

// Matches actual DB: trading_sessions table columns:
// id, user_id, trading_pair, mode, strategy, status, params, started_at,
// stopped_at, last_tick_at, last_heartbeat, total_trades, winning_trades, losing_trades, pnl
interface DBTradingSession {
  id: string;
  user_id: string;
  trading_pair: string;
  mode: TradingMode;
  strategy: string;
  status: "active" | "paused" | "stopped" | "crashed";
  params: {
    initial_capital?: number;
    [key: string]: unknown;
  } | null;
  started_at: string;
  stopped_at: string | null;
  total_trades: number;
  winning_trades: number;
  losing_trades: number;
  pnl: number;
}

// Frontend-friendly interface with computed fields
interface TradingSession extends DBTradingSession {
  strategy_id: string;
  initial_capital: number;
  current_capital: number;
  total_pnl: number;
  open_position: null;
}

interface Trade {
  id: string;
  session_id: string;
  mode: TradingMode;
  trading_pair: string;
  side: "buy" | "sell";
  order_type: "market" | "limit";
  quantity: number;
  price: number;
  total_value: number;
  fee: number;
  status: string;
  realized_pnl: number | null;
  executed_at: string;
}

interface ExecuteTradeParams {
  symbol?: string;
  side: "buy" | "sell";
  orderType?: "market" | "limit";
  quantity: number;
  price?: number;
}

interface ExecuteResult {
  success: boolean;
  error?: string;
  trade?: {
    tradeId: string | undefined;
    orderId: string | undefined;
    symbol: string;
    side: "buy" | "sell";
    executedQuantity: number | undefined;
    executedPrice: number | undefined;
    fee: number | undefined;
  };
}

export interface UnifiedTradingState {
  mode: TradingMode;
  session: TradingSession | null;
  sessions: TradingSession[];
  trades: Trade[];
  currentPrice: number;
  balance: number;
  unrealizedPnL: number;
  isLoading: boolean;
  error: string | null;

  setMode: (mode: TradingMode) => Promise<boolean>;
  createSession: (params: {
    mode: TradingMode;
    strategy_id?: string;
    trading_pair?: string;
    initial_capital?: number;
  }) => Promise<TradingSession | null>;
  executeTrade: (params: ExecuteTradeParams) => Promise<ExecuteResult>;
  pauseSession: () => Promise<boolean>;
  resumeSession: () => Promise<boolean>;
  stopSession: () => Promise<boolean>;
  refreshSessions: () => Promise<void>;
  refreshTrades: () => Promise<void>;
}

const DEFAULT_SYMBOL = "BTCUSDT";

// Map DB session to frontend-friendly format
function normalizeSession(s: Record<string, unknown>): TradingSession {
  const params = (s.params as { initial_capital?: number }) || {};
  const initialCapital = params.initial_capital || 100000;
  const pnl = (s.pnl as number) || 0;

  return {
    ...s,
    strategy_id: (s.strategy as string) || "dca",
    initial_capital: initialCapital,
    current_capital: initialCapital + pnl,
    total_pnl: pnl,
    open_position: null,
  } as TradingSession;
}

/**
 * Unified trading state (paper/live) via REST + Supabase.
 * **Aktiv UI:** `UnifiedTradingDashboard` bruker egen dataflyt; denne hooken er klar for
 * konsolidert gjenbruk og matcher `/api/trading/*` + `trades`-tabellen.
 */
export function useUnifiedTrading(
  symbol: string = DEFAULT_SYMBOL,
): UnifiedTradingState {
  const { user } = useAuth();
  const router = useRouter();
  const supabase = createClient();

  const [mode, setModeState] = useState<TradingMode>("paper");
  const [session, setSession] = useState<TradingSession | null>(null);
  const [sessions, setSessions] = useState<TradingSession[]>([]);
  const [trades, setTrades] = useState<Trade[]>([]);
  const [currentPrice, setCurrentPrice] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // WebSocket price with fallback polling
  const { price: wsPrice, isConnected: wsConnected } = useWebSocketPrice(symbol);
  const fallbackIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Fetch live price from server-side proxy (fallback)
  const fetchPrice = useCallback(async () => {
    try {
      const res = await fetch(`/api/trading/price?symbol=${symbol}`);
      if (res.ok) {
        const data = await res.json();
        setCurrentPrice(data.price);
      }
    } catch {
      // Price fetch failure is non-critical
    }
  }, [symbol]);

  // Use WebSocket price when available, fallback to REST polling every 30s
  useEffect(() => {
    if (wsConnected && wsPrice) {
      setCurrentPrice(wsPrice);
    }
  }, [wsPrice, wsConnected]);

  // Fallback polling every 30s when WebSocket is not connected
  useEffect(() => {
    if (wsConnected) {
      // Clear fallback interval when WS is connected
      if (fallbackIntervalRef.current) {
        clearInterval(fallbackIntervalRef.current);
        fallbackIntervalRef.current = null;
      }
      return;
    }

    // Initial fetch
    fetchPrice();
    // Fallback polling every 30s (not 5s)
    fallbackIntervalRef.current = setInterval(fetchPrice, 30_000);
    
    return () => {
      if (fallbackIntervalRef.current) {
        clearInterval(fallbackIntervalRef.current);
      }
    };
  }, [fetchPrice, wsConnected]);

  // Fetch sessions
  const refreshSessions = useCallback(async () => {
    if (!user) return;

    try {
      const res = await fetch(`/api/trading/sessions?status=active`);
      if (!res.ok) return;
      const data = await res.json();
      const normalized = (data.sessions || []).map(normalizeSession);
      setSessions(normalized);

      const activeSession = normalized.find(
        (s: TradingSession) => s.mode === mode && s.status === "active",
      );
      if (activeSession) {
        setSession(activeSession);
      }
    } catch {
      // Non-critical
    }
  }, [user, mode]);

  // Fetch trades for active session
  const refreshTrades = useCallback(async () => {
    if (!user || !session) return;

    try {
      const { data, error: queryError } = await supabase
        .from("trades")
        .select("*")
        .eq("session_id", session.id)
        .order("executed_at", { ascending: false })
        .limit(50);

      if (!queryError && data) {
        setTrades(data as Parameters<typeof setTrades>[0]);
      }
    } catch {
      // Non-critical
    }
  }, [user, session, supabase]);

  // Initial load
  useEffect(() => {
    const init = async () => {
      if (!user) {
        setIsLoading(false);
        return;
      }

      setIsLoading(true);
      try {
        // Default to paper mode
        setModeState("paper");
        await refreshSessions();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to initialize");
      } finally {
        setIsLoading(false);
      }
    };

    init();
  }, [user]);

  // Refresh trades when session changes
  useEffect(() => {
    if (session) refreshTrades();
  }, [session, refreshTrades]);

  // Set mode
  const setMode = useCallback(
    async (newMode: TradingMode): Promise<boolean> => {
      try {
        setError(null);

        if (newMode === "live") {
          setError("Live trading er ikke aktivert ennå. Bruk paper trading.");
          return false;
        }

        setModeState(newMode);

        // Find active session for new mode
        const modeSession = sessions.find(
          (s) => s.mode === newMode && s.status === "active",
        );
        setSession(modeSession || null);

        return true;
      } catch (err) {
        setError(err instanceof Error ? err.message : "Mode switch failed");
        return false;
      }
    },
    [sessions],
  );

  // Create session
  const createSession = useCallback(
    async (params: {
      mode: TradingMode;
      strategy_id?: string;
      trading_pair?: string;
      initial_capital?: number;
    }): Promise<TradingSession | null> => {
      try {
        setIsLoading(true);
        setError(null);

        const res = await fetch("/api/trading/sessions", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(params),
        });

        const data = await res.json();

        if (!res.ok) {
          throw new Error(data.error || "Failed to create session");
        }

        const normalized = normalizeSession(data.session);
        setSession(normalized);
        await refreshSessions();
        try {
          router.refresh();
        } catch {
          /* noop */
        }
        return normalized;
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Failed to create session",
        );
        return null;
      } finally {
        setIsLoading(false);
      }
    },
    [refreshSessions, router],
  );

  // Execute trade
  const executeTrade = useCallback(
    async (params: ExecuteTradeParams): Promise<ExecuteResult> => {
      if (!session) {
        return {
          success: false,
          error: "No active session. Create one first.",
        };
      }

      try {
        setIsLoading(true);
        setError(null);

        const data = await executeTradeAction({
          session_id: session.id,
          symbol: params.symbol || symbol,
          side: params.side,
          order_type: params.orderType || "market",
          quantity: params.quantity,
          price: params.price,
        });

        if (!data.success) {
          throw new Error(data.error || "Trade execution failed");
        }

        await Promise.all([refreshTrades(), refreshSessions()]);
        try {
          router.refresh();
        } catch {
          /* noop */
        }

        return {
          success: true,
          trade: data.trade,
        };
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : "Trade failed";
        setError(errorMsg);
        return { success: false, error: errorMsg };
      } finally {
        setIsLoading(false);
      }
    },
    [session, symbol, refreshTrades, refreshSessions, router],
  );

  // Session controls
  const updateSessionStatus = useCallback(
    async (action: string): Promise<boolean> => {
      if (!session) return false;

      try {
        setIsLoading(true);
        const res = await fetch("/api/trading/sessions", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ session_id: session.id, action }),
        });

        if (!res.ok) {
          const data = await res.json();
          throw new Error(data.error || "Failed to update session");
        }

        const data = await res.json();
        setSession(normalizeSession(data.session));
        await refreshSessions();
        try {
          router.refresh();
        } catch {
          /* noop */
        }
        return true;
      } catch (err) {
        setError(err instanceof Error ? err.message : "Session update failed");
        return false;
      } finally {
        setIsLoading(false);
      }
    },
    [session, refreshSessions, router],
  );

  const pauseSession = useCallback(
    () => updateSessionStatus("pause"),
    [updateSessionStatus],
  );
  const resumeSession = useCallback(
    () => updateSessionStatus("resume"),
    [updateSessionStatus],
  );
  const stopSession = useCallback(
    () => updateSessionStatus("stop"),
    [updateSessionStatus],
  );

  const unrealizedPnL = 0;
  const balance = session?.current_capital ?? (mode === "paper" ? 100000 : 0);

  return {
    mode,
    session,
    sessions,
    trades,
    currentPrice,
    balance,
    unrealizedPnL,
    isLoading,
    error,

    setMode,
    createSession,
    executeTrade,
    pauseSession,
    resumeSession,
    stopSession,
    refreshSessions,
    refreshTrades,
  };
}
