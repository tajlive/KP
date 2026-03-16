'use client';
import { useState, useEffect, useCallback } from 'react';
import { getSupabaseClient } from '@/lib/supabase/client';
import type { Database } from '@/lib/database.types';
import type { Wallet, PortfolioItem, TradingStats } from '@/types';

type Trade = Database['public']['Tables']['trades']['Row'];
type Portfolio = Database['public']['Tables']['portfolios']['Row'];

// Local types for tables that may not be in generated schema
interface WalletDB {
  id: string;
  user_id: string;
  balance_usdt: number;
  balance_nok: number | null;
  created_at: string;
  updated_at: string | null;
}

interface TradingStatsDB {
  id: string;
  user_id: string;
  total_trades: number;
  winning_trades: number;
  total_pnl: number;
  win_rate: number | null;
  created_at: string;
  updated_at: string | null;
}

export function useTrading(userId?: string) {
  const [trades, setTrades] = useState<Trade[]>([]);
  const [portfolio, setPortfolio] = useState<Portfolio[]>([]);
  const [wallet, setWallet] = useState<WalletDB | null>(null);
  const [stats, setStats] = useState<TradingStatsDB | null>(null);
  const [loading, setLoading] = useState(true);
  const [executingTrade, setExecutingTrade] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    if (!userId) { setLoading(false); return; }
    setLoading(true);

    const supabase = getSupabaseClient();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const fromAny = supabase.from as (t: string) => any;
    const t = await supabase.from('trades').select('*').eq('user_id', userId).order('created_at', { ascending: false });
    const p = await supabase.from('portfolios').select('*').eq('user_id', userId);
    const w = await fromAny('wallets').select('*').eq('user_id', userId).single();
    const s = await fromAny('trading_stats').select('*').eq('user_id', userId).single();
    setTrades(t.data || []); setPortfolio(p.data || []); setWallet(w.data as WalletDB | null); setStats(s.data as TradingStatsDB | null); setLoading(false);
  }, [userId]);

  const refreshTrades = useCallback(async () => {
    if (!userId) return;
    const supabase = getSupabaseClient();
    const r = await supabase.from('trades').select('*').eq('user_id', userId).order('created_at', { ascending: false });
    setTrades(r.data || []);
  }, [userId]);

  const buy = useCallback(async (symbol: string, quantity: number, price: number) => {
    if (!userId) return { success: false, error: 'Not authenticated' };
    setExecutingTrade(true);
    setError(null);
    try {
      const supabase = getSupabaseClient();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error: tradeError } = await (supabase.rpc as any)('execute_trade', {
        p_user_id: userId,
        p_symbol: symbol,
        p_type: 'buy',
        p_side: 'market',
        p_quantity: quantity,
        p_price: price,
      });
      if (tradeError) throw new Error(tradeError.message);
      await fetchData();
      return { success: true };
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Trade failed';
      setError(msg);
      return { success: false, error: msg };
    } finally {
      setExecutingTrade(false);
    }
  }, [userId, fetchData]);

  const sell = useCallback(async (symbol: string, quantity: number, price: number) => {
    if (!userId) return { success: false, error: 'Not authenticated' };
    setExecutingTrade(true);
    setError(null);
    try {
      const supabase = getSupabaseClient();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error: tradeError } = await (supabase.rpc as any)('execute_trade', {
        p_user_id: userId,
        p_symbol: symbol,
        p_type: 'sell',
        p_side: 'market',
        p_quantity: quantity,
        p_price: price,
      });
      if (tradeError) throw new Error(tradeError.message);
      await fetchData();
      return { success: true };
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Trade failed';
      setError(msg);
      return { success: false, error: msg };
    } finally {
      setExecutingTrade(false);
    }
  }, [userId, fetchData]);

  useEffect(() => {
    const supabase = getSupabaseClient();
    fetchData();
    const ch = supabase.channel('trading').on('postgres_changes', { event: '*', schema: 'public', table: 'trades' }, fetchData).subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [fetchData]);

  return { trades, portfolio, wallet, stats, loading, refreshData: fetchData, refreshTrades, buy, sell, executingTrade, error };
}

export function usePortfolioCalculations(
  wallet: Wallet | null,
  portfolio: PortfolioItem[],
  stats: TradingStats | null
) {
  // Calculate total portfolio value from holdings
  const totalPortfolioValue = portfolio.reduce((sum, item) => {
    return sum + item.current_value;
  }, 0);

  // Available balance from wallet
  const availableBalance = wallet?.balance_usdt || 0;

  // Total balance = available + invested
  const totalBalance = availableBalance + totalPortfolioValue;

  // Unrealized P&L from current holdings
  const unrealizedPnL = portfolio.reduce((sum, item) => {
    return sum + item.unrealized_pnl;
  }, 0);

  // Realized P&L from stats (if available)
  const realizedPnL = stats?.total_pnl || 0;

  // Total P&L
  const totalPnL = unrealizedPnL + realizedPnL;

  // Portfolio allocation
  const allocation = portfolio
    .map((item) => ({
      symbol: item.symbol,
      value: item.current_value,
      allocationPercent: totalPortfolioValue > 0 ? (item.current_value / totalPortfolioValue) * 100 : 0,
    }))
    .sort((a, b) => b.value - a.value);

  return {
    totalPortfolioValue,
    totalBalance,
    unrealizedPnL,
    realizedPnL,
    totalPnL,
    allocation,
    availableBalance,
  };
}
