"use client";

import { useEffect, useState } from "react";
import { useIsMobile } from "@/hooks/use-mobile";

export type ActiveTraderSession = {
  mode?: "paper" | "live" | string | null;
};

/**
 * Henter aktive trading-sesjoner for innlogget bruker via server-ruten
 * (aldri direkte fra nettleseren mot Supabase/Edge Functions).
 * Poller sjeldnere på mobil og refetcher ved fokus / status-eventer.
 */
export function useActiveTraderSessions(): ActiveTraderSession[] {
  const [sessions, setSessions] = useState<ActiveTraderSession[]>([]);
  const isMobile = useIsMobile();

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      try {
        const response = await fetch("/api/trading/sessions?status=active", {
          cache: "no-store",
        });
        if (!response.ok) {
          if (!cancelled) setSessions([]);
          return;
        }

        const payload = (await response.json()) as {
          sessions?: ActiveTraderSession[];
        };
        if (!cancelled) setSessions(payload.sessions ?? []);
      } catch {
        if (!cancelled) setSessions([]);
      }
    };

    const onFocusOrChange = () => {
      void load();
    };

    void load();
    const interval = window.setInterval(load, isMobile ? 60_000 : 30_000);
    window.addEventListener("focus", onFocusOrChange);
    window.addEventListener("klarpakke:trader-status-changed", onFocusOrChange);

    return () => {
      cancelled = true;
      window.clearInterval(interval);
      window.removeEventListener("focus", onFocusOrChange);
      window.removeEventListener(
        "klarpakke:trader-status-changed",
        onFocusOrChange,
      );
    };
  }, [isMobile]);

  return sessions;
}
