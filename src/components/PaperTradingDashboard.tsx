'use client';

import { useEffect, useState } from 'react';
import { PaperAccount, PaperTradingStats } from '@/types';
import { createClient } from '@/lib/utils';
import { Trade } from '@/types/database';

export interface PaperTradingDashboardProps {
  userId: string;
  onSelectPosition?: (positionId: string) => void;
}

export default function PaperTradingDashboard({
  userId,
  onSelectPosition,
}: PaperTradingDashboardProps) {
  const [account, setAccount] = useState<PaperAccount | null>(null);
  const [stats, setStats] = useState<PaperTradingStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchPaperTradingData = async () => {
      try {
        setLoading(true);
        setError(null);

        const supabase = createClient();

        // Fetch paper account (portfolio)
        const { data: accountData } = await supabase
          .from('portfolios')
          .select('*')
          .eq('user_id', userId)
          .single();

        if (accountData) {
          setAccount(accountData as unknown as PaperAccount);
        }

        // Fetch stats from trades
        const { data: trades } = await supabase
          .from('trades')
          .select('*')
          .eq('user_id', userId);

        if (trades && trades.length > 0) {
          const typedTrades = (trades ?? []) as unknown as Trade[];
          const totalPnl = typedTrades.reduce((sum: number, t) => sum + (t.profit_loss || 0), 0);
          const wins = typedTrades.filter((t) => (t.profit_loss || 0) > 0).length;
          const losses = typedTrades.filter((t) => (t.profit_loss || 0) < 0).length;
          const pnlValues = typedTrades.map((t) => t.profit_loss || 0);
          const bestTrade = Math.max(...pnlValues);
          const worstTrade = Math.min(...pnlValues);
          const initialBalance = 10000;
          setStats({
            id: '',
            user_id: userId,
            total_trades: trades.length,
            total_profit_loss: totalPnl,
            winning_trades: wins,
            losing_trades: losses,
            win_rate: (wins / trades.length) * 100,
            initial_balance: initialBalance,
            total_pnl: totalPnl,
            total_pnl_percent: (totalPnl / initialBalance) * 100,
            best_trade_pnl: bestTrade,
            worst_trade_pnl: worstTrade,
            updated_at: new Date().toISOString(),
          });
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load paper trading data');
      } finally {
        setLoading(false);
      }
    };

    if (userId) {
      fetchPaperTradingData();
    }
  }, [userId]);

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-gray-500">Loading paper trading data...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-lg bg-red-50 p-4 text-red-700">
        <p className="font-medium">Error</p>
        <p className="text-sm">{error}</p>
      </div>
    );
  }

  if (!account || !stats) {
    return (
      <div className="rounded-lg bg-blue-50 p-4">
        <p className="font-medium text-blue-900">Paper Trading Not Initialized</p>
        <p className="text-sm text-blue-700">
          Create your first paper trading account to get started.
        </p>
      </div>
    );
  }

  const returnPercent = (stats.total_profit_loss / stats.initial_balance) * 100;
  const isPositive = stats.total_profit_loss >= 0;

  return (
    <div className="space-y-6">
      {/* Header with white badge */}
      <div className="flex items-center gap-3">
        <h2 className="text-2xl font-bold">Paper Trading</h2>
        <div className="inline-flex items-center gap-2 rounded-full bg-white px-3 py-1 ring-1 ring-gray-200">
          <div className="h-2 w-2 rounded-full bg-gray-400"></div>
          <span className="text-sm font-medium text-gray-700">Demo Account</span>
        </div>
      </div>

      {/* Account Balance */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="rounded-lg bg-linear-to-br from-blue-50 to-blue-100 p-4">
          <p className="text-sm text-gray-600">Initial Balance</p>
          <p className="text-2xl font-bold text-gray-900">
            ${ (10000).toLocaleString('en-US', { maximumFractionDigits: 2 })}
          </p>
        </div>

        <div className="rounded-lg bg-linear-to-br from-gray-50 to-gray-100 p-4">
          <p className="text-sm text-gray-600">Current Balance</p>
          <p className="text-2xl font-bold text-gray-900">
            ${ (account.balance || 0).toLocaleString('en-US', { maximumFractionDigits: 2 })}
          </p>
        </div>

        <div
          className={`rounded-lg p-4 ${
            isPositive
              ? 'bg-linear-to-br from-green-50 to-green-100'
              : 'bg-linear-to-br from-red-50 to-red-100'
          }`}
        >
          <p className="text-sm text-gray-600">Profit/Loss</p>
          <p className={`text-2xl font-bold ${isPositive ? 'text-green-700' : 'text-red-700'}`}>
            {isPositive ? '+' : ''}${stats.total_profit_loss.toLocaleString('en-US', {
              maximumFractionDigits: 2,
            })}
          </p>
          <p className={`text-xs ${isPositive ? 'text-green-600' : 'text-red-600'}`}>
            {isPositive ? '+' : ''}{returnPercent.toFixed(2)}%
          </p>
        </div>
      </div>

      {/* Trading Statistics */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <div className="rounded-lg border border-gray-200 p-4">
          <p className="text-xs font-medium text-gray-500 uppercase">Total Trades</p>
          <p className="mt-2 text-2xl font-bold text-gray-900">{stats.total_trades}</p>
        </div>

        <div className="rounded-lg border border-gray-200 p-4">
          <p className="text-xs font-medium text-gray-500 uppercase">Win Rate</p>
          <p className="mt-2 text-2xl font-bold text-gray-900">
            {stats.total_trades > 0 ? `${(stats.win_rate ?? 0).toFixed(1)}%` : '—'}
          </p>
        </div>

        <div className="rounded-lg border border-gray-200 p-4">
          <p className="text-xs font-medium text-gray-500 uppercase">Avg Profit</p>
          <p className={`mt-2 text-2xl font-bold ${
            stats.total_profit_loss / Math.max(stats.total_trades, 1) >= 0 ? 'text-green-600' : 'text-red-600'
          }`}>
            ${Math.abs(stats.total_profit_loss / Math.max(stats.total_trades, 1)).toLocaleString('en-US', {
              maximumFractionDigits: 2,
            })}
          </p>
        </div>

        <div className="rounded-lg border border-gray-200 p-4">
          <p className="text-xs font-medium text-gray-500 uppercase">Best Trade</p>
          <p className="mt-2 text-2xl font-bold text-green-600">
            ${ (stats.best_trade_pnl ?? 0).toLocaleString('en-US', { maximumFractionDigits: 2 })}
          </p>
        </div>
      </div>

      {/* Info Box */}
      <div className="rounded-lg bg-blue-50 p-4 text-sm text-blue-700">
        <p className="font-medium">⚪ Practice with our paper trading system</p>
        <p className="mt-1 text-blue-600">
          Trade risk-free with ${ (10000).toLocaleString()} starting capital. Perfect for
          learning and testing strategies before trading live.
        </p>
      </div>
    </div>
  );
}
