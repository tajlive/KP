'use client';

import { useAuth } from '@/components/auth/AuthContext';

/**
 * Simple hook to get current user info
 * Re-exports from useAuth for compatibility
 */
export function useUser() {
  const auth = useAuth();
  return {
    user: auth.user,
    loading: auth.loading,
    isAuthenticated: !!auth.user,
  };
}
