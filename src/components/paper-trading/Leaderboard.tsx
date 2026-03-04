'use client';

import { useState, useEffect } from 'react';
import { 
  Trophy, TrendingUp, TrendingDown, Medal, 
  Clock, Filter, ChevronUp, ChevronDown
} from 'lucide-react';
import { LeaderboardEntry } from '@/types/paper-trading';
import { formatPct, getRiskColorClass, RISK_PRESETS } from '@/lib/paper-trading/presets';
import { cn } from '@/lib/utils';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useTranslations } from 'next-intl';

type Period = 'daily' | 'weekly' | 'monthly' | 'all_time';

interface LeaderboardProps {
  currentUserId?: string;
}

// Static timestamp for mock data to avoid hydration mismatch
const MOCK_TIMESTAMP = '2026-02-10T10:00:00.000Z';

// Mock data for demo
const mockLeaderboard: Record<Period, LeaderboardEntry[]> = {
  daily: [
    { id: '1', period: 'daily', user_id: 'u1', user_display_name: 'CryptoViking', avatar_url: null, simulation_id: 's1', return_pct: 12.5, sharpe_ratio: 2.1, win_rate: 75, total_trades: 8, rank: 1, previous_rank: 2, created_at: MOCK_TIMESTAMP, updated_at: MOCK_TIMESTAMP, risk_level: 'high', is_public: true },
    { id: '2', period: 'daily', user_id: 'u2', user_display_name: 'MoonShot', avatar_url: null, simulation_id: 's2', return_pct: 8.3, sharpe_ratio: 1.8, win_rate: 60, total_trades: 5, rank: 2, previous_rank: 1, created_at: MOCK_TIMESTAMP, updated_at: MOCK_TIMESTAMP, risk_level: 'extreme', is_public: true },
    { id: '3', period: 'daily', user_id: 'u3', user_display_name: 'SteadyEddie', avatar_url: null, simulation_id: 's3', return_pct: 5.2, sharpe_ratio: 2.5, win_rate: 80, total_trades: 10, rank: 3, previous_rank: 3, created_at: MOCK_TIMESTAMP, updated_at: MOCK_TIMESTAMP, risk_level: 'standard', is_public: true },
    { id: '4', period: 'daily', user_id: 'u4', user_display_name: 'RiskTaker', avatar_url: null, simulation_id: 's4', return_pct: 3.1, sharpe_ratio: 1.2, win_rate: 45, total_trades: 12, rank: 4, previous_rank: 5, created_at: MOCK_TIMESTAMP, updated_at: MOCK_TIMESTAMP, risk_level: 'extreme', is_public: true },
    { id: '5', period: 'daily', user_id: 'u5', user_display_name: 'SafeHaven', avatar_url: null, simulation_id: 's5', return_pct: 2.8, sharpe_ratio: 2.8, win_rate: 85, total_trades: 6, rank: 5, previous_rank: 4, created_at: MOCK_TIMESTAMP, updated_at: MOCK_TIMESTAMP, risk_level: 'low', is_public: true }
  ],
  weekly: [
    { id: '6', period: 'weekly', user_id: 'u2', user_display_name: 'MoonShot', avatar_url: null, simulation_id: 's2', return_pct: 28.5, sharpe_ratio: 1.9, win_rate: 65, total_trades: 20, rank: 1, previous_rank: 3, created_at: MOCK_TIMESTAMP, updated_at: MOCK_TIMESTAMP, risk_level: 'extreme', is_public: true },
    { id: '7', period: 'weekly', user_id: 'u1', user_display_name: 'CryptoViking', avatar_url: null, simulation_id: 's1', return_pct: 22.1, sharpe_ratio: 2.2, win_rate: 70, total_trades: 25, rank: 2, previous_rank: 1, created_at: MOCK_TIMESTAMP, updated_at: MOCK_TIMESTAMP, risk_level: 'high', is_public: true },
    { id: '8', period: 'weekly', user_id: 'u6', user_display_name: 'TrendFollower', avatar_url: null, simulation_id: 's6', return_pct: 18.7, sharpe_ratio: 2.0, win_rate: 68, total_trades: 18, rank: 3, previous_rank: 2, created_at: MOCK_TIMESTAMP, updated_at: MOCK_TIMESTAMP, risk_level: 'standard', is_public: true },
    { id: '9', period: 'weekly', user_id: 'u3', user_display_name: 'SteadyEddie', avatar_url: null, simulation_id: 's3', return_pct: 15.3, sharpe_ratio: 2.6, win_rate: 82, total_trades: 30, rank: 4, previous_rank: 4, created_at: MOCK_TIMESTAMP, updated_at: MOCK_TIMESTAMP, risk_level: 'standard', is_public: true },
    { id: '10', period: 'weekly', user_id: 'u7', user_display_name: 'AI-Trader', avatar_url: null, simulation_id: 's7', return_pct: 12.8, sharpe_ratio: 2.4, win_rate: 78, total_trades: 22, rank: 5, previous_rank: 6, created_at: MOCK_TIMESTAMP, updated_at: MOCK_TIMESTAMP, risk_level: 'auto_low', is_public: true }
  ],
  monthly: [],
  all_time: []
};

function getRankIcon(rank: number) {
  switch (rank) {
    case 1:
      return <Trophy className="w-5 h-5 text-yellow-500" />;
    case 2:
      return <Medal className="w-5 h-5 text-gray-400" />;
    case 3:
      return <Medal className="w-5 h-5 text-amber-600" />;
    default:
      return <span className="w-5 h-5 flex items-center justify-center text-sm font-medium text-slate-500">{rank}</span>;
  }
}

function getRankChange(current: number, previous: number) {
  const change = previous - current;
  if (change > 0) {
    return (
      <span className="flex items-center text-green-400 text-xs">
        <ChevronUp className="w-3 h-3" />
        {change}
      </span>
    );
  } else if (change < 0) {
    return (
      <span className="flex items-center text-red-400 text-xs">
        <ChevronDown className="w-3 h-3" />
        {Math.abs(change)}
      </span>
    );
  }
  return <span className="text-slate-500 text-xs">-</span>;
}

export function Leaderboard({ currentUserId }: LeaderboardProps) {
  const t = useTranslations('paperTrading.leaderboard');
  const [period, setPeriod] = useState<Period>('weekly');
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);

  const periods: { value: Period; labelKey: string }[] = [
    { value: 'daily', labelKey: 'periods.daily' },
    { value: 'weekly', labelKey: 'periods.weekly' },
    { value: 'monthly', labelKey: 'periods.monthly' },
    { value: 'all_time', labelKey: 'periods.all_time' }
  ];

  useEffect(() => {
    // Simulate API call - in production, fetch from Supabase
    setLoading(true);
    setTimeout(() => {
      setEntries(mockLeaderboard[period] || []);
      setLoading(false);
    }, 500);
  }, [period]);

  if (loading) {
    return (
      <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-6">
        <div className="flex items-center justify-center h-48">
          <Clock className="w-6 h-6 animate-spin text-slate-500" />
        </div>
      </div>
    );
  }

  return (
    <div className="bg-slate-900/50 border border-slate-800 rounded-xl overflow-hidden">
      {/* Header */}
      <div className="p-4 border-b border-slate-800">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-white flex items-center gap-2">
            <Trophy className="w-5 h-5 text-yellow-500" />
            {t('title')}
          </h3>
        </div>

        {/* Period Tabs */}
        <div className="flex gap-2">
          {periods.map((p) => (
            <button
              key={p.value}
              onClick={() => setPeriod(p.value)}
              className={cn(
                'px-3 py-1.5 text-sm rounded-lg transition-colors',
                period === p.value
                  ? 'bg-blue-600 text-white'
                  : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
              )}
            >
              {t(p.labelKey)}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="bg-slate-950/50">
              <th className="px-4 py-3 text-left text-xs font-medium text-slate-400">{t('rank')}</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-slate-400">{t('trader')}</th>
              <th className="px-4 py-3 text-right text-xs font-medium text-slate-400">{t('return')}</th>
              <th className="px-4 py-3 text-right text-xs font-medium text-slate-400 hidden sm:table-cell">{t('trades')}</th>
              <th className="px-4 py-3 text-right text-xs font-medium text-slate-400 hidden md:table-cell">{t('winRate')}</th>
              <th className="px-4 py-3 text-center text-xs font-medium text-slate-400 hidden md:table-cell">{t('risk')}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800">
            {entries.map((entry) => (
              <tr
                key={entry.id}
                className={cn(
                  'hover:bg-slate-800/50 transition-colors',
                  entry.user_id === currentUserId && 'bg-blue-900/20'
                )}
              >
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    {getRankIcon(entry.rank)}
                    {getRankChange(entry.rank, entry.previous_rank || entry.rank)}
                  </div>
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-3">
                    <Avatar className="w-8 h-8">
                      <AvatarImage src={entry.avatar_url || undefined} />
                      <AvatarFallback className="bg-slate-700 text-slate-300 text-xs">
                        {entry.user_display_name.slice(0, 2).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <span className="font-medium text-white">{entry.user_display_name}</span>
                    {entry.user_id === currentUserId && (
                      <Badge variant="outline" className="text-xs border-blue-500 text-blue-400">
                        You
                      </Badge>
                    )}
                  </div>
                </td>
                <td className="px-4 py-3 text-right">
                  <div className={cn(
                    'font-semibold',
                    entry.return_pct >= 0 ? 'text-green-400' : 'text-red-400'
                  )}>
                    {entry.return_pct >= 0 ? '+' : ''}{formatPct(entry.return_pct)}
                  </div>
                </td>
                <td className="px-4 py-3 text-right text-slate-300 hidden sm:table-cell">
                  {entry.total_trades}
                </td>
                <td className="px-4 py-3 text-right text-slate-300 hidden md:table-cell">
                  {entry.win_rate}%
                </td>
                <td className="px-4 py-3 text-center hidden md:table-cell">
                  <span className={cn(
                    'inline-flex items-center px-2 py-0.5 rounded text-xs font-medium',
                    getRiskColorClass(entry.risk_level || 'standard')
                  )}>
                    {entry.risk_level === 'auto_low' ? 'AI' : 
                     entry.risk_level ? entry.risk_level.charAt(0).toUpperCase() + entry.risk_level.slice(1) : 
                     'Standard'}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {entries.length === 0 && (
        <div className="text-center py-12 text-slate-500">
          <Filter className="w-8 h-8 mx-auto mb-2 opacity-50" />
          <p>No entries for this period yet</p>
        </div>
      )}
    </div>
  );
}
