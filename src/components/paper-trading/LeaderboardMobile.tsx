'use client';

import { useState, useEffect } from 'react';
import { 
  Trophy,
  Clock, ChevronUp, ChevronDown, Crown, Sparkles
} from 'lucide-react';
import { LeaderboardEntry } from '@/types/paper-trading';
import { formatPct } from '@/lib/paper-trading/presets';
import { cn } from '@/lib/utils';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useTranslations } from 'next-intl';

type Period = 'daily' | 'weekly' | 'monthly' | 'all_time';

// Static timestamp for mock data to avoid hydration mismatch
const MOCK_TIMESTAMP = '2026-02-10T10:00:00.000Z';

// Mock data
const mockLeaderboard: Record<Period, LeaderboardEntry[]> = {
  daily: [
    { id: '1', period: 'daily', user_id: 'u1', user_display_name: 'CryptoViking 🇳🇴', avatar_url: null, simulation_id: 's1', return_pct: 12.5, sharpe_ratio: 2.1, win_rate: 75, total_trades: 8, rank: 1, previous_rank: 2, created_at: MOCK_TIMESTAMP, updated_at: MOCK_TIMESTAMP, risk_level: 'high', is_public: true },
    { id: '2', period: 'daily', user_id: 'u2', user_display_name: 'MoonShot 🚀', avatar_url: null, simulation_id: 's2', return_pct: 8.3, sharpe_ratio: 1.8, win_rate: 60, total_trades: 5, rank: 2, previous_rank: 1, created_at: MOCK_TIMESTAMP, updated_at: MOCK_TIMESTAMP, risk_level: 'extreme', is_public: true },
    { id: '3', period: 'daily', user_id: 'u3', user_display_name: 'SteadyEddie', avatar_url: null, simulation_id: 's3', return_pct: 5.2, sharpe_ratio: 2.5, win_rate: 80, total_trades: 10, rank: 3, previous_rank: 3, created_at: MOCK_TIMESTAMP, updated_at: MOCK_TIMESTAMP, risk_level: 'standard', is_public: true },
    { id: '4', period: 'daily', user_id: 'current', user_display_name: 'Deg', avatar_url: null, simulation_id: 's4', return_pct: 3.1, sharpe_ratio: 1.2, win_rate: 45, total_trades: 12, rank: 4, previous_rank: 5, created_at: MOCK_TIMESTAMP, updated_at: MOCK_TIMESTAMP, risk_level: 'low', is_public: true },
    { id: '5', period: 'daily', user_id: 'u5', user_display_name: 'SafeHaven', avatar_url: null, simulation_id: 's5', return_pct: 2.8, sharpe_ratio: 2.8, win_rate: 85, total_trades: 6, rank: 5, previous_rank: 4, created_at: MOCK_TIMESTAMP, updated_at: MOCK_TIMESTAMP, risk_level: 'low', is_public: true }
  ],
  weekly: [
    { id: '6', period: 'weekly', user_id: 'u2', user_display_name: 'MoonShot 🚀', avatar_url: null, simulation_id: 's2', return_pct: 28.5, sharpe_ratio: 1.9, win_rate: 65, total_trades: 20, rank: 1, previous_rank: 3, created_at: MOCK_TIMESTAMP, updated_at: MOCK_TIMESTAMP, risk_level: 'extreme', is_public: true },
    { id: '7', period: 'weekly', user_id: 'u1', user_display_name: 'CryptoViking 🇳🇴', avatar_url: null, simulation_id: 's1', return_pct: 22.1, sharpe_ratio: 2.2, win_rate: 70, total_trades: 25, rank: 2, previous_rank: 1, created_at: MOCK_TIMESTAMP, updated_at: MOCK_TIMESTAMP, risk_level: 'high', is_public: true },
    { id: '8', period: 'weekly', user_id: 'current', user_display_name: 'Deg', avatar_url: null, simulation_id: 's4', return_pct: 15.3, sharpe_ratio: 2.6, win_rate: 82, total_trades: 30, rank: 3, previous_rank: 4, created_at: MOCK_TIMESTAMP, updated_at: MOCK_TIMESTAMP, risk_level: 'standard', is_public: true },
    { id: '9', period: 'weekly', user_id: 'u7', user_display_name: 'AI-Trader 🤖', avatar_url: null, simulation_id: 's7', return_pct: 12.8, sharpe_ratio: 2.4, win_rate: 78, total_trades: 22, rank: 4, previous_rank: 6, created_at: MOCK_TIMESTAMP, updated_at: MOCK_TIMESTAMP, risk_level: 'auto_low', is_public: true },
    { id: '10', period: 'weekly', user_id: 'u8', user_display_name: 'DCA-Master', avatar_url: null, simulation_id: 's8', return_pct: 10.2, sharpe_ratio: 2.9, win_rate: 88, total_trades: 45, rank: 5, previous_rank: 5, created_at: MOCK_TIMESTAMP, updated_at: MOCK_TIMESTAMP, risk_level: 'low', is_public: true }
  ],
  monthly: [
    { id: '11', period: 'monthly', user_id: 'u9', user_display_name: 'WhaleWatcher 🐋', avatar_url: null, simulation_id: 's9', return_pct: 45.2, sharpe_ratio: 2.3, win_rate: 72, total_trades: 50, rank: 1, previous_rank: 2, created_at: MOCK_TIMESTAMP, updated_at: MOCK_TIMESTAMP, risk_level: 'high', is_public: true },
    { id: '12', period: 'monthly', user_id: 'current', user_display_name: 'Deg', avatar_url: null, simulation_id: 's4', return_pct: 32.1, sharpe_ratio: 2.1, win_rate: 68, total_trades: 42, rank: 2, previous_rank: 1, created_at: MOCK_TIMESTAMP, updated_at: MOCK_TIMESTAMP, risk_level: 'standard', is_public: true },
    { id: '13', period: 'monthly', user_id: 'u1', user_display_name: 'CryptoViking 🇳🇴', avatar_url: null, simulation_id: 's1', return_pct: 28.7, sharpe_ratio: 2.0, win_rate: 65, total_trades: 48, rank: 3, previous_rank: 3, created_at: MOCK_TIMESTAMP, updated_at: MOCK_TIMESTAMP, risk_level: 'high', is_public: true }
  ],
  all_time: [
    { id: '14', period: 'all_time', user_id: 'u10', user_display_name: 'SatoshiJr', avatar_url: null, simulation_id: 's10', return_pct: 312.5, sharpe_ratio: 2.8, win_rate: 75, total_trades: 150, rank: 1, previous_rank: 1, created_at: MOCK_TIMESTAMP, updated_at: MOCK_TIMESTAMP, risk_level: 'extreme', is_public: true },
    { id: '15', period: 'all_time', user_id: 'current', user_display_name: 'Deg', avatar_url: null, simulation_id: 's4', return_pct: 156.3, sharpe_ratio: 2.4, win_rate: 70, total_trades: 120, rank: 2, previous_rank: 2, created_at: MOCK_TIMESTAMP, updated_at: MOCK_TIMESTAMP, risk_level: 'standard', is_public: true },
    { id: '16', period: 'all_time', user_id: 'u1', user_display_name: 'CryptoViking 🇳🇴', avatar_url: null, simulation_id: 's1', return_pct: 128.9, sharpe_ratio: 2.2, win_rate: 68, total_trades: 135, rank: 3, previous_rank: 3, created_at: MOCK_TIMESTAMP, updated_at: MOCK_TIMESTAMP, risk_level: 'high', is_public: true }
  ]
};

function getRankChange(current: number, previous: number) {
  const change = previous - current;
  if (change > 0) {
    return (
      <span className="flex items-center text-green-400 text-xs bg-green-400/10 px-1.5 py-0.5 rounded">
        <ChevronUp className="w-3 h-3" />
        {change}
      </span>
    );
  } else if (change < 0) {
    return (
      <span className="flex items-center text-red-400 text-xs bg-red-400/10 px-1.5 py-0.5 rounded">
        <ChevronDown className="w-3 h-3" />
        {Math.abs(change)}
      </span>
    );
  }
  return null;
}

export function LeaderboardMobile() {
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
    setLoading(true);
    setTimeout(() => {
      setEntries(mockLeaderboard[period] || []);
      setLoading(false);
    }, 300);
  }, [period]);

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
      {/* Header */}
      <div className="p-4 border-b border-slate-800 bg-gradient-to-r from-slate-900 to-slate-800">
        <div className="flex items-center gap-2 mb-3">
          <Trophy className="w-5 h-5 text-yellow-500" />
          <h3 className="font-semibold text-white">{t('title')}</h3>
          <Sparkles className="w-4 h-4 text-yellow-500/50" />
        </div>

        {/* Period Pills */}
        <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
          {periods.map((p) => (
            <button
              key={p.value}
              onClick={() => setPeriod(p.value)}
              className={cn(
                'px-3 py-1.5 text-xs font-medium rounded-full whitespace-nowrap transition-all',
                period === p.value
                  ? 'bg-gradient-to-r from-blue-600 to-blue-500 text-white shadow-lg shadow-blue-500/25'
                  : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
              )}
            >
              {t(p.labelKey)}
            </button>
          ))}
        </div>
      </div>

      {/* Top 3 Podium */}
      {!loading && entries.length > 0 && (
        <div className="p-4 bg-gradient-to-b from-slate-800/50 to-slate-900">
          <div className="flex items-end justify-center gap-4 mb-4">
            {/* 2nd Place */}
            {entries[1] && (
              <div className="flex flex-col items-center">
                <div className="relative">
                  <Avatar className="w-12 h-12 ring-2 ring-gray-400 ring-offset-2 ring-offset-slate-900">
                    <AvatarImage src={entries[1].avatar_url || undefined} />
                    <AvatarFallback className="bg-slate-700 text-slate-300 text-xs">
                      {entries[1].user_display_name.slice(0, 2).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="absolute -bottom-1 -right-1 bg-gray-400 text-slate-900 text-xs font-bold w-5 h-5 rounded-full flex items-center justify-center">
                    2
                  </div>
                </div>
                <span className="text-xs text-slate-300 mt-2 truncate max-w-[80px]">
                  {entries[1].user_display_name}
                </span>
                <span className="text-xs font-semibold text-green-400">
                  +{formatPct(entries[1].return_pct)}
                </span>
              </div>
            )}

            {/* 1st Place */}
            {entries[0] && (
              <div className="flex flex-col items-center -mt-4">
                <Crown className="w-6 h-6 text-yellow-500 mb-1" />
                <div className="relative">
                  <Avatar className="w-16 h-16 ring-4 ring-yellow-500 ring-offset-2 ring-offset-slate-900">
                    <AvatarImage src={entries[0].avatar_url || undefined} />
                    <AvatarFallback className="bg-slate-700 text-slate-300">
                      {entries[0].user_display_name.slice(0, 2).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="absolute -bottom-1 -right-1 bg-yellow-500 text-slate-900 text-xs font-bold w-6 h-6 rounded-full flex items-center justify-center">
                    1
                  </div>
                </div>
                <span className="text-sm font-medium text-white mt-2 truncate max-w-[100px]">
                  {entries[0].user_display_name}
                </span>
                <span className="text-sm font-bold text-green-400">
                  +{formatPct(entries[0].return_pct)}
                </span>
              </div>
            )}

            {/* 3rd Place */}
            {entries[2] && (
              <div className="flex flex-col items-center">
                <div className="relative">
                  <Avatar className="w-12 h-12 ring-2 ring-amber-600 ring-offset-2 ring-offset-slate-900">
                    <AvatarImage src={entries[2].avatar_url || undefined} />
                    <AvatarFallback className="bg-slate-700 text-slate-300 text-xs">
                      {entries[2].user_display_name.slice(0, 2).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="absolute -bottom-1 -right-1 bg-amber-600 text-slate-900 text-xs font-bold w-5 h-5 rounded-full flex items-center justify-center">
                    3
                  </div>
                </div>
                <span className="text-xs text-slate-300 mt-2 truncate max-w-[80px]">
                  {entries[2].user_display_name}
                </span>
                <span className="text-xs font-semibold text-green-400">
                  +{formatPct(entries[2].return_pct)}
                </span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* List */}
      <div className="divide-y divide-slate-800">
        {loading ? (
          <div className="flex items-center justify-center h-32">
            <Clock className="w-6 h-6 animate-spin text-slate-500" />
          </div>
        ) : (
          entries.slice(3).map((entry) => (
            <div
              key={entry.id}
              className={cn(
                'p-3 flex items-center gap-3',
                entry.user_id === 'current' && 'bg-blue-900/20'
              )}
            >
              <span className="text-sm font-medium text-slate-500 w-6">
                {entry.rank}
              </span>
              
              <Avatar className="w-8 h-8">
                <AvatarImage src={entry.avatar_url || undefined} />
                <AvatarFallback className="bg-slate-700 text-slate-300 text-xs">
                  {entry.user_display_name.slice(0, 2).toUpperCase()}
                </AvatarFallback>
              </Avatar>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-white truncate">
                    {entry.user_display_name}
                  </span>
                  {entry.user_id === 'current' && (
                    <span className="text-xs text-blue-400">(You)</span>
                  )}
                </div>
                <div className="flex items-center gap-2 text-xs text-slate-400">
                  <span>{entry.total_trades} {t('trades')}</span>
                  <span>•</span>
                  <span>{entry.win_rate}% {t('winRate')}</span>
                </div>
              </div>

              <div className="text-right">
                <div className={cn(
                  'text-sm font-semibold',
                  entry.return_pct >= 0 ? 'text-green-400' : 'text-red-400'
                )}>
                  {entry.return_pct >= 0 ? '+' : ''}{formatPct(entry.return_pct)}
                </div>
                {getRankChange(entry.rank, entry.previous_rank || entry.rank)}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
