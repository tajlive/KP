'use client';

import Link from 'next/link';
import ReverseTrial from './ReverseTrial';
import { SocialProof } from './SocialProof';
import { StreakBadge } from './StreakBadge';
import FirstTradeCard from './FirstTradeCard';

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

const COINS = [
  { symbol: 'BTC', name: 'Bitcoin', price: 823400, change: 2.1, gradient: 'from-[#F7931A] to-[#E8860A]' },
  { symbol: 'ETH', name: 'Ethereum', price: 24100, change: -0.8, gradient: 'from-[#627EEA] to-[#4A63D2]' },
  { symbol: 'SOL', name: 'Solana', price: 1420, change: 5.3, gradient: 'from-[#9945FF] to-[#14F195]' },
];

const LEADERBOARD = [
  { rank: '🥇', name: 'KryptoKonge', pct: '+14.2%' },
  { rank: '🥈', name: 'SatoshiFansen', pct: '+11.8%' },
  { rank: '🥉', name: 'HodlQueen', pct: '+9.4%' },
];

const cardBase =
  'bg-white rounded-xl border border-[#E2E5EC] shadow-[0_1px_3px_rgba(0,0,0,0.04),0_1px_2px_rgba(0,0,0,0.06)] p-5';

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

  const pnl = trades.reduce((sum: number, t: Trade) => {
    const val = t.side === 'BUY' ? -(t.amount ?? 0) : (t.amount ?? 0);
    return sum + val;
  }, 0);
  const pnlPercent = paperBalance > 0 ? (pnl / paperBalance) * 100 : 0;

  type Position = { symbol: string; qty: number; value: number };
  const positions = trades.reduce((acc: Record<string, Position>, t: Trade) => {
    if (!t.symbol) return acc;
    if (!acc[t.symbol]) acc[t.symbol] = { symbol: t.symbol, qty: 0, value: 0 };
    const sign = t.side === 'BUY' ? 1 : -1;
    acc[t.symbol].qty += sign * (t.qty ?? 0);
    acc[t.symbol].value += sign * (t.amount ?? 0);
    return acc;
  }, {} as Record<string, Position>);
  const positionList = Object.values(positions).filter((p: Position) => p.qty > 0);

  const recentTrades = trades.slice(-3).reverse();

  return (
    <div className="space-y-4">
      <ReverseTrial trialEndsAt={trialEndsAt ?? null} tier={tier} locale={locale} />

      <FirstTradeCard userId={userId} locale={locale} hasTrades={trades.length > 0} />

      {/* Widget 1: Portfolio Card */}
      <div className="bg-gradient-to-br from-[#0052FF] to-[#0047E0] rounded-2xl p-6 text-white shadow-[0_8px_32px_rgba(0,82,255,0.15)] animate-fade-in-up stagger-1">
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
            {no ? 'Siste 24t' : 'Last 24h'}
          </span>
        </div>
      </div>

      {/* Widget 2: Live Prices */}
      <div className="flex gap-3 overflow-x-auto pb-1 lg:grid lg:grid-cols-3 lg:overflow-visible animate-fade-in-up stagger-2">
        {COINS.map((coin) => (
          <div
            key={coin.symbol}
            className={`${cardBase} min-w-[200px] flex-shrink-0 lg:min-w-0`}
          >
            <div className="flex items-center gap-3">
              <div
                className={`w-10 h-10 rounded-full bg-gradient-to-br ${coin.gradient} flex items-center justify-center text-white font-bold text-sm`}
              >
                {coin.symbol[0]}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-[#1A1D26]">{coin.name}</p>
                <p className="text-xs text-[#8E95A9]">{coin.symbol}</p>
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
                className={`text-sm font-medium ${coin.change >= 0 ? 'text-[#16A34A]' : 'text-[#DC2626]'}`}
              >
                {coin.change >= 0 ? '+' : ''}
                {coin.change.toFixed(1)}%
              </span>
            </div>
          </div>
        ))}
      </div>

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
              href={`/${locale}/trades`}
              className="text-sm font-medium text-[#0052FF] hover:text-[#0047E0] transition-colors"
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
                const coin = COINS.find((c) => c.symbol === pos.symbol);
                const pnlPct = pos.value !== 0 ? ((pos.qty * (coin?.price ?? 0) - pos.value) / pos.value) * 100 : 0;
                return (
                  <li key={pos.symbol} className="flex items-center gap-3">
                    <div
                      className={`w-8 h-8 rounded-full bg-gradient-to-br ${coin?.gradient ?? 'from-gray-400 to-gray-500'} flex items-center justify-center text-white text-xs font-bold`}
                    >
                      {pos.symbol[0]}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-[#1A1D26]">{pos.symbol}</p>
                      <p className="text-xs text-[#8E95A9]">
                        {pos.qty.toFixed(4)} {pos.symbol}
                      </p>
                    </div>
                    <div className="text-right">
                      <p
                        className="text-sm font-medium text-[#1A1D26]"
                        style={{ fontVariantNumeric: 'tabular-nums' }}
                      >
                        {formatNOK(pos.qty * (coin?.price ?? 0))}
                      </p>
                      <p
                        className={`text-xs font-medium ${pnlPct >= 0 ? 'text-[#16A34A]' : 'text-[#DC2626]'}`}
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
            <h3 className="text-lg font-semibold text-[#1A1D26]">
              {no ? 'Siste handler' : 'Recent trades'}
            </h3>
            <Link
              href={`/${locale}/trades`}
              className="text-sm font-medium text-[#0052FF] hover:text-[#0047E0] transition-colors"
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
                    className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                      t.side === 'BUY'
                        ? 'bg-[#16A34A]/10 text-[#16A34A]'
                        : 'bg-[#DC2626]/10 text-[#DC2626]'
                    }`}
                  >
                    {t.side === 'BUY' ? '↑' : '↓'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-[#1A1D26]">
                      {t.side === 'BUY' ? (no ? 'Kjøpte' : 'Bought') : (no ? 'Solgte' : 'Sold')}{' '}
                      {t.symbol}
                    </p>
                    <p className="text-xs text-[#8E95A9]">
                      {t.qty?.toFixed(4)} · {formatNOK(t.amount ?? 0)}
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
          <div className="w-10 h-10 rounded-xl bg-[#0052FF]/10 flex items-center justify-center text-lg flex-shrink-0">
            🤖
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
            <div className="w-10 h-10 rounded-xl bg-[#0052FF]/10 flex items-center justify-center text-lg flex-shrink-0">
              📘
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
                <span className="text-lg w-7 text-center">{entry.rank}</span>
                <span className="flex-1 text-sm font-medium text-[#1A1D26]">{entry.name}</span>
                <span className="text-sm font-semibold text-[#16A34A]">{entry.pct}</span>
              </li>
            ))}
          </ul>
        </div>
        </div>
      </div>

      {/* Widget 8: Bot Status */}
      {activeSession ? (
        <div className={`${cardBase} animate-fade-in-up stagger-6`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-[#16A34A]/10 flex items-center justify-center text-lg">
                ⚡
              </div>
              <div>
                <p className="text-sm font-semibold text-[#1A1D26]">
                  {activeSession.name ?? 'Trading Bot'}
                </p>
                <span className="inline-flex items-center gap-1.5 text-xs font-medium text-[#16A34A]">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#16A34A] animate-pulse" />
                  {no ? 'Aktiv' : 'Active'}
                </span>
              </div>
            </div>
            <div className="text-right">
              <p
                className="text-sm font-semibold text-[#1A1D26]"
                style={{ fontVariantNumeric: 'tabular-nums' }}
              >
                {formatNOK(activeSession.pnl ?? 0)}
              </p>
              <Link
                href={`/${locale}/dashboard/bot/${activeSession.id}`}
                className="text-xs font-medium text-[#0052FF] hover:text-[#0047E0] transition-colors"
              >
                {no ? 'Se detaljer' : 'See details'}
              </Link>
            </div>
          </div>
        </div>
      ) : (
        <Link
          href={`/${locale}/dashboard/bot/new`}
          className="block rounded-xl border-2 border-dashed border-[#E2E5EC] p-5 text-center hover:border-[#0052FF]/40 hover:bg-[#0052FF]/[0.02] transition-all group animate-fade-in-up stagger-6"
        >
          <div className="w-10 h-10 rounded-xl bg-[#0052FF]/10 flex items-center justify-center text-lg mx-auto">
            🤖
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
