'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { Medal, Bot, BookOpen, Zap, ArrowUp, ArrowDown, TrendingUp, Activity } from 'lucide-react';
import { CARD, BRAND } from '@/lib/design/tokens';
import { useRealtimePrices } from '@/lib/hooks/useRealtimePrices';
import { createClient } from '@/lib/supabase/client';
import ReverseTrial from './ReverseTrial';
import { SocialProof } from './SocialProof';
import { StreakBadge } from './StreakBadge';
import FirstTradeCard from './FirstTradeCard';

const DASHBOARD_SYMBOLS = ['BTCUSDT', 'ETHUSDT', 'SOLUSDT'];

const COIN_GRADIENTS: Record<string, string> = {
  BTCUSDT: 'from-[#F7931A] to-[#E8860A]',
  ETHUSDT: 'from-[#627EEA] to-[#4A63D2]',
  SOLUSDT: 'from-[#9945FF] to-[#14F195]',
  BNBUSDT: 'from-[#F3BA2F] to-[#E8A80C]',
};

interface Trade {
  id: string;
  trading_pair: string;
  side: string;
  quantity: number;
  price: number;
  total_value: number;
  status: string;
  mode: string;
  created_at: string;
  amount?: number;
  qty?: number;
  symbol?: string;
  [key: string]: unknown;
}

interface ActiveSession {
  id: string;
  mode: string;
  status: string;
  strategy_id: string;
  current_capital_nok: number;
  starting_capital_nok: number;
  total_pnl: number;
  total_trades: number;
  winning_trades?: number;
  created_at: string;
  name?: string;
  pnl?: number;
  [key: string]: unknown;
}

interface PortfolioDashboardProps {
  userId: string;
  locale: string;
  paperBalance: number;
  tier: string;
  trades: Trade[];
  activeSession: ActiveSession | null;
  trialEndsAt?: string | null;
}

function normalizeTradeSymbol(trade: Trade): string {
  if (typeof trade.symbol === 'string' && trade.symbol.length > 0) {
    return trade.symbol;
  }
  if (typeof trade.trading_pair === 'string' && trade.trading_pair.length > 0) {
    return trade.trading_pair.replace('/', '');
  }
  return '';
}

function normalizeTradeQty(trade: Trade): number {
  if (typeof trade.qty === 'number') return trade.qty;
  if (typeof trade.quantity === 'number') return trade.quantity;
  return 0;
}

function normalizeTradeAmount(trade: Trade): number {
  if (typeof trade.amount === 'number') return trade.amount;
  if (typeof trade.total_value === 'number') return trade.total_value;
  return 0;
}

function isBuyTrade(trade: Trade): boolean {
  return String(trade.side).toUpperCase() === 'BUY';
}

function formatNOK(n: number) {
  return new Intl.NumberFormat('no-NO', {
    style: 'currency',
    currency: 'NOK',
    maximumFractionDigits: 0,
  }).format(n);
}

function relativeTime(date: Date, locale: string) {
  const diff = Date.now() - date.getTime();
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return locale === 'no' ? 'Nå' : 'Just now';
  if (minutes < 60)
    return locale === 'no' ? `${minutes}m siden` : `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24)
    return locale === 'no' ? `${hours}t siden` : `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return locale === 'no' ? `${days}d siden` : `${days}d ago`;
}

const LEADERBOARD = [
  { rank: 1, name: 'KryptoKonge', pct: '+14.2%' },
  { rank: 2, name: 'SatoshiFansen', pct: '+11.8%' },
  { rank: 3, name: 'HodlQueen', pct: '+9.4%' },
];

/** Kort med skygge og 200ms overgang (tokens CARD.hover med p-5) */
const cardBase = `${CARD.hover.replace('p-6', 'p-5')}`;

export default function PortfolioDashboard({
  userId,
  locale,
  paperBalance,
  tier,
  trialEndsAt,
  trades,
  activeSession,
}: PortfolioDashboardProps) {
  const no = locale === 'no';
  const { coins: liveCoins, loading: pricesLoading, error: pricesError } = useRealtimePrices(DASHBOARD_SYMBOLS);

  // Live trades: start with server data, append new trades via realtime
  const [liveTrades, setLiveTrades] = useState<Trade[]>(trades);
  useEffect(() => {
    setLiveTrades(trades);
  }, [trades]);
  useEffect(() => {
    if (!userId) return;
    const supabase = createClient();
    const channel = supabase
      .channel(`dashboard-trades-${userId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'trades',
          filter: `user_id=eq.${userId}`,
        },
        (payload) => {
          const row = payload.new as Record<string, unknown>;
          if (row?.mode !== 'paper') return;
          const t: Trade = {
            id: String(row.id),
            trading_pair: String(row.trading_pair ?? ''),
            side: String(row.side ?? ''),
            quantity: Number(row.quantity ?? 0),
            price: Number(row.price ?? 0),
            total_value: Number(row.total_value ?? (Number(row.price ?? 0) * Number(row.quantity ?? 0))),
            status: String(row.status ?? ''),
            mode: String(row.mode ?? 'paper'),
            created_at: String(row.created_at ?? new Date().toISOString()),
          };
          setLiveTrades((prev) => [t, ...prev].slice(0, 30));
        },
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId]);

  const displayTrades = liveTrades;
  const pnl = displayTrades.reduce((sum: number, t: Trade) => {
    const tradeAmount = normalizeTradeAmount(t);
    const val = isBuyTrade(t) ? -tradeAmount : tradeAmount;
    return sum + val;
  }, 0);
  const pnlPercent = paperBalance > 0 ? (pnl / paperBalance) * 100 : 0;

  type Position = { symbol: string; qty: number; value: number };
  const positions = displayTrades.reduce((acc: Record<string, Position>, t: Trade) => {
    const sym = normalizeTradeSymbol(t);
    if (!sym) return acc;
    if (!acc[sym]) acc[sym] = { symbol: sym, qty: 0, value: 0 };
    const sign = isBuyTrade(t) ? 1 : -1;
    acc[sym].qty += sign * normalizeTradeQty(t);
    acc[sym].value += sign * normalizeTradeAmount(t);
    return acc;
  }, {} as Record<string, Position>);
  const positionList = Object.values(positions).filter((p: Position) => p.qty > 0);

  const priceForSymbol = (sym: string) => {
    const key = sym.length <= 4 && !sym.includes('USDT') ? `${sym}USDT` : sym;
    return liveCoins.find((c) => c.symbol === key)?.price ?? 0;
  };
  const gradientForSymbol = (sym: string) => {
    const key = sym.length <= 4 && !sym.includes('USDT') ? `${sym}USDT` : sym;
    return COIN_GRADIENTS[key] ?? 'from-gray-400 to-gray-500';
  };

  const recentTrades = displayTrades.slice(0, 6);
  const hasRecentActivity = recentTrades.some(
    (t) => t.created_at && Date.now() - new Date(t.created_at).getTime() < 3600000
  );
  const winRate =
    activeSession &&
    typeof activeSession.winning_trades === 'number' &&
    (activeSession.total_trades ?? 0) > 0
      ? Math.round((activeSession.winning_trades / activeSession.total_trades) * 100)
      : null;
  const totalTradesFromSession = activeSession?.total_trades ?? displayTrades.length;

  return (
    <div className="space-y-4">
      <ReverseTrial trialEndsAt={trialEndsAt ?? null} tier={tier} locale={locale} />

      <FirstTradeCard userId={userId} locale={locale} hasTrades={trades.length > 0} />

      {/* Widget 1: Portfolio Card — her ser du hvordan det går med lekepengene */}
      <div className={`${BRAND.gradient} rounded-2xl p-6 text-white shadow-[0_8px_32px_rgba(0,82,255,0.15)] animate-fade-in-up stagger-1`}>
        <p className="text-sm font-medium text-white/70 uppercase tracking-wider">
          {no ? 'Lekepenger' : 'Virtual money'}
        </p>
        <p
          className="text-3xl sm:text-4xl font-bold mt-1"
          style={{ fontVariantNumeric: 'tabular-nums', letterSpacing: '-0.02em' }}
        >
          {formatNOK(paperBalance)}
        </p>
        <div className="flex items-center gap-2 mt-2">
          <span className={pnl >= 0 ? 'text-green-300 font-medium' : 'text-red-300 font-medium'}>
            {pnl >= 0 ? '+' : ''}
            {formatNOK(pnl)} ({pnlPercent.toFixed(1)}%)
          </span>
          <span className="text-white/50 text-sm">
            {no ? 'Gevinst/tap totalt' : 'Total P&L'}
          </span>
        </div>
        <p className="text-white/60 text-xs mt-3">
          {no ? 'Posisjoner og handler vises under.' : 'Positions and trades shown below.'}
        </p>
      </div>

      {/* Widget 2: Live Prices (Binance, oppdatert ca. hvert 10. sekund) */}
      <div className="animate-fade-in-up stagger-2">
        <div className="flex items-center gap-2 mb-2">
          <span className="inline-flex items-center gap-1.5 text-xs font-medium text-[#8E95A9]">
            <span className="relative flex h-2 w-2" aria-hidden>
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#16A34A] opacity-75" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-[#16A34A]" />
            </span>
            {no ? 'Live priser' : 'Live prices'}
          </span>
        </div>
      <div className="flex gap-3 overflow-x-auto pb-1 lg:grid lg:grid-cols-3 lg:overflow-visible">
        {pricesLoading && liveCoins.length === 0 ? (
          [1, 2, 3].map((i) => (
            <div key={i} className={`${cardBase} min-w-[200px] flex-shrink-0 lg:min-w-0 h-[88px] animate-pulse bg-[#F1F3F9]`} />
          ))
        ) : pricesError ? (
          <div className={`${cardBase} min-w-[200px] lg:col-span-3 p-4 text-[#8E95A9] text-sm`}>
            {no ? 'Kunne ikke hente priser. Prøv igjen senere.' : 'Could not load prices. Try again later.'}
          </div>
        ) : (
          liveCoins.map((coin) => (
            <div
              key={coin.symbol}
              className={`${cardBase} min-w-[200px] flex-shrink-0 lg:min-w-0`}
            >
              <div className="flex items-center gap-3">
                <div
                  className={`w-10 h-10 rounded-full bg-gradient-to-br ${COIN_GRADIENTS[coin.symbol] ?? 'from-gray-400 to-gray-500'} flex items-center justify-center text-white font-bold text-sm`}
                >
                  {coin.symbol.replace('USDT', '')[0]}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-[#1A1D26]">{coin.name}</p>
                  <p className="text-xs text-[#8E95A9]">{coin.symbol.replace('USDT', '')}</p>
                </div>
              </div>
              <div className="mt-3 flex items-end justify-between">
                <p
                  className="text-base font-semibold text-[#1A1D26]"
                  style={{ fontVariantNumeric: 'tabular-nums' }}
                >
                  {formatNOK(coin.price)}
                </p>
                <span
                  className={`text-sm font-medium tabular-nums ${coin.change24h >= 0 ? 'text-[#16A34A]' : 'text-[#DC2626]'}`}
                >
                  {coin.change24h >= 0 ? '+' : ''}
                  {coin.change24h.toFixed(1)}%
                </span>
              </div>
            </div>
          ))
        )}
      </div>
      </div>
      {liveCoins.length > 0 && (
        <p className="text-[10px] text-[#8E95A9] animate-fade-in-up stagger-2 -mt-1">
          {no ? 'Priser fra Binance, oppdatert ca. hvert 10. sekund.' : 'Prices from Binance, updated approximately every 10 seconds.'}
        </p>
      )}

      {/* Performance Card — som konkurrenter (win rate, handler, P&L) */}
      {(totalTradesFromSession > 0 || trades.length > 0) && (
        <div className={`${cardBase} animate-fade-in-up stagger-2`}>
          <div className="flex items-center gap-2 mb-3">
            <TrendingUp className="w-5 h-5 text-[#0052FF]" />
            <h3 className="text-lg font-semibold text-[#1A1D26]">
              {no ? 'Dine resultater' : 'Your performance'}
            </h3>
          </div>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <p className="text-xs text-[#8E95A9] uppercase tracking-wider font-medium">
                {no ? 'Handler' : 'Trades'}
              </p>
              <p className="text-xl font-bold text-[#1A1D26] tabular-nums">
                {totalTradesFromSession}
              </p>
            </div>
            <div>
              <p className="text-xs text-[#8E95A9] uppercase tracking-wider font-medium">
                {no ? 'Win rate' : 'Win rate'}
              </p>
              <p
                className={`text-xl font-bold tabular-nums ${
                  winRate != null
                    ? winRate >= 50
                      ? 'text-[#16A34A]'
                      : 'text-[#DC2626]'
                    : 'text-[#1A1D26]'
                }`}
              >
                {winRate != null ? `${winRate}%` : '—'}
              </p>
            </div>
            <div>
              <p className="text-xs text-[#8E95A9] uppercase tracking-wider font-medium">
                {no ? 'P&L' : 'P&L'}
              </p>
              <p
                className={`text-xl font-bold tabular-nums ${
                  pnlPercent >= 0 ? 'text-[#16A34A]' : 'text-[#DC2626]'
                }`}
              >
                {pnlPercent >= 0 ? '+' : ''}
                {pnlPercent.toFixed(1)}%
              </p>
            </div>
          </div>
        </div>
      )}

      {/* CTA: Se full oversikt med grafer og signaler (for brukere med aktivitet) */}
      {(trades.length > 0 || activeSession) && (
        <Link
          href={`/${locale}/paper-trading`}
          className={`flex items-center justify-between ${cardBase} group animate-fade-in-up stagger-2 border-2 border-[#0052FF]/20 hover:border-[#0052FF]/40`}
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#0052FF]/10 flex items-center justify-center group-hover:bg-[#0052FF]/20 transition-colors">
              <Activity className="w-5 h-5 text-[#0052FF]" />
            </div>
            <div>
              <p className="text-sm font-semibold text-[#1A1D26] group-hover:text-[#0052FF] transition-colors">
                {no ? 'Grafer, signaler og full oversikt' : 'Charts, signals & full overview'}
              </p>
              <p className="text-xs text-[#8E95A9]">
                {no ? 'Se porteføljegraf, live handelsfeed og bot-status' : 'View portfolio chart, live trade feed and bot status'}
              </p>
            </div>
          </div>
          <span className="text-[#0052FF] text-sm font-medium group-hover:underline">
            {no ? 'Åpne' : 'Open'} →
          </span>
        </Link>
      )}

      <SocialProof locale={locale} />

      {/* Widget 3 + 4: Positions & Recent Trades (2-col on desktop) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 animate-fade-in-up stagger-3">
        {/* Widget 3: Positions */}
        <div className={cardBase}>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-[#1A1D26]">
              {no ? 'Mine posisjoner' : 'My positions'}
            </h3>
            <Link
              href={`/${locale}/handelshistorikk`}
              className={`text-sm font-medium ${BRAND.link}`}
            >
              {no ? 'Se alle' : 'See all'}
            </Link>
          </div>
          {positionList.length === 0 ? (
            <div className="py-8 text-center">
              <p className="text-[#8E95A9] text-sm">
                {no
                  ? 'Ingen posisjoner ennå. Kjøp din første coin!'
                  : 'No positions yet. Buy your first coin!'}
              </p>
            </div>
          ) : (
            <ul className="space-y-3">
              {positionList.map((pos: Position) => {
                const price = priceForSymbol(pos.symbol);
                const pnlPct = pos.value !== 0 ? ((pos.qty * price - pos.value) / pos.value) * 100 : 0;
                const shortSym = pos.symbol.replace('USDT', '');
                return (
                  <li key={pos.symbol} className="flex items-center gap-3">
                    <div
                      className={`w-8 h-8 rounded-full bg-gradient-to-br ${gradientForSymbol(pos.symbol)} flex items-center justify-center text-white text-xs font-bold`}
                    >
                      {shortSym[0]}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-[#1A1D26]">{shortSym}</p>
                      <p className="text-xs text-[#8E95A9]">
                        {pos.qty.toFixed(4)} {shortSym}
                      </p>
                    </div>
                    <div className="text-right">
                      <p
                        className="text-sm font-medium text-[#1A1D26]"
                        style={{ fontVariantNumeric: 'tabular-nums' }}
                      >
                        {formatNOK(pos.qty * price)}
                      </p>
                      <p
                        className={`text-xs font-medium tabular-nums ${pnlPct >= 0 ? 'text-[#16A34A]' : 'text-[#DC2626]'}`}
                      >
                        {pnlPct >= 0 ? '+' : ''}
                        {pnlPct.toFixed(1)}%
                      </p>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        {/* Widget 4: Recent Trades */}
        <div className={cardBase}>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <h3 className="text-lg font-semibold text-[#1A1D26]">
                {no ? 'Siste handler' : 'Recent trades'}
              </h3>
              {hasRecentActivity && (
                <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider bg-[#16A34A]/15 text-[#16A34A] px-2 py-0.5 rounded-md border border-[#16A34A]/30">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#16A34A] animate-pulse" />
                  {no ? 'Live' : 'Live'}
                </span>
              )}
            </div>
            <Link
              href={`/${locale}/handelshistorikk`}
              className={`text-sm font-medium ${BRAND.link}`}
            >
              {no ? 'Se alle' : 'See all'}
            </Link>
          </div>
          {recentTrades.length === 0 ? (
            <div className="py-8 text-center">
              <p className="text-[#8E95A9] text-sm">
                {no ? 'Ingen handler ennå' : 'No trades yet'}
              </p>
            </div>
          ) : (
            <ul className="space-y-3">
              {recentTrades.map((t: Trade, i: number) => (
                <li key={i} className="flex items-center gap-3">
                  <div
                    className={`w-8 h-8 rounded-full flex items-center justify-center ${
                      isBuyTrade(t)
                        ? 'bg-[#16A34A]/10 text-[#16A34A]'
                        : 'bg-[#DC2626]/10 text-[#DC2626]'
                    }`}
                  >
                    {isBuyTrade(t) ? <ArrowUp className="w-4 h-4" /> : <ArrowDown className="w-4 h-4" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-[#1A1D26]">
                      {isBuyTrade(t) ? (no ? 'Kjøpte' : 'Bought') : (no ? 'Solgte' : 'Sold')}{' '}
                      {normalizeTradeSymbol(t).replace('USDT', '')}
                    </p>
                    <p className="text-xs text-[#8E95A9]">
                      {normalizeTradeQty(t).toFixed(4)} · {formatNOK(normalizeTradeAmount(t))}
                    </p>
                  </div>
                  <span className="text-xs text-[#8E95A9]">
                    {t.created_at
                      ? relativeTime(new Date(t.created_at), locale)
                      : '—'}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      {/* Widget 5: AI Market Brief */}
      <div className={`${cardBase} animate-fade-in-up stagger-4`}>
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#0052FF]/10 flex items-center justify-center flex-shrink-0">
            <Bot className="w-5 h-5 text-[#0052FF]" />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="text-lg font-semibold text-[#1A1D26]">
              {no ? 'AI Markedsoversikt' : 'AI Market Brief'}
            </h3>
            <p className="text-sm text-[#5E6478] mt-1 leading-relaxed">
              BTC opp 2.1% — sterk momentum. ETH konsoliderer rundt $2 400.
            </p>
            <p className="text-xs text-[#8E95A9] mt-2">
              {no ? 'Oppdateres daglig' : 'Updated daily'}
            </p>
          </div>
        </div>
      </div>

      {/* Widget 6 + 7: Lesson & Leaderboard (2-col on desktop) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 animate-fade-in-up stagger-5">
        {/* Widget 6: Next Lesson */}
        <Link href={`/${locale}/kurs`} className={`${cardBase} block group`}>
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#0052FF]/10 flex items-center justify-center flex-shrink-0">
              <BookOpen className="w-5 h-5 text-[#0052FF]" />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="text-lg font-semibold text-[#1A1D26] group-hover:text-[#0052FF] transition-colors">
                {no ? 'Lær videre' : 'Continue learning'}
              </h3>
              <div className="mt-2">
                <div className="w-full h-2 rounded-full bg-[#E2E5EC]">
                  <div className="h-2 rounded-full bg-[#0052FF]" style={{ width: '40%' }} />
                </div>
                <p className="text-xs text-[#8E95A9] mt-1.5">40% · {no ? 'Neste' : 'Next'}: Stop-loss {no ? 'strategier' : 'strategies'}</p>
              </div>
            </div>
          </div>
        </Link>

        {/* Widget 7: Leaderboard + Streak */}
        <div className="space-y-4">
        <StreakBadge streak={3} locale={locale} />
        <div className={cardBase}>
          <h3 className="text-lg font-semibold text-[#1A1D26] mb-3">
            {no ? 'Leaderboard denne uken' : 'Leaderboard this week'}
          </h3>
          <ul className="space-y-2.5">
            {LEADERBOARD.map((entry) => (
              <li key={entry.name} className="flex items-center gap-3">
                <span className="w-7 flex justify-center">
                  <Medal
                    className={`w-5 h-5 ${
                      entry.rank === 1 ? 'text-amber-500' : entry.rank === 2 ? 'text-slate-400' : 'text-amber-700'
                    }`}
                  />
                </span>
                <span className="flex-1 text-sm font-medium text-[#1A1D26]">{entry.name}</span>
                <span className="text-sm font-semibold text-[#16A34A] tabular-nums">{entry.pct}</span>
              </li>
            ))}
          </ul>
        </div>
        </div>
      </div>

      {/* Widget 8: Bot Status */}
      {activeSession ? (
        <div className={`${cardBase} animate-fade-in-up stagger-6`}>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-[#16A34A]/10 flex items-center justify-center">
                <Zap className="w-5 h-5 text-[#16A34A]" />
              </div>
              <div>
                <p className="text-sm font-semibold text-[#1A1D26]">
                  {activeSession.name ?? 'Trading Bot'}
                </p>
                <span className="inline-flex items-center gap-1.5 text-xs font-medium text-[#16A34A]">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#16A34A] animate-pulse" />
                  {no ? 'Aktiv' : 'Active'}
                </span>
                {(activeSession.total_trades ?? 0) > 0 && (
                  <p className="text-xs text-[#5E6478] mt-0.5">
                    {(activeSession.total_trades ?? 0)} {no ? 'handler' : 'trades'}
                    {winRate != null && ` · ${winRate}% ${no ? 'win rate' : 'win rate'}`}
                  </p>
                )}
              </div>
            </div>
            <div className="flex items-center gap-3 sm:gap-4">
              <div className="text-right">
                <p
                  className="text-sm font-semibold text-[#1A1D26] tabular-nums"
                >
                  {formatNOK(activeSession.total_pnl ?? activeSession.pnl ?? 0)}
                </p>
                <p className="text-[10px] text-[#8E95A9]">{no ? 'P&L sesjon' : 'Session P&L'}</p>
              </div>
              <div className="flex flex-col gap-1">
                <Link
                  href={`/${locale}/paper-trading`}
                  className={`text-xs font-medium ${BRAND.link}`}
                >
                  {no ? 'Grafer & signaler' : 'Charts & signals'}
                </Link>
                <Link
                  href={`/${locale}/dashboard/bot/${activeSession.id}`}
                  className={`text-xs font-medium text-[#5E6478] hover:text-[#0052FF]`}
                >
                  {no ? 'Bot-detaljer' : 'Bot details'}
                </Link>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <Link
          href={`/${locale}/dashboard/bot/new`}
          className="block rounded-xl border-2 border-dashed border-[#E2E5EC] p-5 text-center hover:border-[#0052FF]/40 hover:bg-[#0052FF]/[0.02] transition-all group animate-fade-in-up stagger-6"
        >
          <div className="w-10 h-10 rounded-xl bg-[#0052FF]/10 flex items-center justify-center mx-auto">
            <Bot className="w-5 h-5 text-[#0052FF]" />
          </div>
          <p className="text-sm font-semibold text-[#1A1D26] mt-2 group-hover:text-[#0052FF] transition-colors">
            {no ? 'Start en trading-bot' : 'Start a trading bot'}
          </p>
          <p className="text-xs text-[#8E95A9] mt-1">
            {no ? 'Automatiser strategien din' : 'Automate your strategy'}
          </p>
        </Link>
      )}
    </div>
  );
}
