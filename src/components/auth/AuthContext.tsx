'use client';

import { createContext, useContext, useEffect, useState, ReactNode, useCallback } from 'react';
import { createClient } from '@/lib/utils';
import { Session, User } from '@supabase/supabase-js';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signUp: (email: string, password: string, metadata?: { [key: string]: unknown }) => Promise<{ error: Error | null; data: unknown }>;
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

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
    
    const supabase = getSupabaseClient();
    
    // Check existing session on mount
    const initAuth = async () => {
      try {
        // First try getUser for verified auth state
        const { data: { user }, error: userError } = await supabase.auth.getUser();
        
        if (!userError && user) {
          // User is authenticated, now get session
          const { data: { session } } = await supabase.auth.getSession();
          setSession(session);
          setUser(user);
        } else {
          setSession(null);
          setUser(null);
        }
      } catch (err) {
        console.error('[AuthContext] Error initializing auth:', err);
        setSession(null);
        setUser(null);
      } finally {
        setLoading(false);
      }
    };

    initAuth();

    // Listen for auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        setLoading(false);
      }
    );

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const signIn = useCallback(async (email: string, password: string) => {
    const supabase = getSupabaseClient();
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    return { error };
  }, []);

  const signUp = useCallback(async (email: string, password: string, metadata?: { [key: string]: unknown }) => {
    const supabase = getSupabaseClient();
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: metadata,
      },
    });
    return { data, error };
  }, []);

  const signOut = useCallback(async () => {
    const supabase = getSupabaseClient();
    await supabase.auth.signOut();
    setUser(null);
    setSession(null);
  }, []);

  const refreshSession = useCallback(async () => {
    const supabase = getSupabaseClient();
    try {
      const { data: { user }, error } = await supabase.auth.getUser();
      if (!error && user) {
        const { data: { session } } = await supabase.auth.getSession();
        setSession(session);
        setUser(user);
      } else {
        setSession(null);
        setUser(null);
      }
    } catch (err) {
      console.error('[AuthContext] Error refreshing session:', err);
      setSession(null);
      setUser(null);
    }
  }, []);

  // During SSR, always render children without throwing
  // The loading state will be resolved on client-side
  const value = {
    user,
    session,
    loading,
    signIn,
    signUp,
    signOut,
    refreshSession,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth må brukes innenfor AuthProvider');
  }
  return context;
}

// Safe hook that returns null instead of throwing (for optional auth usage)
export function useAuthSafe() {
  const context = useContext(AuthContext);
  return context ?? null;
}
