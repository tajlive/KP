"use client";

import {
  PRESET_PROFILES,
  PresetProfileId,
} from "@/lib/auto-trading/preset-profiles";
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

  const fetchData = useCallback(async () => {
    if (!userId) return;

    try {
      setIsLoading(true);

      // KLA-auth: browser-klienten er alltid anon — pulse-data hentes via
      // server-API (user_id-scopet)
      const res = await fetch("/api/user/pulse", {
        credentials: "same-origin",
      });
      if (!res.ok) throw new Error(`pulse fetch failed: ${res.status}`);
      const json = await res.json().catch(() => null);

      // 1. Historical data from daily metrics → chart
      interface MetricData {
        date: string;
        ending_capital_nok: number;
      }
      const chartData: PulseChartData[] = (
        (json?.metrics ?? []) as MetricData[]
      ).map((m) => ({
        time: Math.floor(new Date(m.date).getTime() / 1000),
        value: Number(m.ending_capital_nok),
      }));

      // 2. Recent trades → events
      const profile = PRESET_PROFILES[profileId];
      interface TradeRow {
        id: string;
        created_at: string;
        side: string;
        trading_pair: string;
        price: number;
        quantity: number;
      }
      const pulseEvents: PulseEvent[] = (
        (json?.trades ?? []) as TradeRow[]
      ).map((t) => ({
        id: t.id,
        time: Math.floor(new Date(t.created_at).getTime() / 1000),
        type: t.side === "buy" ? "buy" : "sell",
        symbol: t.trading_pair,
        price: Number(t.price),
        amount: Number(t.quantity),
        explanation: profile.tooltip.explanation,
        courseModuleSlug: profile.tooltip.courseModuleSlug,
      }));

      setData(chartData);
      setEvents(pulseEvents);

      // 3. Active session → stats
      const session = json?.session as {
        current_capital_nok: number;
        initial_capital: number;
        total_pnl: number;
      } | null;
      if (session) {
        const current = Number(session.current_capital_nok || 0);
        const initial = Number(session.initial_capital || 1);
        const pnl = current - initial;
        setStats({
          portfolioValue: current,
          dailyChangeNok: pnl,
          dailyChangePct: initial > 0 ? (pnl / initial) * 100 : 0,
        });
      }

      setError(null);
    } catch (err) {
      console.error("Error fetching pulse data:", err);
      setError(err instanceof Error ? err : new Error("Unknown error"));
    } finally {
      setIsLoading(false);
    }
  }, [userId, profileId]);

  // KLA-auth: supabase-realtime fra browser er alltid anon (RLS → ingen
  // events). Erstattet med polling hvert 30. sek. Skikkelig realtime = Fase 4.
  useEffect(() => {
    fetchData();

    if (!userId) return;

    const interval = setInterval(fetchData, 30000);
    setIsConnected(true);
    return () => {
      clearInterval(interval);
      setIsConnected(false);
    };
  }, [userId, fetchData]);

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
