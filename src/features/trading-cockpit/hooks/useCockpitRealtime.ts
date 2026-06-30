"use client";

import * as React from "react";
import { getSupabaseClient } from "@/lib/supabase/client";
import type { CockpitMode, CockpitTab } from "@/features/trading-cockpit/types";
import type { RealtimeChannel } from "@supabase/supabase-js";

const REALTIME_DEBOUNCE_MS = 800;

interface UseCockpitRealtimeOptions {
  userId: string;
  mode: CockpitMode;
  activeTab: CockpitTab;
  onRefresh: () => Promise<void>;
  onRefreshTrades: () => Promise<void>;
  onInvalidateAnalytics: () => void;
  enabled?: boolean;
}

interface UseCockpitRealtimeResult {
  isSubscribed: boolean;
}

/**
 * Subscribe to Supabase Realtime changes for the logged-in user's trading
 * sessions and trades. Debounces refresh callbacks to avoid request stampedes.
 * Pauses subscriptions when the document is hidden and resumes on visibility.
 */
export function useCockpitRealtime({
  userId,
  mode,
  activeTab,
  onRefresh,
  onRefreshTrades,
  onInvalidateAnalytics,
  enabled = true,
}: UseCockpitRealtimeOptions): UseCockpitRealtimeResult {
  const [isSubscribed, setIsSubscribed] = React.useState(false);
  const timeoutRef = React.useRef<number | null>(null);
  const channelRef = React.useRef<RealtimeChannel | null>(null);
  const callbacksRef = React.useRef({
    onRefresh,
    onRefreshTrades,
    onInvalidateAnalytics,
  });

  callbacksRef.current = {
    onRefresh,
    onRefreshTrades,
    onInvalidateAnalytics,
  };

  const refreshAll = React.useCallback(() => {
    void callbacksRef.current.onRefresh();
    void callbacksRef.current.onRefreshTrades();
    if (activeTab === "analysis") {
      callbacksRef.current.onInvalidateAnalytics();
    }
  }, [activeTab]);

  const scheduleRefresh = React.useCallback(() => {
    clearTimeout(timeoutRef.current ?? undefined);
    timeoutRef.current = window.setTimeout(() => {
      refreshAll();
    }, REALTIME_DEBOUNCE_MS);
  }, [refreshAll]);

  const subscribe = React.useCallback(() => {
    if (!enabled || !userId) return;

    const supabase = getSupabaseClient();

    void supabase.auth.getSession().then(({ data }) => {
      void supabase.realtime.setAuth(data.session?.access_token ?? null);
    });

    const channel = supabase
      .channel(`trading-cockpit:${userId}:${mode}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "trades",
          filter: `user_id=eq.${userId}`,
        },
        () => scheduleRefresh(),
      )
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "trades",
          filter: `user_id=eq.${userId}`,
        },
        () => scheduleRefresh(),
      )
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "trading_sessions",
          filter: `user_id=eq.${userId}`,
        },
        () => scheduleRefresh(),
      )
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "trading_sessions",
          filter: `user_id=eq.${userId}`,
        },
        () => scheduleRefresh(),
      )
      .on(
        "postgres_changes",
        {
          event: "DELETE",
          schema: "public",
          table: "trading_sessions",
          filter: `user_id=eq.${userId}`,
        },
        () => scheduleRefresh(),
      )
      .subscribe((status) => {
        setIsSubscribed(status === "SUBSCRIBED");
      });

    channelRef.current = channel;
  }, [enabled, userId, mode, scheduleRefresh]);

  const unsubscribe = React.useCallback(() => {
    clearTimeout(timeoutRef.current ?? undefined);
    timeoutRef.current = null;

    const channel = channelRef.current;
    if (channel) {
      void getSupabaseClient().removeChannel(channel);
      channelRef.current = null;
      setIsSubscribed(false);
    }
  }, []);

  React.useEffect(() => {
    subscribe();

    const handleVisibility = () => {
      if (document.hidden) {
        unsubscribe();
      } else {
        subscribe();
      }
    };

    document.addEventListener("visibilitychange", handleVisibility);

    return () => {
      document.removeEventListener("visibilitychange", handleVisibility);
      unsubscribe();
    };
  }, [subscribe, unsubscribe]);

  return { isSubscribed };
}
