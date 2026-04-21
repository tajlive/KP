'use client';

import { useEffect, useState, useCallback } from 'react';
import { getSupabaseClient } from './supabase/client';

/**
 * Hook for å hente signaler med real-time updates
 */
export function useSignals(filter?: { status?: string; direction?: string }) {
  const [signals, setSignals] = useState<unknown[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchSignals = useCallback(async () => {
    try {
      setIsLoading(true);
      const supabase = getSupabaseClient();
      let query = supabase.from('signals').select('*');

      if (filter?.status) {
        query = query.eq('status', filter.status);
      }

      if (filter?.direction) {
        query = query.eq('direction', filter.direction);
      }

      const { data, error: fetchError } = await query.order('created_at', {
        ascending: false,
      });

      if (fetchError) throw fetchError;
      setSignals(data || []);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch signals');
    } finally {
      setIsLoading(false);
    }
  }, [filter]);

  useEffect(() => {
    fetchSignals();
  }, [fetchSignals]);

  // Real-time subscription
  useEffect(() => {
    const supabase = getSupabaseClient();
    const channel = supabase
      .channel('signals-realtime')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'signals' },
        () => {
          fetchSignals(); // Refetch when data changes
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchSignals]);

  return { signals, isLoading, error, refetch: fetchSignals };
}

/**
 * Hook for håndtering av async-operasjoner
 */
export function useAsync<T>(
  callback: () => Promise<T>,
  immediate = true
) {
  const [state, setState] = useState<{
    status: 'idle' | 'pending' | 'success' | 'error';
    data: T | null;
    error: Error | null;
  }>({
    status: 'idle',
    data: null,
    error: null,
  });

  const execute = useCallback(async () => {
    setState({ status: 'pending', data: null, error: null });
    try {
      const result = await callback();
      setState({ status: 'success', data: result, error: null });
      return result;
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      setState({ status: 'error', data: null, error: err });
      throw err;
    }
  }, [callback]);

  useEffect(() => {
    if (immediate) {
      execute();
    }
  }, [execute, immediate]);

  return { ...state, execute };
}
