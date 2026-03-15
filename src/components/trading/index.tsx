// ============================================================================
// src/components/UnifiedTradingDashboard.tsx
// Main dashboard — Paper/Live toggle, real-time stats, trade history
// ============================================================================
'use client';

import { useState, useEffect, useCallback } from 'react';
import { toast } from 'sonner';
import { createBrowserClient } from '@supabase/ssr';
import type { TradingSession, Trade, TradingMode } from '@/lib/shared';

interface DashboardProps {
  initialSession?: TradingSession | null;
}

export function UnifiedTradingDashboard({ initialSession }: DashboardProps) {
  const [session, setSession] = useState<TradingSession | null>(initialSession ?? null);
  const [trades, setTrades] = useState<Trade[]>([]);
  const [mode, setMode] = useState<TradingMode>('paper');
  const [isLoading, setIsLoading] = useState(false);

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  // Real-time subscription for session updates
  useEffect(() => {
    if (!session?.id) return;

    const channel = supabase
      .channel(`session-${session.id}`)
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'trading_sessions',
        filter: `id=eq.${session.id}`,
      }, (payload) => {
        setSession(payload.new as TradingSession);
      })
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'trades',
        filter: `session_id=eq.${session.id}`,
      }, (payload) => {
        setTrades(prev => [payload.new as Trade, ...prev]);
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [session?.id, supabase]);

  // Fetch trades for active session
  useEffect(() => {
    if (!session?.id) return;

    async function fetchTrades() {
      const res = await fetch(`/api/auto-trading/trades?session_id=${session!.id}&limit=50`);
      if (res.ok) {
        const data = await res.json();
        setTrades(data.trades ?? []);
      }
    }
    fetchTrades();
  }, [session?.id]);

  const handleModeToggle = useCallback(async () => {
    if (session?.status === 'active') {
      // Can't switch mode while bot is running
      toast.error('Stopp boten før du bytter modus');
      return;
    }
    setMode(prev => prev === 'paper' ? 'live' : 'paper');
  }, [session?.status]);

  const pnlColor = (session?.total_pnl ?? 0) >= 0 ? 'text-green-500' : 'text-red-500';
  const winRate = session && session.total_trades > 0
    ? ((session.winning_trades / session.total_trades) * 100).toFixed(1)
    : '0.0';

  return (
    <div className="space-y-6">
      {/* Mode Toggle */}
      <div className="flex items-center justify-between bg-gray-900 rounded-xl p-4">
        <div className="flex items-center gap-3">
          <span className={`text-sm font-medium ${mode === 'paper' ? 'text-blue-400' : 'text-gray-500'}`}>
            📝 Paper
          </span>
          <button
            type="button"
            onClick={handleModeToggle}
            aria-label={mode === 'paper' ? 'Bytt til live-handel' : 'Bytt til papirhandel'}
            className={`relative w-14 h-7 rounded-full transition-colors ${
              mode === 'live' ? 'bg-green-500' : 'bg-gray-600'
            }`}
            disabled={session?.status === 'active'}
          >
            <span className={`absolute top-0.5 left-0.5 w-6 h-6 rounded-full bg-white transition-transform ${
              mode === 'live' ? 'translate-x-7' : ''
            }`} />
          </button>
          <span className={`text-sm font-medium ${mode === 'live' ? 'text-green-400' : 'text-gray-500'}`}>
            ⚡ Live
          </span>
        </div>
        {session?.status === 'active' && (
          <span className="flex items-center gap-2 text-sm text-green-400">
            <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
            Bot aktiv
          </span>
        )}
        {session?.status === 'crashed' && (
          <span className="flex items-center gap-2 text-sm text-yellow-400">
            <span className="w-2 h-2 rounded-full bg-yellow-400 animate-pulse" />
            Gjenoppretter...
          </span>
        )}
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard
          label="Kapital"
          value={`${(session?.current_capital ?? 1_000_000).toLocaleString('no-NO')} NOK`}
        />
        <StatCard
          label="Total P&L"
          value={`${(session?.total_pnl ?? 0) >= 0 ? '+' : ''}${(session?.total_pnl ?? 0).toLocaleString('no-NO')} NOK`}
          className={pnlColor}
        />
        <StatCard
          label="Win Rate"
          value={`${winRate}%`}
        />
        <StatCard
          label="Trades"
          value={String(session?.total_trades ?? 0)}
        />
      </div>

      {/* Open Position */}
      {session?.open_position && (
        <div className="bg-gray-800 rounded-xl p-4 border border-blue-500/20">
          <h3 className="text-sm text-gray-400 mb-2">Åpen posisjon</h3>
          <div className="flex justify-between items-center">
            <div>
              <span className="text-lg font-bold text-white">
                {session.open_position.quantity.toFixed(6)} {session.trading_pair}
              </span>
              <span className="text-sm text-gray-400 ml-2">
                @ {session.open_position.entry_price.toLocaleString('no-NO')}
              </span>
            </div>
            <span className={`text-sm font-medium px-2 py-1 rounded ${
              session.open_position.side === 'long' ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'
            }`}>
              {session.open_position.side.toUpperCase()}
            </span>
          </div>
        </div>
      )}

      {/* Recent Trades */}
      <div className="bg-gray-900 rounded-xl overflow-hidden">
        <div className="p-4 border-b border-gray-800">
          <h3 className="font-medium text-white">Siste trades</h3>
        </div>
        <div className="divide-y divide-gray-800">
          {trades.length === 0 ? (
            <p className="p-4 text-gray-500 text-sm">Ingen trades ennå. Start boten for å begynne.</p>
          ) : (
            trades.slice(0, 20).map((trade) => (
              <div key={trade.id} className="flex justify-between items-center p-3 hover:bg-gray-800/50">
                <div className="flex items-center gap-3">
                  <span className={`px-2 py-0.5 rounded text-xs font-bold ${
                    trade.side === 'buy' ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'
                  }`}>
                    {trade.side === 'buy' ? 'KJØP' : 'SALG'}
                  </span>
                  <div>
                    <span className="text-sm text-white">{trade.quantity.toFixed(6)} {trade.trading_pair}</span>
                    {trade.is_copy && <span className="text-xs text-emerald-400 ml-2">📋 Kopiert</span>}
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-sm text-white">{trade.price.toLocaleString('no-NO')}</div>
                  {trade.realized_pnl !== null && (
                    <div className={`text-xs ${trade.realized_pnl >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                      {trade.realized_pnl >= 0 ? '+' : ''}{trade.realized_pnl.toLocaleString('no-NO')} NOK
                    </div>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

function StatCard({ label, value, className = '' }: { label: string; value: string; className?: string }) {
  return (
    <div className="bg-gray-800 rounded-xl p-4">
      <div className="text-xs text-gray-400 mb-1">{label}</div>
      <div className={`text-lg font-bold ${className || 'text-white'}`}>{value}</div>
    </div>
  );
}


// ============================================================================
// src/components/AutoTradingControls.tsx
// Start/Stop bot, strategy selector, config
// ============================================================================

const STRATEGIES = [
  { id: 'dca', name: 'DCA (Dollar Cost Averaging)', description: 'Kjøp fast beløp med jevne mellomrom' },
  { id: 'trend_follow', name: 'Trend Following', description: 'Kjøp når SMA krysser over, selg når den krysser under' },
  { id: 'multi_signal', name: 'Multi-Signal', description: 'Kombinerer RSI + MACD + Bollinger Bands' },
  { id: 'grid', name: 'Grid Trading', description: 'Plasserer ordrer i et prisgitter' },
] as const;

const PAIRS = ['BTC/USDT', 'ETH/USDT', 'SOL/USDT', 'XRP/USDT', 'ADA/USDT'];

interface AutoTradingControlsProps {
  currentSession?: { id: string; status: string; strategy_id: string } | null;
  mode: 'paper' | 'live';
  onSessionChange: () => void;
}

export function AutoTradingControls({ currentSession, mode, onSessionChange }: AutoTradingControlsProps) {
  const [strategyId, setStrategyId] = useState<'dca' | 'trend_follow' | 'multi_signal' | 'grid'>(STRATEGIES[0].id);
  const [pair, setPair] = useState(PAIRS[0]);
  const [capital, setCapital] = useState(100000);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isActive = currentSession?.status === 'active';

  async function handleStart() {
    setIsLoading(true);
    setError(null);

    try {
      const res = await fetch('/api/auto-trading/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          strategy_id: strategyId,
          trading_pair: pair,
          mode,
          initial_capital: capital,
          strategy_config: getDefaultConfig(strategyId),
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        if (res.status === 402) {
          setError(data.error ?? 'Oppgrader abonnementet ditt for denne funksjonen');
        } else {
          setError(data.error ?? 'Kunne ikke starte bot');
        }
        return;
      }

      onSessionChange();
    } catch (err) {
      setError('Nettverksfeil. Prøv igjen.');
    } finally {
      setIsLoading(false);
    }
  }

  async function handleStop() {
    if (!currentSession) return;
    setIsLoading(true);

    try {
      const res = await fetch('/api/auto-trading/stop', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ session_id: currentSession.id }),
      });

      if (res.ok) onSessionChange();
    } catch {
      setError('Kunne ikke stoppe bot');
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="bg-gray-900 rounded-xl p-6 space-y-4">
      <h2 className="text-lg font-bold text-white">Auto-Trading Bot</h2>

      {!isActive && (
        <>
          {/* Strategy Selector */}
          <div>
            <label htmlFor="sim-strategy" className="block text-sm text-gray-400 mb-1">Strategi</label>
            <select
              id="sim-strategy"
              value={strategyId}
              onChange={(e) => setStrategyId(e.target.value as 'dca' | 'trend_follow' | 'multi_signal' | 'grid')}
              className="w-full bg-gray-800 text-white rounded-lg px-3 py-2 border border-gray-700"
            >
              {STRATEGIES.map(s => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
            <p className="text-xs text-gray-500 mt-1">
              {STRATEGIES.find(s => s.id === strategyId)?.description}
            </p>
          </div>

          {/* Trading Pair */}
          <div>
            <label htmlFor="sim-pair" className="block text-sm text-gray-400 mb-1">Handelspar</label>
            <select
              id="sim-pair"
              value={pair}
              onChange={(e) => setPair(e.target.value)}
              className="w-full bg-gray-800 text-white rounded-lg px-3 py-2 border border-gray-700"
            >
              {PAIRS.map(p => (
                <option key={p} value={p}>{p}</option>
              ))}
            </select>
          </div>

          {/* Capital */}
          <div>
            <label htmlFor="sim-capital" className="block text-sm text-gray-400 mb-1">
              Startkapital ({mode === 'paper' ? 'lekepenger' : 'ekte'})
            </label>
            <input
              id="sim-capital"
              type="number"
              value={capital}
              onChange={(e) => setCapital(Number(e.target.value))}
              className="w-full bg-gray-800 text-white rounded-lg px-3 py-2 border border-gray-700"
              min={1000}
              max={mode === 'paper' ? 10_000_000 : 1_000_000}
            />
          </div>
        </>
      )}

      {error && (
        <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-3">
          <p className="text-sm text-red-400">{error}</p>
        </div>
      )}

      {/* Start/Stop Button */}
      <button
        onClick={isActive ? handleStop : handleStart}
        disabled={isLoading}
        className={`w-full py-3 rounded-xl font-bold text-white transition-colors ${
          isActive
            ? 'bg-red-500 hover:bg-red-600'
            : 'bg-green-500 hover:bg-green-600'
        } ${isLoading ? 'opacity-50 cursor-not-allowed' : ''}`}
      >
        {isLoading ? 'Vennligst vent...' : isActive ? '⏹ Stopp Bot' : '▶ Start Bot'}
      </button>

      {isActive && currentSession && (
        <p className="text-xs text-gray-500 text-center">
          Strategi: {STRATEGIES.find(s => s.id === currentSession.strategy_id)?.name ?? currentSession.strategy_id}
        </p>
      )}
    </div>
  );
}

function getDefaultConfig(strategyId: string): Record<string, unknown> {
  switch (strategyId) {
    case 'dca':
      return { interval_minutes: 60, position_size: 0.02, profit_target_pct: 5, stop_loss_pct: -10 };
    case 'trend_follow':
      return { fast_period: 12, slow_period: 26 };
    case 'multi_signal':
      return { rsi_period: 14, macd_fast: 12, macd_slow: 26, bb_period: 20 };
    case 'grid':
      return { grid_size_pct: 2, levels: 5 };
    default:
      return {};
  }
}


// ============================================================================
// src/components/LeaderboardCard.tsx
// Top traders with "Follow" button
// ============================================================================
// Uses useState and useEffect already imported at top of file
import type { LeaderboardEntry } from '@/lib/shared';

export function LeaderboardCard() {
  const [leaders, setLeaders] = useState<(LeaderboardEntry & { is_following: boolean })[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [followLoading, setFollowLoading] = useState<string | null>(null);

  useEffect(() => {
    fetchLeaderboard();
    // Refresh every 60 seconds
    const interval = setInterval(fetchLeaderboard, 60_000);
    return () => clearInterval(interval);
  }, []);

  async function fetchLeaderboard() {
    try {
      const res = await fetch('/api/copy-trading/leaders?limit=10');
      if (res.ok) {
        const data = await res.json();
        setLeaders(data.leaders);
      }
    } finally {
      setIsLoading(false);
    }
  }

  async function handleFollow(leaderId: string) {
    setFollowLoading(leaderId);
    try {
      const res = await fetch('/api/copy-trading/follow', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ leader_id: leaderId }),
      });

      const data = await res.json();

      if (!res.ok) {
        if (res.status === 402) {
          // Show paywall
          toast.error(data.error ?? 'Oppgrader for å kopiere tradere');
        } else {
          toast.error(data.error ?? 'Feil');
        }
        return;
      }

      // Refresh leaderboard to update follow status
      fetchLeaderboard();
    } finally {
      setFollowLoading(null);
    }
  }

  if (isLoading) {
    return <div className="bg-gray-900 rounded-xl p-6 animate-pulse h-96" />;
  }

  return (
    <div className="bg-gray-900 rounded-xl overflow-hidden">
      <div className="p-4 border-b border-gray-800 flex justify-between items-center">
        <h2 className="font-bold text-white">🏆 Topp Tradere (30 dager)</h2>
        <span className="text-xs text-gray-500">Oppdateres hvert minutt</span>
      </div>

      <div className="divide-y divide-gray-800">
        {leaders.map((leader, idx) => (
          <div key={leader.user_id} className="flex items-center justify-between p-4 hover:bg-gray-800/50">
            <div className="flex items-center gap-3">
              {/* Rank */}
              <span className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                idx === 0 ? 'bg-yellow-500 text-black' :
                idx === 1 ? 'bg-gray-300 text-black' :
                idx === 2 ? 'bg-amber-700 text-white' :
                'bg-gray-700 text-gray-300'
              }`}>
                {idx + 1}
              </span>

              {/* Avatar & Name */}
              <div>
                <div className="text-white font-medium">{leader.display_name}</div>
                <div className="text-xs text-gray-500">
                  {leader.total_trades} trades · {leader.follower_count} følgere
                </div>
              </div>
            </div>

            <div className="flex items-center gap-4">
              {/* Stats */}
              <div className="text-right">
                <div className={`font-bold ${leader.total_pnl >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                  {leader.total_pnl >= 0 ? '+' : ''}{leader.total_pnl.toLocaleString('no-NO')} NOK
                </div>
                <div className="text-xs text-gray-500">
                  ROI: {leader.roi_percent >= 0 ? '+' : ''}{leader.roi_percent}% · WR: {leader.win_rate}%
                </div>
              </div>

              {/* Follow Button */}
              <button
                onClick={() => handleFollow(leader.user_id)}
                disabled={leader.is_following || followLoading === leader.user_id}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  leader.is_following
                    ? 'bg-gray-700 text-gray-400 cursor-default'
                    : 'bg-blue-500 hover:bg-blue-600 text-white'
                } ${followLoading === leader.user_id ? 'opacity-50' : ''}`}
              >
                {leader.is_following ? '✓ Følger' : 'Følg'}
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
