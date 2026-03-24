"use client";

import { reportTradingIntegrityPollFailure } from "@/lib/sentry";
import {
  TRADING_INTEGRITY_SYNC,
  tradesPollIntervalAfterFailures,
} from "@/lib/trading/trading-integrity-sync";
import { getRecentTrades, type Trade } from "@/lib/trading-api";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

export type UseDashboardTradingIntegritySyncOptions = {
  userId: string;
  enabled?: boolean;
  tradeLimit?: number;
  /** Erstatt lokal handelsliste med fersk snapshot fra DB */
  onTradesSnapshot: (trades: Trade[]) => void;
};

/**
 * Synkroniserer dashboard med sann tilstand når:
 * - Realtime er nede / JWT ikke propagert
 * - Bruker bytter fane (visibility + focus)
 * - Periodisk poll + lett RSC-refresh for saldo og `trading_sessions`
 */
export function useDashboardTradingIntegritySync({
  userId,
  enabled = true,
  tradeLimit = TRADING_INTEGRITY_SYNC.defaultTradeLimit,
  onTradesSnapshot,
}: UseDashboardTradingIntegritySyncOptions): {
  refreshTradesNow: () => Promise<void>;
  refreshServerProps: () => void;
  tradesPollFailed: boolean;
} {
  const router = useRouter();
  const snapshotRef = useRef(onTradesSnapshot);
  snapshotRef.current = onTradesSnapshot;
  const [tradesPollFailed, setTradesPollFailed] = useState(false);
  const [pollCycleFailures, setPollCycleFailures] = useState(0);
  const tradesPollMs = useMemo(
    () => tradesPollIntervalAfterFailures(pollCycleFailures),
    [pollCycleFailures],
  );
  const mounted = useRef(true);

  const refreshServerProps = useCallback(() => {
    try {
      router.refresh();
    } catch {
      /* noop */
    }
  }, [router]);

  const refreshTradesNow = useCallback(async () => {
    if (!enabled || !userId) return;
    try {
      const rows = await getRecentTrades({ limit: tradeLimit });
      if (!mounted.current) return;
      setPollCycleFailures(0);
      setTradesPollFailed(false);
      snapshotRef.current(rows);
    } catch {
      if (!mounted.current) return;
      setPollCycleFailures((f) => f + 1);
      setTradesPollFailed(true);
      reportTradingIntegrityPollFailure({
        hook: "useDashboardTradingIntegritySync",
        surface: "dashboard",
      });
    }
  }, [enabled, userId, tradeLimit]);

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  useEffect(() => {
    if (!enabled || !userId) return;

    let tradesTimer: ReturnType<typeof setInterval> | null = null;
    let rscTimer: ReturnType<typeof setInterval> | null = null;
    let focusTimer: ReturnType<typeof setTimeout> | null = null;

    const visible = () =>
      typeof document === "undefined" || document.visibilityState === "visible";

    const tickTrades = () => {
      if (!visible()) return;
      void refreshTradesNow();
    };

    const tickRsc = () => {
      if (!visible()) return;
      refreshServerProps();
    };

    const startIntervals = () => {
      if (tradesTimer) clearInterval(tradesTimer);
      if (rscTimer) clearInterval(rscTimer);
      tradesTimer = setInterval(tickTrades, tradesPollMs);
      rscTimer = setInterval(
        tickRsc,
        TRADING_INTEGRITY_SYNC.rscRefreshIntervalMs,
      );
    };

    const stopIntervals = () => {
      if (tradesTimer) {
        clearInterval(tradesTimer);
        tradesTimer = null;
      }
      if (rscTimer) {
        clearInterval(rscTimer);
        rscTimer = null;
      }
    };

    void refreshTradesNow();
    startIntervals();

    const onVisibility = () => {
      if (document.visibilityState === "visible") {
        void refreshTradesNow();
        refreshServerProps();
        startIntervals();
      } else {
        stopIntervals();
      }
    };

    const onFocus = () => {
      if (focusTimer) clearTimeout(focusTimer);
      focusTimer = setTimeout(() => {
        void refreshTradesNow();
        refreshServerProps();
      }, TRADING_INTEGRITY_SYNC.focusDebounceMs);
    };

    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener("focus", onFocus);

    return () => {
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("focus", onFocus);
      stopIntervals();
      if (focusTimer) clearTimeout(focusTimer);
    };
  }, [enabled, userId, refreshTradesNow, refreshServerProps, tradesPollMs]);

  return {
    refreshTradesNow,
    refreshServerProps,
    tradesPollFailed,
  };
}
