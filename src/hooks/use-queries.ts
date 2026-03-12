/**
 * Custom React Query Hooks
 * Encapsulate Supabase queries with automatic caching
 */

'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { createClient } from '@/lib/utils';
import { handleSupabaseError, logger } from '@/lib/error-handling';

// ============================================================
// QUERY KEYS (for cache management)
// ============================================================

export const queryKeys = {
  // Profiles
  profile: (id: string) => ['profile', id],
  profiles: () => ['profiles'],
  profileStats: (id: string) => ['profile', id, 'stats'],

  // Trades
  trades: (userId: string) => ['trades', userId],
  trade: (id: string) => ['trade', id],
  tradeStats: (userId: string) => ['trades', userId, 'stats'],
  openTrades: (userId: string) => ['trades', userId, 'open'],

  // Beta Applications
  betaApplications: () => ['beta-applications'],
  betaApplication: (userId: string) => ['beta-application', userId],

  // Chart Signals
  chartSignals: (symbol: string) => ['chart-signals', symbol],
  recentSignals: () => ['chart-signals', 'recent'],

  // Subscriptions
  subscription: (userId: string) => ['subscription', userId],
  subscriptions: () => ['subscriptions'],

  // Learning Progress
  learningProgress: (userId: string) => ['learning-progress', userId],
  courseProgress: (userId: string, courseId: string) => [
    'learning-progress',
    userId,
    courseId,
  ],

  // Notifications
  notifications: (userId: string) => ['notifications', userId],
  unreadNotifications: (userId: string) => [
    'notifications',
    userId,
    'unread',
  ],
};

// ============================================================
// PROFILE QUERIES
// ============================================================

export function useProfile(userId?: string) {
  const supabase = createClient();

  return useQuery({
    queryKey: userId ? queryKeys.profile(userId) : queryKeys.profiles(),
    queryFn: async () => {
      if (!userId) throw new Error('User ID required');

      const { data, error } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('id', userId)
        .single() as any;

      if (error) throw handleSupabaseError(error);
      return data;
    },
    enabled: !!userId,
    staleTime: 10 * 60 * 1000, // 10 minutes for user profile
  });
}

// ============================================================
// TRADE QUERIES
// ============================================================

export function useTrades(userId: string, limit: number = 50) {
  const supabase = createClient();

  return useQuery({
    queryKey: queryKeys.trades(userId),
    queryFn: async () => {
      const { data, error } = await supabase
        .from('trades')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) throw handleSupabaseError(error);
      return data;
    },
    enabled: !!userId,
    staleTime: 2 * 60 * 1000, // 2 minutes (trades update frequently)
  });
}

export function useOpenTrades(userId: string) {
  const supabase = createClient();

  return useQuery({
    queryKey: queryKeys.openTrades(userId),
    queryFn: async () => {
      const { data, error } = await supabase
        .from('trades')
        .select('*')
        .eq('user_id', userId)
        .eq('status', 'open')
        .order('created_at', { ascending: false });

      if (error) throw handleSupabaseError(error);
      return data;
    },
    enabled: !!userId,
    staleTime: 1 * 60 * 1000, // 1 minute (position updates are critical)
  });
}

export function useTradeStats(userId: string) {
  const supabase = createClient();

  return useQuery({
    queryKey: queryKeys.tradeStats(userId),
    queryFn: async () => {
      const { data, error } = await supabase
        .from('trades')
        .select('profit_loss, type, status')
        .eq('user_id', userId);

      if (error) throw handleSupabaseError(error);

      // Calculate stats
      const stats = {
        totalTrades: data.length,
        openTrades: data.filter((t) => t.status === 'open').length,
        closedTrades: data.filter((t) => t.status === 'closed').length,
        totalProfit: data.reduce((sum, t) => sum + (t.profit_loss || 0), 0),
        buyTrades: data.filter((t) => t.type === 'buy').length,
        sellTrades: data.filter((t) => t.type === 'sell').length,
        winRate:
          data.length > 0
            ? (data.filter((t) => (t.profit_loss || 0) > 0).length /
                data.length) *
              100
            : 0,
      };

      return stats;
    },
    enabled: !!userId,
    staleTime: 5 * 60 * 1000, // 5 minutes (stats update less frequently)
  });
}

// ============================================================
// BETA APPLICATION QUERIES
// ============================================================

export function useBetaApplication(userId: string) {
  const supabase = createClient();

  return useQuery({
    queryKey: queryKeys.betaApplication(userId),
    queryFn: async () => {
      const { data, error } = await supabase
        .from('beta_applications')
        .select('*')
        .eq('user_id', userId)
        .single() as any;

      if (error && error.code !== 'PGRST116') {
        // PGRST116 = no rows found
        throw handleSupabaseError(error);
      }

      return data || null;
    },
    enabled: !!userId,
    staleTime: 10 * 60 * 1000, // 10 minutes
  });
}

// ============================================================
// CHART SIGNALS QUERIES
// ============================================================

export function useChartSignals(symbol: string, limit: number = 20) {
  const supabase = createClient();

  return useQuery({
    queryKey: queryKeys.chartSignals(symbol),
    queryFn: async () => {
      const { data, error } = await supabase
        .from('chart_signals')
        .select('*')
        .eq('symbol', symbol)
        .order('timestamp', { ascending: false })
        .limit(limit);

      if (error) throw handleSupabaseError(error);
      return data;
    },
    enabled: !!symbol,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

// ============================================================
// SUBSCRIPTION QUERY
// ============================================================

export function useSubscription(userId: string) {
  const supabase = createClient();

  return useQuery({
    queryKey: queryKeys.subscription(userId),
    queryFn: async () => {
      const { data, error } = await supabase
        .from('subscriptions')
        .select('*')
        .eq('user_id', userId)
        .is('end_date', null)
        .single() as any;

      if (error && error.code !== 'PGRST116') {
        throw handleSupabaseError(error);
      }

      return data || null;
    },
    enabled: !!userId,
    staleTime: 15 * 60 * 1000, // 15 minutes (subscriptions change infrequently)
  });
}

// ============================================================
// NOTIFICATIONS QUERY
// ============================================================

export function useNotifications(userId: string) {
  const supabase = createClient();

  return useQuery({
    queryKey: queryKeys.notifications(userId),
    queryFn: async () => {
      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(20);

      if (error) throw handleSupabaseError(error);
      return data;
    },
    enabled: !!userId,
    staleTime: 1 * 60 * 1000, // 1 minute
  });
}

export function useUnreadNotifications(userId: string) {
  const supabase = createClient();

  return useQuery({
    queryKey: queryKeys.unreadNotifications(userId),
    queryFn: async () => {
      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', userId)
        .eq('read', false)
        .order('created_at', { ascending: false });

      if (error) throw handleSupabaseError(error);
      return data;
    },
    enabled: !!userId,
    staleTime: 30 * 1000, // 30 seconds
  });
}

// ============================================================
// MUTATIONS
// ============================================================

export function useUpdateProfile(userId: string) {
  const supabase = createClient();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (updates: Record<string, unknown>) => {
      const { data, error } = await supabase
        .from('user_profiles')
        .update(updates)
        .eq('id', userId)
        .select()
        .single() as any;

      if (error) throw handleSupabaseError(error);
      return data;
    },
    onSuccess: (data) => {
      // Update cache with new data
      queryClient.setQueryData(queryKeys.profile(userId), data);
      logger.info('Profile updated successfully');
    },
  });
}

export function useCloseTrade(tradeId: string, userId: string) {
  const supabase = createClient();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (exitPrice: number) => {
      const { data, error } = await supabase
        .from('trades')
        .update({
          status: 'closed',
          exit_price: exitPrice,
          exit_date: new Date().toISOString(),
        })
        .eq('id', tradeId)
        .select()
        .single() as any;

      if (error) throw handleSupabaseError(error);
      return data;
    },
    onSuccess: () => {
      // Invalidate related queries
      queryClient.invalidateQueries({
        queryKey: queryKeys.trades(userId),
      });
      queryClient.invalidateQueries({
        queryKey: queryKeys.openTrades(userId),
      });
      queryClient.invalidateQueries({
        queryKey: queryKeys.tradeStats(userId),
      });
      logger.info('Trade closed successfully');
    },
  });
}

export default {
  queryKeys,
  // Profile hooks
  useProfile,
  // Trade hooks
  useTrades,
  useOpenTrades,
  useTradeStats,
  // Beta hooks
  useBetaApplication,
  // Chart hooks
  useChartSignals,
  // Subscription hooks
  useSubscription,
  // Notification hooks
  useNotifications,
  useUnreadNotifications,
  // Mutation hooks
  useUpdateProfile,
  useCloseTrade,
};
