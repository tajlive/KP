'use client';

/**
 * ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 * LEADERBOARD COMPONENT
 * ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 * 
 * Displays top performing paper traders with:
 * - Rank badges (🥇🥈🥉)
 * - Timeframe filtering
 * - Copy trading functionality
 * - Privacy protection (anonymized names)
 * 
 * ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 */

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { 
  Trophy, 
  TrendingUp, 
  Copy, 
  Users, 
  Calendar,
  Crown,
} from 'lucide-react';

interface LeaderboardEntry {
  rank: number;
  sessionId: string;
  userId: string;
  username: string;
  avatarUrl: string | null;
  strategyName: string;
  totalReturn: number;
  winRate: number;
  totalTrades: number;
  profitAmount: number;
  followersCount: number;
  canCopy: boolean;
  isOwnSession: boolean;
}

type Timeframe = 'today' | 'week' | 'month' | 'all_time';

const TIMEFRAMES: { value: Timeframe; label: string }[] = [
  { value: 'today', label: 'I dag' },
  { value: 'week', label: 'Denne uken' },
  { value: 'month', label: 'Denne måneden' },
  { value: 'all_time', label: 'All tid' },
];

export function Leaderboard() {
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [timeframe, setTimeframe] = useState<Timeframe>('week');
  const [loading, setLoading] = useState(true);
  const [copying, setCopying] = useState<string | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    fetchLeaderboard();
  }, [timeframe]);

  async function fetchLeaderboard() {
    setLoading(true);
    try {
      const response = await fetch(
        `/api/auto-trading/leaderboard?timeframe=${timeframe}&limit=10`
      );

      if (!response.ok) {
        throw new Error('Failed to fetch leaderboard');
      }

      const data = await response.json();
      setLeaderboard(data.leaderboard || []);
    } catch (error) {
      console.error('Failed to fetch leaderboard:', error);
      toast({
        title: 'Feil',
        description: 'Kunne ikke laste leaderboard',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  }

  async function copyTrader(sessionId: string) {
    if (copying) return;

    setCopying(sessionId);
    try {
      const response = await fetch('/api/auto-trading/copy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId,
          initialCapital: 10000,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to start copying');
      }

      toast({
        title: 'Suksess!',
        description: 'Du følger nå denne traderen. Dine handler vil speile deres strategi.',
      });

      // Refresh leaderboard to update followers count
      fetchLeaderboard();

    } catch (error) {
      toast({
        title: 'Feil',
        description: error instanceof Error ? error.message : 'Kunne ikke starte copy trading',
        variant: 'destructive',
      });
    } finally {
      setCopying(null);
    }
  }

  const getRankBadge = (rank: number) => {
    if (rank === 1) return { emoji: '🥇', className: 'text-yellow-500' };
    if (rank === 2) return { emoji: '🥈', className: 'text-gray-400' };
    if (rank === 3) return { emoji: '🥉', className: 'text-amber-600' };
    return { emoji: `#${rank}`, className: 'text-muted-foreground' };
  };

  const getReturnColor = (value: number) => {
    if (value > 0) return 'text-green-600';
    if (value < 0) return 'text-red-600';
    return 'text-muted-foreground';
  };

  if (loading) {
    return (
      <Card className="w-full">
        <CardHeader>
          <div className="flex items-center justify-between">
            <Skeleton className="h-8 w-48" />
            <Skeleton className="h-10 w-64" />
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[...Array(5)].map((_, i) => (
              <Skeleton key={i} className="h-20 w-full" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full">
      <CardHeader className="pb-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <Trophy className="h-6 w-6 text-yellow-500" />
            <CardTitle>Topp Tradere</CardTitle>
          </div>

          <div className="flex gap-1 bg-accent rounded-lg p-1">
            {TIMEFRAMES.map((tf) => (
              <Button
                key={tf.value}
                variant={timeframe === tf.value ? 'secondary' : 'ghost'}
                size="sm"
                onClick={() => setTimeframe(tf.value)}
                className="text-xs"
              >
                {tf.label}
              </Button>
            ))}
          </div>
        </div>
      </CardHeader>

      <CardContent>
        {leaderboard.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <Trophy className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>Ingen tradere funnet for denne perioden</p>
            <p className="text-sm mt-2">Start paper trading for å komme på leaderboardet!</p>
          </div>
        ) : (
          <div className="space-y-3">
            {leaderboard.map((trader) => {
              const rankBadge = getRankBadge(trader.rank);
              
              return (
                <div
                  key={trader.sessionId}
                  className={`flex items-center gap-3 p-4 border rounded-lg transition-colors ${
                    trader.isOwnSession
                      ? 'bg-blue-50 dark:bg-blue-950 border-blue-200 dark:border-blue-800'
                      : 'hover:bg-accent'
                  }`}
                >
                  {/* Rank */}
                  <div className="flex-shrink-0 w-12 text-center">
                    <span className={`text-2xl ${rankBadge.className}`}>
                      {rankBadge.emoji}
                    </span>
                  </div>

                  {/* Avatar */}
                  <Avatar className="h-10 w-10 flex-shrink-0">
                    <AvatarImage src={trader.avatarUrl || undefined} />
                    <AvatarFallback className="bg-primary/10">
                      {trader.username?.[0]?.toUpperCase() || 'T'}
                    </AvatarFallback>
                  </Avatar>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-medium truncate">
                        {trader.username}
                      </span>
                      {trader.isOwnSession && (
                        <Badge variant="secondary" className="text-xs">
                          Du
                        </Badge>
                      )}
                      {trader.rank === 1 && (
                        <Crown className="h-4 w-4 text-yellow-500" />
                      )}
                    </div>
                    
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted-foreground mt-1">
                      <span>{trader.strategyName}</span>
                      <span className="hidden sm:inline">•</span>
                      <span>{trader.totalTrades} trades</span>
                      <span className="hidden sm:inline">•</span>
                      <span>{trader.winRate.toFixed(1)}% win rate</span>
                      {trader.followersCount > 0 && (
                        <>
                          <span className="hidden sm:inline">•</span>
                          <span className="flex items-center gap-1">
                            <Users className="h-3 w-3" />
                            {trader.followersCount}
                          </span>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Stats + Action */}
                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <div className={`text-lg font-bold ${getReturnColor(trader.totalReturn)}`}>
                        {trader.totalReturn > 0 ? '+' : ''}
                        {trader.totalReturn.toFixed(2)}%
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {trader.profitAmount > 0 ? '+' : ''}
                        {trader.profitAmount.toFixed(0)} kr
                      </div>
                    </div>

                    {!trader.isOwnSession && trader.canCopy && (
                      <Button
                        size="sm"
                        onClick={() => copyTrader(trader.sessionId)}
                        disabled={copying === trader.sessionId}
                        className="flex-shrink-0"
                      >
                        <Copy className="h-4 w-4 mr-2" />
                        {copying === trader.sessionId ? 'Kopierer...' : 'Følg'}
                      </Button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        <div className="mt-6 p-4 bg-blue-50 dark:bg-blue-950 rounded-lg border border-blue-200 dark:border-blue-800">
          <div className="flex items-start gap-3">
            <Calendar className="h-5 w-5 text-blue-600 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-blue-900 dark:text-blue-100">
                Om Copy Trading
              </p>
              <p className="text-sm text-blue-700 dark:text-blue-300 mt-1">
                Copy trading replikerer strategien, ikke de eksakte beløpene. 
                Din kapital og risk management styrer dine trade-størrelser.
              </p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
