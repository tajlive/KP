"use client";

import { useEffect, useState } from "react";

const HISTORY_VIEWED_KEY = "kp_history_viewed";

export interface OnboardingFlags {
  /** Om brukeren har åpnet historikk-siden minst én gang (localStorage-flagg) */
  hasViewedHistory: boolean;
}

/**
 * Klient-flagg for OnboardingChecklist. tradeCount kommer fra forelderen
 * (dashboard-metrikker via server) — browser Supabase-klienten er ikke
 * pålitelig for auth-spørringer i denne flaten (DashboardClient omgår den
 * bevisst). Derfor kun localStorage-flagg her.
 * Ref .hermes/plans/2026-07-22_225030-ny-bruker-reise.md (Task 3).
 */
export function useOnboardingFlags(): OnboardingFlags {
  const [hasViewedHistory, setHasViewedHistory] = useState(false);

  useEffect(() => {
    // localStorage er kun tilgjengelig i browser — derfor i effect
    setHasViewedHistory(
      window.localStorage.getItem(HISTORY_VIEWED_KEY) === "1",
    );
  }, []);

  return { hasViewedHistory };
}
