'use client';

/**
 * Paper Trading Leaderboard
 * 
 * Displays top-performing paper traders with:
 * - Period filtering (daily/weekly/monthly/all-time)
 * - User ranking with highlighting for current user
 * - ROI, win rate, and risk metrics
 * - Responsive design with mobile support
 */

import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Trophy, 
  TrendingUp, 
  TrendingDown, 
  Activity, 
  Target,
  Shield,
  User,
  RefreshCw,
  Medal
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useUser } from '@/hooks/useUser';

interface LeaderboardEntry {
  userId: string;
  username: string;
  avatarUrl: string | null;
  rank: number;
  startingCapital: number;
  currentCapital: number;
  totalPnL: number;
  roi: number;
  totalTrades: number;
  winningTrades: number;
  winRate: number;
  sharpeRatio: number;
  maxDrawdown: number;
  riskScore: number;
}

type Period = 'daily' | 'weekly' | 'monthly' | 'all-time';

const PERIOD_LABELS: Record<Period, { no: string; en: string }> = {
  daily: { no: 'I dag', en: 'Today' },
  weekly: { no: 'Denne uken', en: 'This Week' },
  monthly: { no: 'Denne måneden', en: 'This Month' },
  'all-time': { no: 'Totalt', en: 'All Time' },
};

export function PaperTradingLeaderboard({ 
  locale = 'no',
  showFilters = true,
  limit = 100,
}: { 
  locale?: 'no' | 'en';
  showFilters?: boolean;
  limit?: number;
}) {
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [period, setPeriod] = useState<Period>('all-time');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  
  const { user } = useUser();
  const t = locale === 'en' ? 'en' : 'no';

  const fetchLeaderboard = useCallback(async () => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await fetch(
        `/api/paper-trading/leaderboard?period=${period}&limit=${limit}`,
        { cache: 'no-store' }
      );
      
      if (!response.ok) {
        throw new Error('Failed to fetch leaderboard');
      }
      
      const data = await response.json();
      setEntries(data.entries || []);
      setLastUpdated(new Date(data.lastUpdated));
    } catch (err) {
      console.error('Leaderboard fetch error:', err);
      setError(t === 'en' ? 'Failed to load leaderboard' : 'Kunne ikke laste leaderboard');
    } finally {
      setLoading(false);
    }
  }, [period, limit, t]);

  useEffect(() => {
    fetchLeaderboard();
    
    // Auto-refresh every 60 seconds
    const interval = setInterval(fetchLeaderboard, 60000);
    return () => clearInterval(interval);
  }, [fetchLeaderboard]);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat(locale === 'en' ? 'en-US' : 'nb-NO', {
      style: 'currency',
      currency: 'NOK',
      maximumFractionDigits: 0,
    }).format(value);
  };

  const formatPercent = (value: number) => {
    return `${value >= 0 ? '+' : ''}${value.toFixed(2)}%`;
  };

  const getRankIcon = (rank: number) => {
    switch (rank) {
      case 1:
        return <Trophy className="w-5 h-5 text-yellow-500" />;
      case 2:
        return <Medal className="w-5 h-5 text-slate-400" />;
      case 3:
        return <Medal className="w-5 h-5 text-amber-600" />;
      default:
        return <span className="text-sm font-medium text-slate-500 w-5 text-center">{rank}</span>;
    }
  };

  const getRiskBadge = (score: number) => {
    if (score >= 80) return { label: t === 'en' ? 'Low Risk' : 'Lav risiko', color: 'bg-green-500/10 text-green-500' };
    if (score >= 60) return { label: t === 'en' ? 'Medium Risk' : 'Medium risiko', color: 'bg-yellow-500/10 text-yellow-500' };
    if (score >= 40) return { label: t === 'en' ? 'High Risk' : 'Høy risiko', color: 'bg-orange-500/10 text-orange-500' };
    return { label: t === 'en' ? 'Very High Risk' : 'Svært høy risiko', color: 'bg-red-500/10 text-red-500' };
  };

  if (loading && entries.length === 0) {
    return <LeaderboardSkeleton />;
  }

  if (error) {
    return (
      <Card className="border-red-500/20">
        <CardContent className="p-8 text-center">
          <p className="text-red-500 mb-4">{error}</p>
          <Button onClick={fetchLeaderboard} variant="outline">
            <RefreshCw className="w-4 h-4 mr-2" />
            {t === 'en' ? 'Retry' : 'Prøv igjen'}
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-slate-800 bg-slate-950/50">
      <CardHeader className="pb-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-violet-500/10">
              <Trophy className="w-5 h-5 text-violet-500" />
            </div>
            <div>
              <CardTitle className="text-lg">
                {t === 'en' ? 'Paper Trading Leaderboard' : 'Paper Trading Leaderboard'}
              </CardTitle>
              <p className="text-sm text-slate-400">
                {entries.length} {t === 'en' ? 'active traders' : 'aktive tradere'}
              </p>
            </div>
          </div>
          
          {showFilters && (
            <Tabs value={period} onValueChange={(v) => setPeriod(v as Period)}>
              <TabsList className="bg-slate-900">
                {(['daily', 'weekly', 'monthly', 'all-time'] as Period[]).map((p) => (
                  <TabsTrigger 
                    key={p} 
                    value={p}
                    className="data-[state=active]:bg-violet-500 data-[state=active]:text-white"
                  >
                    {PERIOD_LABELS[p][t]}
                  </TabsTrigger>
                ))}
              </TabsList>
            </Tabs>
          )}
        </div>
      </CardHeader>

      <CardContent className="pt-0">
        {/* Header */}
        <div className="grid grid-cols-12 gap-4 px-4 py-3 text-xs font-medium text-slate-500 uppercase tracking-wider border-b border-slate-800">
          <div className="col-span-1 text-center">#</div>
          <div className="col-span-3">{t === 'en' ? 'Trader' : 'Trader'}</div>
          <div className="col-span-2 text-right">{t === 'en' ? 'Return' : 'Avkastning'}</div>
          <div className="col-span-2 text-right">{t === 'en' ? 'Win Rate' : 'Win Rate'}</div>
          <div className="col-span-2 text-right">{t === 'en' ? 'Trades' : 'Handler'}</div>
          <div className="col-span-2 text-center">{t === 'en' ? 'Risk' : 'Risiko'}</div>
        </div>

        {/* Entries */}
        <div className="divide-y divide-slate-800">
          {entries.map((entry) => {
            const isCurrentUser = user?.id === entry.userId;
            const riskBadge = getRiskBadge(entry.riskScore);
            
            return (
              <div
                key={entry.userId}
                className={cn(
                  'grid grid-cols-12 gap-4 px-4 py-4 items-center hover:bg-slate-900/50 transition-colors',
                  isCurrentUser && 'bg-violet-500/5 hover:bg-violet-500/10'
                )}
              >
                {/* Rank */}
                <div className="col-span-1 flex justify-center">
                  {getRankIcon(entry.rank)}
                </div>

                {/* Trader */}
                <div className="col-span-3 flex items-center gap-3">
                  <Avatar className="w-8 h-8">
                    <AvatarImage src={entry.avatarUrl || undefined} />
                    <AvatarFallback className="bg-slate-800 text-slate-400 text-xs">
                      <User className="w-4 h-4" />
                    </AvatarFallback>
                  </Avatar>
                  <div className="min-w-0">
                    <p className="font-medium text-sm truncate">
                      {entry.username}
                      {isCurrentUser && (
                        <Badge variant="outline" className="ml-2 text-xs border-violet-500 text-violet-400">
                          {t === 'en' ? 'You' : 'Deg'}
                        </Badge>
                      )}
                    </p>
                    <p className="text-xs text-slate-500">
                      {formatCurrency(entry.currentCapital)}
                    </p>
                  </div>
                </div>

                {/* ROI */}
                <div className="col-span-2 text-right">
                  <div className={cn(
                    'font-medium text-sm',
                    entry.roi >= 0 ? 'text-green-400' : 'text-red-400'
                  )}>
                    {entry.roi >= 0 ? '+' : ''}{entry.roi.toFixed(2)}%
                  </div>
                  <div className="text-xs text-slate-500">
                    {entry.totalPnL >= 0 ? '+' : ''}{formatCurrency(entry.totalPnL)}
                  </div>
                </div>

                {/* Win Rate */}
                <div className="col-span-2 text-right">
                  <div className="font-medium text-sm">{entry.winRate.toFixed(1)}%</div>
                  <div className="text-xs text-slate-500">
                    {entry.winningTrades}/{entry.totalTrades}
                  </div>
                </div>

                {/* Total Trades */}
                <div className="col-span-2 text-right">
                  <div className="font-medium text-sm">{entry.totalTrades}</div>
                  <div className="text-xs text-slate-500">
                    <Activity className="w-3 h-3 inline mr-1" />
                    {entry.sharpeRatio.toFixed(2)}
                  </div>
                </div>

                {/* Risk Score */}
                <div className="col-span-2 flex justify-center">
                  <Badge className={cn('text-xs', riskBadge.color)}>
                    <Shield className="w-3 h-3 mr-1" />
                    {riskBadge.label}
                  </Badge>
                </div>
              </div>
            );
          })}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-4 py-3 border-t border-slate-800 text-xs text-slate-500">
          <span>
            {lastUpdated && (
              <>
                {t === 'en' ? 'Last updated' : 'Sist oppdatert'}: {lastUpdated.toLocaleTimeString(locale)}
              </>
            )}
          </span>
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={fetchLeaderboard}
            disabled={loading}
            className="text-xs"
          >
            <RefreshCw className={cn('w-3 h-3 mr-1', loading && 'animate-spin')} />
            {t === 'en' ? 'Refresh' : 'Oppdater'}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function LeaderboardSkeleton() {
  return (
    <Card className="border-slate-800">
      <CardHeader>
        <div className="flex items-center gap-3">
          <Skeleton className="w-10 h-10 rounded-lg" />
          <div>
            <Skeleton className="w-48 h-5 mb-2" />
            <Skeleton className="w-32 h-4" />
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="flex items-center gap-4">
              <Skeleton className="w-8 h-8 rounded-full" />
              <Skeleton className="w-full h-12" />
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

export default PaperTradingLeaderboard;
