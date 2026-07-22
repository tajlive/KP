"use client";

import { useEffect, useState } from "react";
import { getSupabaseClient } from "@/lib/supabase/client";

const HISTORY_VIEWED_KEY = "kp_history_viewed";

export interface OnboardingState {
  /** Antall paper-trades brukeren har (ekte data fra trades-tabellen) */
  tradeCount: number;
  /** Om brukeren har åpnet historikk-siden minst én gang (localStorage-flagg) */
  hasViewedHistory: boolean;
  isLoading: boolean;
}

/**
 * Datagrunnlag for OnboardingChecklist. Bruker kun verifiserte kolonner
 * (trades.user_id, trades.mode — se regenererte database-typer).
 * Ref .hermes/plans/2026-07-22_225030-ny-bruker-reise.md (Task 3).
 */
export function useOnboardingState(userId: string | null): OnboardingState {
  const [tradeCount, setTradeCount] = useState(0);
  const [hasViewedHistory, setHasViewedHistory] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // localStorage er kun tilgjengelig i browser — derfor i effect
    setHasViewedHistory(
      typeof window !== "undefined" &&
        window.localStorage.getItem(HISTORY_VIEWED_KEY) === "1",
    );

    if (!userId) {
      setIsLoading(false);
      return;
    }

    let cancelled = false;
    const supabase = getSupabaseClient();
    supabase
      .from("trades")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId)
      .eq("mode", "paper")
      .then(({ count }) => {
        if (!cancelled) {
          setTradeCount(count ?? 0);
          setIsLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [userId]);

  return { tradeCount, hasViewedHistory, isLoading };
}
