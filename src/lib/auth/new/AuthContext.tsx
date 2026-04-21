"use client";

/**
 * NY AUTH CONTEXT - Forenklet, robust
 * 
 * Prinsipper:
 * 1. Bruk standard Supabase SSR
 * 2. Ingen custom cookie-håndtering
 * 3. Enkel state: user, loading, error
 * 4. Ingen dobbel klient-opprettelse
 */

import { createContext, useContext, useEffect, useRef, useState } from "react";
import { User } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/client";

interface AuthContextType {
  user: User | null;
  loading: boolean;
  error: Error | null;
  signOut: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  error: null,
  signOut: async () => {},
  refreshUser: async () => {},
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const initialFetchRef = useRef(false);

  useEffect(() => {
    // Guard against double-execution in React Strict Mode
    if (initialFetchRef.current) return;
    initialFetchRef.current = true;

    const supabase = createClient();
    let isMounted = true;

    // Hent initial session (getSession refreshes expired tokens, getUser does not)
    const initAuth = async () => {
      try {
        const { data: { session }, error } = await supabase.auth.getSession();
        if (!isMounted) return;
        if (error) throw error;
        setUser(session?.user ?? null);
      } catch (err) {
        if (!isMounted) return;
        setError(err instanceof Error ? err : new Error(String(err)));
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    initAuth();

    // Lytt på auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        if (!isMounted) return;
        setUser(session?.user ?? null);
        setLoading(false);
      }
    );

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const signOut = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    setUser(null);
  };

  const refreshUser = async () => {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    setUser(user);
  };

  return (
    <AuthContext.Provider value={{ user, loading, error, signOut, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);

// Safe version that returns null if not in provider (for optional auth)
export const useAuthSafe = () => {
  try {
    return useContext(AuthContext);
  } catch {
    return { user: null, loading: false, error: null, signOut: async () => {}, refreshUser: async () => {} };
  }
};
