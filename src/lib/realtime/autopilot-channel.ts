/**
 * Supabase Realtime — autopilot state subscriptions.
 *
 * Abonnerer på autopilot_state-endringer for en gitt bruker.
 * Når pg_cron/orchestrator oppdaterer state, får klienten sanntidsoppdatering
 * uten polling.
 *
 * Bruk:
 *   const { state, isLive } = useAutopilotRealtime(userId);
 *
 * Krav: Supabase Realtime må være aktivert i Dashboard →
 *   Database → Replication → Enable på 'autopilot_state' tabellen.
 */

import { useEffect, useState, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import type { AutopilotStateRow } from "@/lib/trading/autopilot/orchestrator";

interface RealtimeState {
  state: AutopilotStateRow | null;
  isLive: boolean;
  lastUpdate: Date | null;
  error: string | null;
}

/** Konverter Supabase JSON-rad til AutopilotStateRow */
function coerceState(raw: Record<string, unknown>): AutopilotStateRow {
  return {
    ...raw,
    grid_levels: (raw.grid_levels ?? {}) as AutopilotStateRow["grid_levels"],
  } as AutopilotStateRow;
}

export function useAutopilotRealtime(
  userId: string | undefined,
): RealtimeState {
  const [state, setState] = useState<AutopilotStateRow | null>(null);
  const [isLive, setIsLive] = useState(false);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
  const [error, setError] = useState<string | null>(null);

  const fetchInitial = useCallback(async () => {
    if (!userId) return;
    try {
      const supabase = createClient();
      const { data } = await supabase
        .from("autopilot_state")
        .select("*")
        .eq("user_id", userId)
        .single();

      if (data) {
        setState(coerceState(data));
        setLastUpdate(new Date());
      }
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Kunne ikke hente autopilot state",
      );
    }
  }, [userId]);

  useEffect(() => {
    if (!userId) return;

    const supabase = createClient();

    // Hent initial state
    fetchInitial();

    // Abonner på sanntidsendringer
    const channel = supabase
      .channel(`autopilot-${userId}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "autopilot_state",
          filter: `user_id=eq.${userId}`,
        },
        (payload) => {
          setState(coerceState(payload.new as Record<string, unknown>));
          setLastUpdate(new Date());
          setIsLive(true);
        },
      )
      .subscribe((status) => {
        if (status === "SUBSCRIBED") {
          setIsLive(true);
        } else if (status === "CHANNEL_ERROR") {
          setError("Realtime-tilkobling feilet");
          setIsLive(false);
        }
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId, fetchInitial]);

  return { state, isLive, lastUpdate, error };
}
