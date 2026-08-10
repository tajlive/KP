"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth/new/AuthContext";

/**
 * Server-verifisert brukerfallback (QA P1, 2026-08-10).
 *
 * Klient-AuthContext er ofte null i prod fordi sesjonen lever i
 * HttpOnly-cookies som ikke leses klient-side. Komponenter som stoler
 * blindt på konteksten viser da gjeste-UI («Logg inn / Start gratis»)
 * til INNLOGGEDE brukere.
 *
 * Denne hooken prøver konteksten først, og faller tilbake til
 * server-verifisert /api/auth/me når konteksten er ferdig lastet
 * uten bruker. Returnerer { user, loading } — loading er true til
 * vi VET om brukeren er innlogget (aldri gjett gjest for tidlig).
 */
export function useServerVerifiedUser() {
  const { user: contextUser, loading: contextLoading } = useAuth();
  const [serverUser, setServerUser] = useState<{
    id: string;
    email: string;
  } | null>(null);
  const [serverChecked, setServerChecked] = useState(false);

  useEffect(() => {
    if (contextLoading || contextUser) {
      setServerChecked(true);
      return;
    }
    let cancelled = false;
    fetch("/api/auth/me", { credentials: "include" })
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (!cancelled && data?.user) setServerUser(data.user);
      })
      .catch(() => {
        /* 401/nettverksfeil → faktisk utlogget */
      })
      .finally(() => {
        if (!cancelled) setServerChecked(true);
      });
    return () => {
      cancelled = true;
    };
  }, [contextLoading, contextUser]);

  return {
    user: contextUser ?? serverUser,
    loading: contextLoading || (!contextUser && !serverChecked),
  };
}
