/**
 * React Query Configuration
 * Setup TanStack Query with optimal defaults
 */

import { QueryClient, DefaultOptions } from '@tanstack/react-query';

// ============================================================
// DEFAULT QUERY OPTIONS
// ============================================================

const queryConfig: DefaultOptions = {
  queries: {
    // Stale time: 5 minutes (data is fresh for 5 min)
    staleTime: 5 * 60 * 1000,

    // Cache time: 10 minutes (keep data in cache for 10 min)
    gcTime: 10 * 60 * 1000,

    // Retry failed queries 3 times with exponential backoff
    retry: 3,
    retryDelay: (attemptIndex) =>
      Math.min(1000 * 2 ** attemptIndex, 30000),

    // Refetch in background when window regains focus
    refetchOnWindowFocus: true,

    // Refetch when connection is restored
    refetchOnReconnect: true,

    // Don't refetch on mount if data is fresh
    refetchOnMount: false,
  },
  mutations: {
    // Retry mutations once on failure (network errors)
    retry: 1,
    retryDelay: 1000,
  },
};

// ============================================================
// CREATE QUERY CLIENT
// ============================================================

export const queryClient = new QueryClient({
  defaultOptions: queryConfig,
});

export default queryClient;
