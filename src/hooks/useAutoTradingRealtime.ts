"use client";

import { useEffect, useState, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import type { Tables } from "@/lib/supabase/client";

// Bruk databasetyper direkte
type TradingSessionRow = Tables<"trading_sessions">;
type TradeRow = Tables<"trades">;

interface RealtimeState {
  session: TradingSessionRow | null;
  trades: TradeRow[];
  isConnected: boolean;
  lastUpdate: Date | null;
  error: Error | null;
}

interface UseAutoTradingRealtimeReturn extends RealtimeState {
  refresh: () => Promise<void>;
}

/**
 * KLA-137: Supabase Realtime hook for auto-trading
 * Lytter på trading_sessions og trades tabellene
 */
export function useAutoTradingRealtime(
  sessionId: string | null,
): UseAutoTradingRealtimeReturn {
  const [state, setState] = useState<RealtimeState>({
    session: null,
    trades: [],
    isConnected: false,
    lastUpdate: null,
    error: null,
  });

  const supabase = createClient();

  const fetchInitial = useCallback(async () => {
    if (!sessionId) {
      setState((prev) => ({
        ...prev,
        session: null,
        trades: [],
        lastUpdate: null,
      }));
      return;
    }

    try {
      // Hent initial session fra Supabase
      const { data: session, error: sessionError } = await supabase
        .from("trading_sessions")
        .select("*")
        .eq("id", sessionId)
        .single() as any;

      if (sessionError) {
        throw sessionError;
      }

      const { data: trades, error: tradesError } = await supabase
        .from("trades")
        .select("*")
        .eq("session_id", sessionId)
        .order("executed_at", { ascending: false })
        .limit(50);

      if (tradesError) {
        throw tradesError;
      }

      setState((prev) => ({
        ...prev,
        session: session ?? null,
        trades: trades ?? [],
        lastUpdate: new Date(),
        error: null,
      }));
    } catch (err) {
      setState((prev) => ({
        ...prev,
        error: err instanceof Error ? err : new Error(String(err)),
      }));
    }
  }, [sessionId, supabase]);

  useEffect(() => {
    if (!sessionId) return;

    // Fetch initial data
    fetchInitial();

    // Set up realtime subscriptions
    const channel = supabase
      .channel(`auto-trading-${sessionId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "trading_sessions",
          filter: `id=eq.${sessionId}`,
        },
        (payload) => {
          setState((prev) => ({
            ...prev,
            session: payload.new as TradingSessionRow,
            lastUpdate: new Date(),
          }));
        },
      )
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "trades",
          filter: `session_id=eq.${sessionId}`,
        },
        (payload) => {
          setState((prev) => ({
            ...prev,
            trades: [payload.new as TradeRow, ...prev.trades].slice(0, 50),
            lastUpdate: new Date(),
          }));
        },
      )
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "trades",
          filter: `session_id=eq.${sessionId}`,
        },
        (payload) => {
          setState((prev) => ({
            ...prev,
            trades: prev.trades.map((trade) =>
              trade.id === (payload.new as TradeRow).id
                ? (payload.new as TradeRow)
                : trade,
            ),
            lastUpdate: new Date(),
          }));
        },
      )
      .subscribe((status) => {
        setState((prev) => ({
          ...prev,
          isConnected: status === "SUBSCRIBED",
        }));
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [sessionId, fetchInitial, supabase]);

  return {
    ...state,
    refresh: fetchInitial,
  };
}

/**
 * Hook for å lytte på alle aktive trading sessions for en bruker
 */
export function useUserAutoTradingSessions(userId: string | null): {
  sessions: TradingSessionRow[];
  isConnected: boolean;
  error: Error | null;
  refresh: () => Promise<void>;
} {
  const [state, setState] = useState<{
    sessions: TradingSessionRow[];
    isConnected: boolean;
    error: Error | null;
  }>({
    sessions: [],
    isConnected: false,
    error: null,
  });

  const supabase = createClient();

  const fetchInitial = useCallback(async () => {
    if (!userId) {
      setState((prev) => ({ ...prev, sessions: [] }));
      return;
    }

    try {
      const { data, error } = await supabase
        .from("trading_sessions")
        .select("*")
        .eq("user_id" as any, userId)
        .order("started_at", { ascending: false })
        .limit(10);

      if (error) {
        throw error;
      }

      setState((prev) => ({
        ...prev,
        sessions: data ?? [],
        error: null,
      }));
    } catch (err) {
      setState((prev) => ({
        ...prev,
        error: err instanceof Error ? err : new Error(String(err)),
      }));
    }
  }, [userId, supabase]);

  useEffect(() => {
    if (!userId) return;

    fetchInitial();

    const channel = supabase
      .channel(`user-auto-trading-${userId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "trading_sessions",
          filter: `user_id=eq.${userId}`,
        },
        () => {
          // Refresh all sessions on any change
          fetchInitial();
        },
      )
      .subscribe((status) => {
        setState((prev) => ({
          ...prev,
          isConnected: status === "SUBSCRIBED",
        }));
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId, fetchInitial, supabase]);

  return {
    ...state,
    refresh: fetchInitial,
  };
}
