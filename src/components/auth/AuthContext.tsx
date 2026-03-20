"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  ReactNode,
  useCallback,
  useRef,
} from "react";
import { useQueryClient } from "@tanstack/react-query";
import { createClient } from "@/lib/utils";
import { CONFIG_ERROR_MSG } from "@/lib/supabase/client";
import { Session, User, AuthError } from "@supabase/supabase-js";
import {
  clearAllSupabaseStorage,
  clearCorruptSupabaseKeysSync,
} from "@/lib/supabase/safe-storage";
import { queryKeys } from "@/lib/query-keys";

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signUp: (
    email: string,
    password: string,
    metadata?: { [key: string]: unknown },
  ) => Promise<{ error: Error | null; data: unknown }>;
  signOut: () => Promise<void>;
  refreshSession: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Lazy initialization - create client only when needed
let supabaseClient: ReturnType<typeof createClient> | null = null;

function getSupabaseClient() {
  if (!supabaseClient) {
    supabaseClient = createClient();
  }
  return supabaseClient;
}

// Exponential backoff configuration
const MAX_REFRESH_ATTEMPTS = 3;
const BACKOFF_DELAYS = [5000, 15000, 60000]; // 5s, 15s, 60s

/** Sjekk synkront om Supabase-env er satt — unngår at barn kaller createClient() før vi har fanget feil */
function checkSupabaseEnv(): boolean {
  if (typeof window === "undefined") return true; // Server: bruk server-klient
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  return !!(
    url &&
    key &&
    typeof url === "string" &&
    typeof key === "string" &&
    url.length >= 10 &&
    !url.includes("your-project") &&
    !key.includes("your_")
  );
}

export function AuthProvider({ children }: { children: ReactNode }) {
  // KRITISK: Rydd korrupte sb-*-nøkler FØR Supabase-klient opprettes (forhindrer "Invalid UTF-8 sequence")
  clearCorruptSupabaseKeysSync();

  const queryClient = useQueryClient();
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [configError, setConfigError] = useState<string | null>(null);

  // Refs for managing refresh state without triggering re-renders
  const refreshAttempts = useRef(0);
  const isRefreshing = useRef(false);
  const lastRefreshError = useRef<AuthError | null>(null);
  const refreshTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // KRITISK: Rydd alle korrupte Supabase-nøkler ved mount
  // Dette forhindrer infinite loops hvor Supabase reloader fra andre nøkler
  useEffect(() => {
    try {
      // Sjekk for korrupte nøkler - hvis funnet, ryd ALT og reload
      const keys = Object.keys(localStorage);
      let foundCorrupt = false;

      for (const key of keys) {
        if (
          key.startsWith("sb-") ||
          key.includes("supabase") ||
          key.includes("auth-token")
        ) {
          try {
            const val = localStorage.getItem(key);
            if (val) {
              // Test UTF-8 og JSON
              const enc = new TextEncoder().encode(val);
              new TextDecoder("utf-8", { fatal: true }).decode(enc);
              if (val.startsWith("{") || val.startsWith("[")) {
                JSON.parse(val);
              }
            }
          } catch {
            console.warn(`[AuthContext] Korrupt nøkkel funnet: ${key}`);
            foundCorrupt = true;
            break; // Avbryt loop, vi skal uansett rydde alt
          }
        }
      }

      if (foundCorrupt) {
        console.warn(
          "[AuthContext] Korrupt storage oppdaget, rydder alle nøkler (uten reload).",
        );
        clearAllSupabaseStorage({ skipReload: true });
      }
    } catch {
      // Ignore errors under initial sjekk
    }
  }, []);

  // Clear any pending refresh timeouts on unmount
  useEffect(() => {
    return () => {
      if (refreshTimeoutRef.current) {
        clearTimeout(refreshTimeoutRef.current);
      }
    };
  }, []);

  // Handle session refresh with exponential backoff
  const handleRefreshToken = useCallback(async () => {
    if (isRefreshing.current) return;

    isRefreshing.current = true;
    const supabase = getSupabaseClient();

    try {
      const { data, error } = await supabase.auth.refreshSession();

      if (error) {
        // Check for rate limit (429) or other auth errors
        const isRateLimit =
          error.status === 429 ||
          error.message?.includes("rate limit") ||
          error.message?.includes("too many requests");

        if (isRateLimit || error.status === 401 || error.status === 403) {
          lastRefreshError.current = error;
          refreshAttempts.current++;

          if (refreshAttempts.current >= MAX_REFRESH_ATTEMPTS) {
            // Max attempts reached - sign out and redirect
            console.error(
              "[AuthContext] Max refresh attempts reached, signing out",
            );
            await supabase.auth.signOut();
            setSession(null);
            setUser(null);

            // Redirect to login with expired session param
            if (typeof window !== "undefined") {
              window.location.href = "/innlogging?session=expired";
            }
            return;
          }

          // Schedule retry with exponential backoff
          const delay =
            BACKOFF_DELAYS[refreshAttempts.current - 1] ||
            BACKOFF_DELAYS[BACKOFF_DELAYS.length - 1];
          console.log(
            `[AuthContext] Refresh failed, retrying in ${delay}ms (attempt ${refreshAttempts.current}/${MAX_REFRESH_ATTEMPTS})`,
          );

          if (refreshTimeoutRef.current) {
            clearTimeout(refreshTimeoutRef.current);
          }

          refreshTimeoutRef.current = setTimeout(() => {
            isRefreshing.current = false;
            handleRefreshToken();
          }, delay);
          return;
        }

        // Other errors - just log and reset
        console.error("[AuthContext] Refresh error:", error);
        setSession(null);
        setUser(null);
      } else {
        // Success - reset attempts and update state
        refreshAttempts.current = 0;
        lastRefreshError.current = null;
        setSession(data.session);
        setUser(data.session?.user ?? null);
      }
    } catch (err) {
      console.error("[AuthContext] Unexpected refresh error:", err);
      setSession(null);
      setUser(null);
    } finally {
      isRefreshing.current = false;
    }
  }, []);

  useEffect(() => {
    let mounted = true;
    let supabase: ReturnType<typeof createClient>;
    try {
      supabase = getSupabaseClient();
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      const isConfigError =
        msg === CONFIG_ERROR_MSG ||
        msg.includes("URL and API key") ||
        msg.includes("required to create a Supabase client");
      if (isConfigError) {
        setConfigError(CONFIG_ERROR_MSG);
        setLoading(false);
        return;
      }
      throw err;
    }

    // Check existing session on mount with corrupt token handling
    const initAuth = async () => {
      try {
        const {
          data: { session },
          error,
        } = await supabase.auth.getSession();

        if (!mounted) return;

        if (error) {
          console.warn("[AuthContext] Session error:", error.message);
          // KRITISK: Rens ALLE Supabase-nøkler, ikke bare spesifikke
          clearAllSupabaseStorage();
          // clearAllSupabaseStorage gjør window.location.reload()
        } else {
          if (mounted) {
            setSession(session);
            setUser(session?.user ?? null);
          }
        }
      } catch (err) {
        // Invalid UTF-8 eller annen storage-korrupsjon – rense UTEN reload for å unngå loop
        console.warn("[AuthContext] Korrupt auth-storage:", err);
        if (mounted) {
          clearAllSupabaseStorage({ skipReload: true });
          setSession(null);
          setUser(null);
        }
      } finally {
        if (mounted) setLoading(false);
      }
    };

    initAuth();

    // Listen for auth state changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (!mounted) return;

      if (event === "TOKEN_REFRESHED") {
        // Reset attempts on successful refresh
        refreshAttempts.current = 0;
        lastRefreshError.current = null;
      }

      if (event === "SIGNED_OUT") {
        // Clear all state on sign out
        refreshAttempts.current = 0;
        lastRefreshError.current = null;
        if (refreshTimeoutRef.current) {
          clearTimeout(refreshTimeoutRef.current);
        }
        queryClient.removeQueries({ queryKey: queryKeys.all });
      } else if (event === "SIGNED_IN" || event === "TOKEN_REFRESHED") {
        queryClient.invalidateQueries({ queryKey: queryKeys.profile(null) });
        queryClient.invalidateQueries({ queryKey: queryKeys.tier(null) });
        queryClient.invalidateQueries({
          queryKey: queryKeys.tradingSessions(null),
        });
      }

      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const signIn = useCallback(async (email: string, password: string) => {
    const supabase = getSupabaseClient();

    // Reset refresh attempts on new sign in
    refreshAttempts.current = 0;
    lastRefreshError.current = null;

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    return { error };
  }, []);

  const signUp = useCallback(
    async (
      email: string,
      password: string,
      metadata?: { [key: string]: unknown },
    ) => {
      const supabase = getSupabaseClient();
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: metadata,
        },
      });
      return { data, error };
    },
    [],
  );

  const signOut = useCallback(async () => {
    const supabase = getSupabaseClient();

    // Clear refresh state
    refreshAttempts.current = 0;
    lastRefreshError.current = null;
    if (refreshTimeoutRef.current) {
      clearTimeout(refreshTimeoutRef.current);
    }

    await supabase.auth.signOut();
    setUser(null);
    setSession(null);
  }, []);

  const refreshSession = useCallback(async () => {
    await handleRefreshToken();
  }, [handleRefreshToken]);

  const value = {
    user,
    session,
    loading,
    signIn,
    signUp,
    signOut,
    refreshSession,
  };

  if (configError || !checkSupabaseEnv()) {
    return (
      <div
        role="alert"
        className="flex min-h-[200px] flex-col items-center justify-center gap-4 bg-zinc-950 p-6 text-center text-zinc-300"
      >
        <h2 className="text-lg font-semibold text-zinc-100">
          Konfigurasjonsfeil
        </h2>
        <p className="max-w-md text-sm">{configError ?? CONFIG_ERROR_MSG}</p>
        <p className="text-xs text-zinc-500">
          Lokalt: sjekk .env.local. Vercel: Project Settings → Environment
          Variables. Variablene må være tilgjengelige ved byggetid.
        </p>
      </div>
    );
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth må brukes innenfor AuthProvider");
  }
  return context;
}

/**
 * Safe version of useAuth that returns null instead of throwing
 * when used outside AuthProvider. Useful for optional auth checks.
 */
export function useAuthSafe() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    return null;
  }
  return context;
}
