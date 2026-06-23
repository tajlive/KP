"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { getSupabaseClient } from "@/lib/supabase/client";
import type { RealtimeChannel } from "@supabase/supabase-js";

export interface LivePnLData {
  totalNok: number;
  changeNok: number;
  changePct: number;
  lastUpdated: Date;
  isLoading: boolean;
  sparklineData: number[];
}

interface TradingSession {
  id: string;
  current_capital_nok: number | null;
  starting_capital_nok: number | null;
  updated_at: string | null;
  created_at: string | null;
}

// Generate mock sparkline data based on current value
function generateSparklineData(
  baseValue: number,
  isPositive: boolean,
  points: number = 24
): number[] {
  const data: number[] = [];
  let currentValue = baseValue * (isPositive ? 0.95 : 1.05);
  const volatility = baseValue * 0.02;

  for (let i = 0; i < points; i++) {
    const change = (Math.random() - 0.5) * volatility;
    currentValue += change;
    data.push(currentValue);
  }

  // Ensure the last point matches current direction
  data[data.length - 1] = baseValue;

  return data;
}

export function useLivePnL(): LivePnLData {
  const [data, setData] = useState<LivePnLData>({
    totalNok: 0,
    changeNok: 0,
    changePct: 0,
    lastUpdated: new Date(),
    isLoading: true,
    sparklineData: [],
  });

  const channelRef = useRef<RealtimeChannel | null>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const initialCapitalRef = useRef<number | null>(null);

  const fetchData = useCallback(async () => {
    try {
      const supabase = getSupabaseClient();

      const { data: session, error } = await supabase
        .from("trading_sessions")
        .select(
          "id, current_capital_nok, starting_capital_nok, updated_at, created_at"
        )
        .eq("mode", "paper")
        .eq("status", "active")
        .order("updated_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) {
        console.error("[useLivePnL] Fetch error:", error);
        return;
      }

      if (session) {
        const currentCapital = session.current_capital_nok ?? 0;
        const startingCapital =
          session.starting_capital_nok ??
          initialCapitalRef.current ??
          currentCapital;

        // Store initial capital for future calculations
        if (initialCapitalRef.current === null) {
          initialCapitalRef.current = startingCapital;
        }

        const changeNok = currentCapital - startingCapital;
        const changePct =
          startingCapital > 0 ? (changeNok / startingCapital) * 100 : 0;

        setData((prev) => ({
          totalNok: currentCapital,
          changeNok,
          changePct,
          lastUpdated: new Date(),
          isLoading: false,
          sparklineData:
            prev.sparklineData.length > 0
              ? [...prev.sparklineData.slice(1), currentCapital]
              : generateSparklineData(currentCapital, changePct >= 0),
        }));
      } else {
        // No active session - use default values
        setData((prev) => ({
          ...prev,
          isLoading: false,
          sparklineData:
            prev.sparklineData.length > 0
              ? prev.sparklineData
              : generateSparklineData(100000, true),
        }));
      }
    } catch (err) {
      console.error("[useLivePnL] Unexpected error:", err);
      setData((prev) => ({ ...prev, isLoading: false }));
    }
  }, []);

  useEffect(() => {
    // Initial fetch
    fetchData();

    // Set up Supabase Realtime subscription
    try {
      const supabase = getSupabaseClient();

      channelRef.current = supabase
        .channel("pnl-live")
        .on(
          "postgres_changes",
          {
            event: "UPDATE",
            schema: "public",
            table: "trading_sessions",
            filter: "mode=eq.paper",
          },
          (payload) => {
            const session = payload.new as TradingSession;
            if (session) {
              const currentCapital = session.current_capital_nok ?? 0;
              const startingCapital =
                session.starting_capital_nok ??
                initialCapitalRef.current ??
                currentCapital;

              if (initialCapitalRef.current === null) {
                initialCapitalRef.current = startingCapital;
              }

              const changeNok = currentCapital - startingCapital;
              const changePct =
                startingCapital > 0 ? (changeNok / startingCapital) * 100 : 0;

              setData((prev) => ({
                totalNok: currentCapital,
                changeNok,
                changePct,
                lastUpdated: new Date(),
                isLoading: false,
                sparklineData:
                  prev.sparklineData.length > 0
                    ? [...prev.sparklineData.slice(1), currentCapital]
                    : generateSparklineData(currentCapital, changePct >= 0),
              }));
            }
          }
        )
        .subscribe();
    } catch (err) {
      console.error("[useLivePnL] Realtime setup error:", err);
    }

    // Fallback polling every 30 seconds
    intervalRef.current = setInterval(fetchData, 30000);

    return () => {
      if (channelRef.current) {
        channelRef.current.unsubscribe().catch((err: unknown) => {
          console.warn("[useLivePnL] unsubscribe error:", err);
        });
        channelRef.current = null;
      }
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [fetchData]);

  return data;
}
