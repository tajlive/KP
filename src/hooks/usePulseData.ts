"use client";

import {
  PRESET_PROFILES,
  PresetProfileId,
} from "@/lib/auto-trading/preset-profiles";
import { createClient } from "@/lib/supabase/client";
import {
  ChartTimeframe,
  PulseChartData,
  PulseEvent,
  PulseMode,
} from "@/types/pulse";
import { useCallback, useEffect, useState } from "react";

interface UsePulseDataProps {
  userId: string | null;
  mode: PulseMode;
  profileId: PresetProfileId;
  timeframe: ChartTimeframe;
}

export function usePulseData({
  userId,
  mode,
  profileId,
  timeframe,
}: UsePulseDataProps) {
  const [data, setData] = useState<PulseChartData[]>([]);
  const [events, setEvents] = useState<PulseEvent[]>([]);
  const [stats, setStats] = useState({
    portfolioValue: 0,
    dailyChangeNok: 0,
    dailyChangePct: 0,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const supabase = createClient();

  const fetchData = useCallback(async () => {
    if (!userId) return;

    try {
      setIsLoading(true);

      // 1. Fetch historical data from daily metrics
      const { data: metrics, error: metricsError } = await supabase
        .from("auto_trading_daily_metrics")
        .select("date, ending_capital_nok")
        .eq("user_id", userId)
        .order("date", { ascending: true });

      if (metricsError) throw metricsError;

      // Transform metrics to chart data
      const chartData: PulseChartData[] = ((metrics || []) as unknown as Array<{date: string; ending_capital_nok: number}>).map((m) => ({
        time: (new Date(m.date).getTime() / 1000) as unknown,
        value: Number(m.ending_capital_nok),
      }));

      // 2. Fetch recent trades for events
      const { data: trades, error: tradesError } = await supabase
        .from("trades")
        .select("*")
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .limit(50);

      if (tradesError) throw tradesError;

      // Transform trades to events
      const profile = PRESET_PROFILES[profileId];
      const pulseEvents: PulseEvent[] = (trades || []).map((t: unknown) => ({
        id: t.id,
        time: (new Date(t.created_at).getTime() / 1000) as unknown,
        type: t.side === "buy" ? "buy" : "sell",
        symbol: t.symbol,
        price: Number(t.price),
        amount: Number(t.quantity),
        explanation: profile.tooltip.explanation,
        courseModuleSlug: profile.tooltip.courseModuleSlug,
      }));

      setData(chartData);
      setEvents(pulseEvents);

      // 3. Get current session for real-time stats
      const { data: session, error: sessionError } = (await supabase
        .from("trading_sessions")
        .select("*")
        .eq("user_id" as any, userId)
        .eq("status", "active")
        .maybeSingle()) as unknown;

      if (session && !sessionError) {
        setStats({
          portfolioValue: Number(session.current_capital_nok),
          dailyChangeNok: Number(session.total_pnl_nok || 0),
          dailyChangePct: Number(session.total_pnl_pct || 0),
        });
      }

      setError(null);
    } catch (err) {
      console.error("Error fetching pulse data:", err);
      setError(err instanceof Error ? err : new Error("Unknown error"));
    } finally {
      setIsLoading(false);
    }
  }, [userId, profileId, supabase]);

  useEffect(() => {
    fetchData();

    if (!userId) return;

    // Real-time subscription for new trades
    const channel = supabase
      .channel(`pulse-updates-${userId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "trades",
          filter: `user_id=eq.${userId}`,
        },
        (payload) => {
          const newTrade = payload.new;
          const profile = PRESET_PROFILES[profileId];

          const newEvent: PulseEvent = {
            id: newTrade.id,
            time: (new Date(newTrade.created_at).getTime() / 1000) as unknown,
            type: newTrade.side === "buy" ? "buy" : "sell",
            symbol: newTrade.symbol,
            price: Number(newTrade.price),
            amount: Number(newTrade.quantity),
            explanation: profile.tooltip.explanation,
            courseModuleSlug: profile.tooltip.courseModuleSlug,
          };

          setEvents((prev) => [newEvent, ...prev].slice(0, 50));
        },
      )
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "trading_sessions",
          filter: `user_id=eq.${userId}`,
        },
        (payload) => {
          const session = payload.new;
          setStats({
            portfolioValue: Number(session.current_capital_nok),
            dailyChangeNok: Number(session.total_pnl_nok || 0),
            dailyChangePct: Number(session.total_pnl_pct || 0),
          });
        },
      )
      .subscribe((status) => {
        setIsConnected(status === "SUBSCRIBED");
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId, profileId, fetchData, supabase]);

  return {
    data,
    events,
    stats,
    isLoading,
    isConnected,
    error,
    refresh: fetchData,
  };
}
