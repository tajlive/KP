"use client";

/**
 * AUTH CONTEXT — Sentralisert auth-state (single source of truth)
 *
 * Sikringer mot /user-polling-storm:
 * 1. Kun ÉN getUser() ved mount (via getSession)
 * 2. 5s failsafe som alltid setter loading=false
 * 3. Exponential backoff ved feil (2s → 60s, gi opp etter 5 forsøk)
 * 4. Debounce min. 30s på focus/visibilitychange-refresh
 * 5. Stopp ALL polling når document.hidden
 * 6. Rate-limited refreshUser() — kaster hvis kalt for tidlig
 * 7. Ingen per-komponent getUser() — alt går via AuthContext
 */

import {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  useCallback,
} from "react";
import { User } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/client";

// ─── Konstanter ──────────────────────────────────────────────────────────

/** Minimum tid (ms) mellom automatiske refresh-sjekker (focus/visibility) */
const FOCUS_DEBOUNCE_MS = 30_000;

/** Initielle backoff-ventetid (ms) ved feil */
const INITIAL_BACKOFF_MS = 2_000;

/** Maks backoff-ventetid (ms) */
const MAX_BACKOFF_MS = 60_000;

/** Maks antall backoff-forsøk før vi gir opp */
const MAX_BACKOFF_ATTEMPTS = 5;

/** Failsafe timeout (ms) — setter loading=false uansett */
const FAILSAFE_TIMEOUT_MS = 5_000;

/** Minimum tid (ms) mellom manuelle refreshUser()-kall */
const REFRESH_RATE_LIMIT_MS = 10_000;

// ─── Typer ───────────────────────────────────────────────────────────────

interface AuthContextType {
  user: User | null;
  loading: boolean;
  error: Error | null;
  signOut: () => Promise<void>;
  /** Rate-limited: kaster hvis kalt innenfor REFRESH_RATE_LIMIT_MS */
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  error: null,
  signOut: async () => {},
  refreshUser: async () => {},
});

// ─── Provider ────────────────────────────────────────────────────────────

export function AuthProvider({
  children,
  initialUser = null,
}: {
  children: React.ReactNode;
  /** Server-verifisert bruker — starter auth-state resolved (unngår SSR/client-mismatch) */
  initialUser?: User | null;
}) {
  const [user, setUser] = useState<User | null>(initialUser);
  const [loading, setLoading] = useState(!initialUser);
  const [error, setError] = useState<Error | null>(null);

  // Refs
  const initialFetchRef = useRef(false);
  const isMountedRef = useRef(true);
  const supabaseRef = useRef<ReturnType<typeof createClient> | null>(null);
  const backoffCountRef = useRef(0);
  const backoffTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const failsafeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastFocusRefreshRef = useRef(0);
  const lastManualRefreshRef = useRef(0);
  const isHiddenRef = useRef(false);
  const subscriptionRef = useRef<{ unsubscribe: () => void } | null>(null);

  // ─── Hjelpefunksjoner ─────────────────────────────────────────────────

  const clearTimers = useCallback(() => {
    if (backoffTimerRef.current) {
      clearTimeout(backoffTimerRef.current);
      backoffTimerRef.current = null;
    }
    if (failsafeTimerRef.current) {
      clearTimeout(failsafeTimerRef.current);
      failsafeTimerRef.current = null;
    }
  }, []);

  const resetBackoff = useCallback(() => {
    backoffCountRef.current = 0;
    clearTimers();
  }, [clearTimers]);

  /** Starter failsafe-timer: setter loading=false etter FAILSAFE_TIMEOUT_MS */
  const startFailsafe = useCallback(() => {
    if (failsafeTimerRef.current) clearTimeout(failsafeTimerRef.current);
    failsafeTimerRef.current = setTimeout(() => {
      if (isMountedRef.current) {
        setLoading(false);
      }
    }, FAILSAFE_TIMEOUT_MS);
  }, []);

  /** Hoved auth-init-funksjon — kalles ved mount og ved backoff-retry */
  const initAuth = useCallback(async () => {
    if (!isMountedRef.current) return;

    // Skip hvis vi allerede har server-verifisert bruker (initialUser)
    if (initialUser && backoffCountRef.current === 0) {
      setLoading(false);
      return;
    }

    // Skip hvis document er hidden (unntatt ved første mount)
    if (isHiddenRef.current && backoffCountRef.current > 0) return;

    try {
      const supabase = supabaseRef.current ?? createClient();
      supabaseRef.current = supabase;

      // Sjekk error-params i URL (hindrer infinite loop)
      const search =
        typeof window !== "undefined" ? window.location.search : "";
      if (
        search.includes("error=session_expired") ||
        search.includes("error=access_denied")
      ) {
        if (isMountedRef.current) {
          setUser(null);
          setLoading(false);
          setError(null);
        }
        resetBackoff();
        return;
      }

      const { data, error: sessionError } =
        await supabase.auth.getSession();
      if (!isMountedRef.current) return;

      if (sessionError) {
        // Invalid refresh token — clear session
        if (sessionError.message?.includes("Invalid Refresh Token")) {
          await supabase.auth.signOut();
          if (isMountedRef.current) {
            setUser(null);
            setError(null);
          }
          const locale =
            typeof window !== "undefined"
              ? window.location.pathname.split("/")[1] || "no"
              : "no";
          if (typeof window !== "undefined") {
            window.location.replace(`/${locale}/login?error=session_expired`);
          }
          setLoading(false);
          resetBackoff();
          return;
        }
        throw sessionError;
      }

      // Suksess — nullstill backoff og sett user
      setUser(data?.session?.user ?? null);
      resetBackoff();
    } catch (err) {
      if (!isMountedRef.current) return;

      const fetchError = err instanceof Error ? err : new Error(String(err));
      setError(fetchError);
      setUser(null);

      // Exponential backoff
      backoffCountRef.current += 1;
      if (backoffCountRef.current >= MAX_BACKOFF_ATTEMPTS) {
        // Gi opp — sett loading=false og ikke prøv igjen
        setLoading(false);
        console.warn(
          `[AuthContext] Ga opp etter ${MAX_BACKOFF_ATTEMPTS} forsøk:`,
          fetchError.message,
        );
        return;
      }

      const delay = Math.min(
        INITIAL_BACKOFF_MS * Math.pow(2, backoffCountRef.current - 1),
        MAX_BACKOFF_MS,
      );
      console.warn(
        `[AuthContext] Forsøk ${backoffCountRef.current}/${MAX_BACKOFF_ATTEMPTS} feilet. Backoff ${delay}ms:`,
        fetchError.message,
      );

      backoffTimerRef.current = setTimeout(() => {
        void initAuth();
      }, delay);
    } finally {
      if (isMountedRef.current) {
        setLoading(false);
      }
    }
  }, [resetBackoff, initialUser]);

  // ─── Focus/visibility lytt med debounce ──────────────────────────────

  const handleVisibilityChange = useCallback(() => {
    isHiddenRef.current = document.visibilityState === "hidden";

    if (document.visibilityState === "visible" && isMountedRef.current) {
      const now = Date.now();
      if (now - lastFocusRefreshRef.current < FOCUS_DEBOUNCE_MS) return;
      lastFocusRefreshRef.current = now;

      // Bare refresh hvis vi ikke er i backoff-loopen
      if (backoffCountRef.current === 0) {
        void initAuth();
      }
    }
  }, [initAuth]);

  const handleFocus = useCallback(() => {
    if (document.hidden) return; // Bruk visibilitychange i stedet

    const now = Date.now();
    if (now - lastFocusRefreshRef.current < FOCUS_DEBOUNCE_MS) return;
    lastFocusRefreshRef.current = now;

    if (backoffCountRef.current === 0) {
      // Ikke re-sett loading — gjør en stille refresh
      void initAuth();
    }
  }, [initAuth]);

  // ─── Mount-effekt ─────────────────────────────────────────────────────

  useEffect(() => {
    // Guard mot double-execution i Strict Mode
    if (initialFetchRef.current) return;
    initialFetchRef.current = true;

    isMountedRef.current = true;
    isHiddenRef.current =
      typeof document !== "undefined" && document.hidden;

    // Failsafe: set loading=false etter 5s uansett hva
    startFailsafe();

    // Initial auth-init
    void initAuth();

    // Lytt på auth state changes
    const supabase = supabaseRef.current ?? createClient();
    supabaseRef.current = supabase;
    const { data: subData } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        if (!isMountedRef.current) return;
        setUser(session?.user ?? null);
        if (session) {
          setError(null);
          resetBackoff();
        }
        setLoading(false);
      },
    );
    subscriptionRef.current = subData.subscription;

    // Focus/visibility-lyttere
    document.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("focus", handleFocus);

    return () => {
      isMountedRef.current = false;
      clearTimers();
      if (subscriptionRef.current) {
        subscriptionRef.current.unsubscribe();
        subscriptionRef.current = null;
      }
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("focus", handleFocus);
    };
  }, [initAuth, startFailsafe, handleVisibilityChange, handleFocus, resetBackoff, clearTimers]);

  // ─── Handlinger ───────────────────────────────────────────────────────

  const signOut = useCallback(async () => {
    const supabase = supabaseRef.current ?? createClient();
    await supabase.auth.signOut();
    setUser(null);
    setError(null);
    setLoading(false);
    resetBackoff();
  }, [resetBackoff]);

  const refreshUser = useCallback(async () => {
    const now = Date.now();
    if (now - lastManualRefreshRef.current < REFRESH_RATE_LIMIT_MS) {
      console.warn(
        `[AuthContext] refreshUser rate-limited — vent minst ${REFRESH_RATE_LIMIT_MS}ms`,
      );
      return;
    }
    lastManualRefreshRef.current = now;

    if (isHiddenRef.current) return; // Ikke refresh når skjult

    const supabase = supabaseRef.current ?? createClient();
    const { data: userData } = await supabase.auth.getUser();
    if (isMountedRef.current) {
      setUser(userData?.user ?? null);
    }
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading, error, signOut, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
}

// ─── Hooks ───────────────────────────────────────────────────────────────

export const useAuth = () => useContext(AuthContext);

/** Safe version som returnerer null hvis ikke i provider */
export const useAuthSafe = () => {
  try {
    return useContext(AuthContext);
  } catch {
    return {
      user: null,
      loading: false,
      error: null,
      signOut: async () => {},
      refreshUser: async () => {},
    };
  }
};
