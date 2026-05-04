"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { getSupabaseClient } from "@/lib/supabase/client";
import {
  getActiveStrategies,
  getPortfolio,
  getRecentTrades,
  mergeTradeIntoList,
  subscribeToTrades,
  type Portfolio,
  type Trade,
  type TradingMode,
  type UserStrategy,
} from "@/lib/trading-api";
import { TRADING_INTEGRITY_SYNC } from "@/lib/trading/trading-integrity-sync";

function hasLocalSetup(userId: string): boolean {
  if (typeof window === "undefined") return false;
  return localStorage.getItem(`auto-trading-setup-${userId}`) === "completed";
}

interface UseDashboardDataOptions {
  mode: TradingMode;
  userId: string | null;
  initialPortfolio?: Portfolio | null;
  initialTrades?: Trade[];
  initialStrategies?: UserStrategy[];
}

interface UseDashboardDataResult {
  portfolio: Portfolio | null;
  trades: Trade[];
  activeStrategies: UserStrategy[];
  loading: boolean;
  showWizard: boolean;
  setShowWizard: (v: boolean) => void;
  loadData: () => Promise<void>;
  refreshAfterTrade: () => void;
}

export function useDashboardData({
  mode,
  userId,
  initialPortfolio,
  initialTrades,
  initialStrategies,
}: UseDashboardDataOptions): UseDashboardDataResult {
  const [portfolio, setPortfolio] = useState<Portfolio | null>(
    initialPortfolio ?? null,
  );
  const [trades, setTrades] = useState<Trade[]>(initialTrades ?? []);
  const [activeStrategies, setActiveStrategies] = useState<UserStrategy[]>(
    initialStrategies ?? [],
  );
  const [loading, setLoading] = useState(!initialPortfolio);
  const [showWizard, setShowWizard] = useState(false);
  const modeRef = useRef(mode);
  modeRef.current = mode;

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const [port, trd, active] = await Promise.all([
        getPortfolio(mode),
        getRecentTrades({ limit: 100 }),
        getActiveStrategies(mode),
      ]);
      setPortfolio(port);
      setTrades(trd);
      setActiveStrategies(active);

      if (userId && active.length === 0 && !hasLocalSetup(userId)) {
        const sb = getSupabaseClient();
        const { data: progress } = await sb
          .from("onboarding_progress")
          .select("is_completed")
          .eq("user_id", userId)
          .maybeSingle();
        if (!progress?.is_completed) {
          setShowWizard(true);
        } else {
          localStorage.setItem(`auto-trading-setup-${userId}`, "completed");
        }
      }
    } catch (err) {
      console.error("[useDashboardData] Failed to load data:", err);
      // Keep previous data on error to avoid blank screen
    } finally {
      setLoading(false);
    }
  }, [mode, userId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const portfolioRefreshTimerRef = useRef<ReturnType<typeof setTimeout> | null>(
    null,
  );
  const refreshAfterTrade = useCallback(() => {
    if (portfolioRefreshTimerRef.current) {
      clearTimeout(portfolioRefreshTimerRef.current);
    }
    portfolioRefreshTimerRef.current = setTimeout(() => {
      portfolioRefreshTimerRef.current = null;
      void (async () => {
        try {
          const m = modeRef.current;
          const [port, active] = await Promise.all([
            getPortfolio(m),
            getActiveStrategies(m),
          ]);
          setPortfolio(port);
          setActiveStrategies(active);
        } catch (e) {
          console.error("[useDashboardData] Refresh after trade failed:", e);
        }
      })();
    }, 400);
  }, []);

  useEffect(() => {
    if (!userId) {
      const getUser = async () => {
        const supabase = getSupabaseClient();
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (user) {
          void loadData();
        }
      };
      getUser();
      return;
    }

    const unsubscribe = subscribeToTrades(null, userId, (newTrade) => {
      setTrades((prev) => mergeTradeIntoList(prev, newTrade));
      if (newTrade.mode === modeRef.current) {
        refreshAfterTrade();
      }
    });

    return () => {
      if (portfolioRefreshTimerRef.current) {
        clearTimeout(portfolioRefreshTimerRef.current);
        portfolioRefreshTimerRef.current = null;
      }
      unsubscribe();
    };
  }, [userId, refreshAfterTrade, loadData]);

  useEffect(() => {
    if (!userId) return;
    let iv: ReturnType<typeof setInterval> | null = null;

    const poll = async () => {
      if (
        typeof document !== "undefined" &&
        document.visibilityState === "hidden"
      ) {
        return;
      }
      try {
        const rows = await getRecentTrades({ limit: 50 });
        setTrades(rows);
        const m = modeRef.current;
        const [port, active] = await Promise.all([
          getPortfolio(m),
          getActiveStrategies(m),
        ]);
        setPortfolio(port);
        setActiveStrategies(active);
      } catch (e) {
        console.error("[useDashboardData] Poll failed:", e);
      }
    };

    const start = () => {
      if (iv) clearInterval(iv);
      void poll();
      iv = setInterval(
        () => void poll(),
        TRADING_INTEGRITY_SYNC.tradesPollIntervalMs,
      );
    };

    const stop = () => {
      if (iv) {
        clearInterval(iv);
        iv = null;
      }
    };

    const onVis = () => {
      if (document.visibilityState === "visible") start();
      else stop();
    };

    start();
    document.addEventListener("visibilitychange", onVis);
    return () => {
      document.removeEventListener("visibilitychange", onVis);
      stop();
    };
  }, [userId]);

  return {
    portfolio,
    trades,
    activeStrategies,
    loading,
    showWizard,
    setShowWizard,
    loadData,
    refreshAfterTrade,
  };
}
