'use client';

import { createContext, useContext, useEffect, useState, ReactNode, useCallback, useRef } from 'react';
import { createClient } from '@/lib/utils';
import { Session, User, AuthError } from '@supabase/supabase-js';

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

// Exponential backoff configuration
const MAX_REFRESH_ATTEMPTS = 3;
const BACKOFF_DELAYS = [5000, 15000, 60000]; // 5s, 15s, 60s

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  
  // Refs for managing refresh state without triggering re-renders
  const refreshAttempts = useRef(0);
  const isRefreshing = useRef(false);
  const lastRefreshError = useRef<AuthError | null>(null);
  const refreshTimeoutRef = useRef<NodeJS.Timeout | null>(null);

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
        const isRateLimit = error.status === 429 || 
                           error.message?.includes('rate limit') ||
                           error.message?.includes('too many requests');
        
        if (isRateLimit || error.status === 401 || error.status === 403) {
          lastRefreshError.current = error;
          refreshAttempts.current++;
          
          if (refreshAttempts.current >= MAX_REFRESH_ATTEMPTS) {
            // Max attempts reached - sign out and redirect
            console.error('[AuthContext] Max refresh attempts reached, signing out');
            await supabase.auth.signOut();
            setSession(null);
            setUser(null);
            
            // Redirect to login with expired session param
            if (typeof window !== 'undefined') {
              window.location.href = '/innlogging?session=expired';
            }
            return;
          }
          
          // Schedule retry with exponential backoff
          const delay = BACKOFF_DELAYS[refreshAttempts.current - 1] || BACKOFF_DELAYS[BACKOFF_DELAYS.length - 1];
          console.log(`[AuthContext] Refresh failed, retrying in ${delay}ms (attempt ${refreshAttempts.current}/${MAX_REFRESH_ATTEMPTS})`);
          
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
        console.error('[AuthContext] Refresh error:', error);
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
      console.error('[AuthContext] Unexpected refresh error:', err);
      setSession(null);
      setUser(null);
    } finally {
      isRefreshing.current = false;
    }
  }, []);

  useEffect(() => {
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
      async (event, session) => {
        if (event === 'TOKEN_REFRESHED') {
          // Reset attempts on successful refresh
          refreshAttempts.current = 0;
          lastRefreshError.current = null;
        }
        
        if (event === 'SIGNED_OUT') {
          // Clear all state on sign out
          refreshAttempts.current = 0;
          lastRefreshError.current = null;
          if (refreshTimeoutRef.current) {
            clearTimeout(refreshTimeoutRef.current);
          }
        }
        
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
    
    // Reset refresh attempts on new sign in
    refreshAttempts.current = 0;
    lastRefreshError.current = null;
    
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
