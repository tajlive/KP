"use client";

import { Button } from "@/components/ui/button";
import { AnimatePresence, motion } from "framer-motion";
import {
  Copy,
  Crown,
  Flame,
  Lock,
  Shield,
  Star,
  TrendingUp,
  Trophy,
  Zap,
} from "lucide-react";
import { useEffect, useState } from "react";
import { useLocale } from "next-intl";

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

interface TraderEntry {
  rank: number;
  name: string;
  avatar: string;
  pnl: number;
  pnlPercent: number;
  trades: number;
  winRate: number;
  tier: "rookie" | "trader" | "pro" | "legend";
  strategy: string;
  sparkline: number[];
  followers: number;
}

const TIER_CONFIG = {
  rookie: {
    label: "Rookie",
    color: "from-slate-400 to-slate-500",
    icon: Shield,
    textColor: "text-slate-400",
  },
  trader: {
    label: "Trader",
    color: "from-blue-400 to-blue-600",
    icon: TrendingUp,
    textColor: "text-blue-400",
  },
  pro: {
    label: "Pro",
    color: "from-amber-400 to-orange-500",
    icon: Flame,
    textColor: "text-amber-400",
  },
  legend: {
    label: "Legend",
    color: "from-emerald-500 to-rose-500",
    icon: Crown,
    textColor: "text-emerald-400",
  },
};

// ─────────────────────────────────────────────────────────────────────────────
// Realistic Norwegian Trader Names
// ─────────────────────────────────────────────────────────────────────────────

const MOCK_TRADERS: TraderEntry[] = [
  {
    rank: 1,
    name: "NordiskHval",
    avatar: "🐋",
    pnl: 184320,
    pnlPercent: 184.3,
    trades: 1420,
    winRate: 78.3,
    tier: "legend",
    strategy: "Grid + DCA",
    sparkline: [20, 35, 28, 55, 72, 85, 100, 120, 145, 160, 175, 184],
    followers: 342,
  },
  {
    rank: 2,
    name: "KryptoViking",
    avatar: "⚔️",
    pnl: 122450,
    pnlPercent: 122.4,
    trades: 856,
    winRate: 71.2,
    tier: "legend",
    strategy: "Trend Following",
    sparkline: [15, 22, 18, 40, 55, 62, 78, 90, 95, 105, 115, 122],
    followers: 287,
  },
  {
    rank: 3,
    name: "BTCNansen",
    avatar: "🧊",
    pnl: 98700,
    pnlPercent: 98.7,
    trades: 2104,
    winRate: 82.0,
    tier: "pro",
    strategy: "Volatility Harvest",
    sparkline: [10, 15, 25, 30, 42, 55, 60, 72, 80, 88, 92, 99],
    followers: 198,
  },
  {
    rank: 4,
    name: "FjordTrader",
    avatar: "🏔️",
    pnl: 67800,
    pnlPercent: 67.8,
    trades: 645,
    winRate: 65.4,
    tier: "pro",
    strategy: "Grid Bot",
    sparkline: [8, 12, 20, 18, 30, 38, 45, 50, 55, 60, 64, 68],
    followers: 124,
  },
  {
    rank: 5,
    name: "AuroraAlpha",
    avatar: "🌌",
    pnl: 45200,
    pnlPercent: 45.2,
    trades: 1890,
    winRate: 60.1,
    tier: "trader",
    strategy: "DCA Multi-Coin",
    sparkline: [5, 8, 12, 15, 20, 25, 28, 32, 36, 40, 43, 45],
    followers: 89,
  },
];

// ─────────────────────────────────────────────────────────────────────────────
// Mini Sparkline Chart
// ─────────────────────────────────────────────────────────────────────────────

function Sparkline({ data }: { data: number[] }) {
  const max = Math.max(...data);
  const min = Math.min(...data);
  const range = max - min || 1;
  const h = 32;
  const w = 80;

  const points = data
    .map(
      (v, i) => `${(i / (data.length - 1)) * w},${h - ((v - min) / range) * h}`,
    )
    .join(" ");

  return (
    <svg width={w} height={h} className="overflow-visible">
      <defs>
        <linearGradient id="sparkGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="rgb(34 197 94)" stopOpacity="0.3" />
          <stop offset="100%" stopColor="rgb(34 197 94)" stopOpacity="0" />
        </linearGradient>
      </defs>
      <polyline
        fill="none"
        stroke="rgb(34 197 94)"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        points={points}
      />
      <polyline
        fill="url(#sparkGrad)"
        stroke="none"
        points={`0,${h} ${points} ${w},${h}`}
      />
    </svg>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Rank Badge Component
// ─────────────────────────────────────────────────────────────────────────────

function RankBadge({ rank }: { rank: number }) {
  if (rank === 1)
    return (
      <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-400 to-yellow-500 flex items-center justify-center shadow-lg shadow-amber-500/30">
        <Crown className="w-5 h-5 text-white" />
      </div>
    );
  if (rank === 2)
    return (
      <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-slate-300 to-slate-400 flex items-center justify-center shadow-lg shadow-slate-400/30">
        <Trophy className="w-5 h-5 text-white" />
      </div>
    );
  if (rank === 3)
    return (
      <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-600 to-amber-700 flex items-center justify-center shadow-lg shadow-amber-700/30">
        <Trophy className="w-5 h-5 text-white" />
      </div>
    );
  return (
    <div className="w-10 h-10 rounded-xl bg-slate-800/60 border border-slate-700/50 flex items-center justify-center">
      <span className="text-sm font-bold text-slate-400">#{rank}</span>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Tier Badge
// ─────────────────────────────────────────────────────────────────────────────

function TierBadge({ tier }: { tier: TraderEntry["tier"] }) {
  const config = TIER_CONFIG[tier];
  const Icon = config.icon;
  return (
    <div
      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-gradient-to-r ${config.color} text-white text-[10px] font-bold uppercase tracking-wider`}
    >
      <Icon className="w-3 h-3" />
      {config.label}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Main Component
// ─────────────────────────────────────────────────────────────────────────────

export default function GamifiedLeaderboard() {
  const locale = useLocale();
  const [traders, setTraders] = useState<TraderEntry[]>(MOCK_TRADERS);
  const [activeTimeframe, setActiveTimeframe] = useState<
    "week" | "month" | "all_time"
  >("month");
  const [showPaywall, setShowPaywall] = useState(false);
  const [selectedTrader, setSelectedTrader] = useState<TraderEntry | null>(
    null,
  );

  // Try to fetch real data, fall back to mock
  useEffect(() => {
    async function fetchLeaderboard() {
      try {
        const res = await fetch(
          `/api/auto-trading/leaderboard?timeframe=${activeTimeframe}&limit=5`,
        );
        if (!res.ok) return;
        const data = await res.json();
        if (data.leaderboard?.length > 0) {
          setTraders(
            data.leaderboard.map((e: Record<string, unknown>, i: number) => ({
              rank: i + 1,
              name:
                (e.username as string) || MOCK_TRADERS[i]?.name || `Trader${i}`,
              avatar: MOCK_TRADERS[i]?.avatar || "🎯",
              pnl: (e.totalPnl as number) || MOCK_TRADERS[i]?.pnl || 0,
              pnlPercent: ((e.totalPnl as number) || 0) / 1000,
              trades: (e.totalTrades as number) || 0,
              winRate: (e.winRate as number) || 50,
              tier: mapTier((e.tier as string) || "free"),
              strategy: MOCK_TRADERS[i]?.strategy || "Mixed",
              sparkline: MOCK_TRADERS[i]?.sparkline || [10, 20, 30, 40, 50],
              followers: MOCK_TRADERS[i]?.followers || 0,
            })),
          );
        }
      } catch {
        // Keep mock data on error
      }
    }
    fetchLeaderboard();
  }, [activeTimeframe]);

  function mapTier(tier: string): TraderEntry["tier"] {
    const map: Record<string, TraderEntry["tier"]> = {
      free: "rookie",
      student: "trader",
      phd: "pro",
      professor: "legend",
    };
    return map[tier] || "rookie";
  }

  function handleCopy(trader: TraderEntry) {
    setSelectedTrader(trader);
    setShowPaywall(true);
  }

  const timeframes = [
    { key: "week" as const, label: "Uke" },
    { key: "month" as const, label: "Måned" },
    { key: "all_time" as const, label: "Totalt" },
  ];

  return (
    <section className="py-20 px-4 relative overflow-hidden">
      {/* Background glow */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-gradient-radial from-blue-500/5 to-transparent rounded-full blur-3xl" />
      </div>

      <div className="max-w-4xl mx-auto relative">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-12"
        >
          <div className="inline-flex items-center gap-2 bg-amber-500/10 border border-amber-500/20 text-amber-400 px-4 py-1.5 rounded-full text-sm font-bold mb-6">
            <Trophy className="h-4 w-4" />
            LIVE LEADERBOARD
          </div>
          <h2 className="text-3xl md:text-5xl font-black text-slate-900 dark:text-white mb-4">
            Topp Tradere
            <span className="bg-gradient-to-r from-amber-400 to-orange-500 bg-clip-text text-transparent">
              {" "}
              akkurat nå
            </span>
          </h2>
          <p className="text-lg text-slate-500 dark:text-slate-400 max-w-xl mx-auto">
            Se hvem som tjener mest — og kopier strategien deres med ett klikk.
          </p>
        </motion.div>

        {/* Timeframe Tabs */}
        <div className="flex justify-center mb-8">
          <div className="inline-flex bg-slate-100 dark:bg-slate-800/80 rounded-2xl p-1.5 gap-1">
            {timeframes.map((tf) => (
              <button
                key={tf.key}
                onClick={() => setActiveTimeframe(tf.key)}
                className={`px-5 py-2 rounded-xl text-sm font-bold transition-all duration-200 ${
                  activeTimeframe === tf.key
                    ? "bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm"
                    : "text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
                }`}
              >
                {tf.label}
              </button>
            ))}
          </div>
        </div>

        {/* Leaderboard Cards */}
        <div className="space-y-3">
          <AnimatePresence mode="popLayout">
            {traders.map((trader, i) => (
              <motion.div
                key={`${trader.name}-${activeTimeframe}`}
                initial={{ opacity: 0, y: 20, scale: 0.97 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{
                  delay: i * 0.08,
                  type: "spring",
                  stiffness: 300,
                  damping: 30,
                }}
              >
                <div
                  className={`group relative bg-white dark:bg-slate-800/60 backdrop-blur-xl border rounded-2xl p-4 md:p-5 flex items-center gap-4 transition-all duration-300 hover:shadow-xl cursor-pointer ${
                    trader.rank === 1
                      ? "border-amber-400/40 shadow-lg shadow-amber-500/10 dark:border-amber-500/30"
                      : "border-slate-200 dark:border-slate-700/50 hover:border-blue-300 dark:hover:border-blue-500/50"
                  }`}
                >
                  {/* Rank 1 glow */}
                  {trader.rank === 1 && (
                    <div className="absolute inset-0 bg-gradient-to-r from-amber-500/5 via-transparent to-orange-500/5 rounded-2xl pointer-events-none" />
                  )}

                  {/* Rank */}
                  <RankBadge rank={trader.rank} />

                  {/* Avatar + Name */}
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    <div className="text-2xl flex-shrink-0">
                      {trader.avatar}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-bold text-slate-900 dark:text-white truncate">
                          {trader.name}
                        </span>
                        <TierBadge tier={trader.tier} />
                      </div>
                      <div className="flex items-center gap-3 text-xs text-slate-500 mt-0.5">
                        <span>{trader.trades} handler</span>
                        <span className="hidden sm:inline">•</span>
                        <span className="hidden sm:inline">
                          {trader.winRate}% win rate
                        </span>
                        <span className="hidden sm:inline">•</span>
                        <span className="hidden sm:inline text-blue-400">
                          {trader.followers} følgere
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Sparkline (hidden on mobile) */}
                  <div className="hidden md:block flex-shrink-0">
                    <Sparkline data={trader.sparkline} />
                  </div>

                  {/* P&L */}
                  <div className="text-right flex-shrink-0">
                    <div className="text-lg md:text-xl font-black text-green-500">
                      +{trader.pnlPercent.toFixed(1)}%
                    </div>
                    <div className="text-xs text-slate-400">
                      {trader.pnl >= 1000
                        ? `${(trader.pnl / 1000).toFixed(0)}k NOK`
                        : `${trader.pnl} NOK`}
                    </div>
                  </div>

                  {/* Copy Button */}
                  <Button
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleCopy(trader);
                    }}
                    className="hidden sm:flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl px-4 h-9 text-xs font-bold shadow-lg shadow-blue-600/25 transition-all duration-200 hover:scale-105"
                  >
                    <Copy className="w-3.5 h-3.5" />
                    KOPIER
                  </Button>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>

        {/* Bottom CTA */}
        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          className="mt-8 text-center"
        >
          <div className="inline-flex items-center gap-2 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800/50 px-6 py-3 rounded-2xl">
            <Zap className="w-4 h-4 text-blue-500" />
            <span className="text-sm text-blue-600 dark:text-blue-400 font-medium">
              <strong>2 400+</strong> brukere har tjent penger med auto-trading
              denne måneden
            </span>
          </div>
        </motion.div>
      </div>

      {/* ─── Paywall Modal ─── */}
      <AnimatePresence>
        {showPaywall && selectedTrader && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={() => setShowPaywall(false)}
          >
            <motion.div
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 10 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white dark:bg-slate-900 rounded-3xl p-8 max-w-md w-full shadow-2xl border border-slate-200 dark:border-slate-700"
            >
              {/* Lock Icon */}
              <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-lg shadow-blue-500/30">
                <Lock className="w-8 h-8 text-white" />
              </div>

              <h3 className="text-2xl font-black text-center text-slate-900 dark:text-white mb-2">
                Kopier {selectedTrader.name}?
              </h3>
              <p className="text-center text-slate-500 mb-8">
                Denne traderen har{" "}
                <strong className="text-green-500">
                  +{selectedTrader.pnlPercent.toFixed(0)}% avkastning
                </strong>
                . Oppgrader for å kopiere automatisk.
              </p>

              {/* Plans */}
              <div className="space-y-3 mb-6">
                {/* Free */}
                <div className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-200 dark:border-slate-700">
                  <div>
                    <div className="font-bold text-slate-900 dark:text-white text-sm">
                      Gratis
                    </div>
                    <div className="text-xs text-slate-500">
                      1 strategi, paper-trading
                    </div>
                  </div>
                  <span className="text-xs text-slate-400 font-bold">
                    NÅVÆRENDE
                  </span>
                </div>

                {/* Student */}
                <div className="flex items-center justify-between p-4 bg-blue-50 dark:bg-blue-900/20 rounded-xl border-2 border-blue-400">
                  <div>
                    <div className="font-bold text-slate-900 dark:text-white text-sm flex items-center gap-2">
                      Student
                      <span className="text-[10px] bg-blue-500 text-white px-2 py-0.5 rounded-full">
                        POPULÆR
                      </span>
                    </div>
                    <div className="text-xs text-slate-500">
                      Alle strategier, multi-coin, backtest
                    </div>
                  </div>
                  <span className="text-lg font-black text-blue-600">
                    99kr<span className="text-xs text-slate-400">/mnd</span>
                  </span>
                </div>

                {/* Pro */}
                <div className="flex items-center justify-between p-4 bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-900/20 dark:to-orange-900/20 rounded-xl border border-amber-300 dark:border-amber-700">
                  <div>
                    <div className="font-bold text-slate-900 dark:text-white text-sm flex items-center gap-2">
                      Pro
                      <Star className="w-3.5 h-3.5 text-amber-500" />
                    </div>
                    <div className="text-xs text-slate-500">
                      Copy trading, live-trading, VIP
                    </div>
                  </div>
                  <span className="text-lg font-black text-amber-600">
                    299kr<span className="text-xs text-slate-400">/mnd</span>
                  </span>
                </div>
              </div>

              {/* CTA */}
              <Button
                className="w-full h-14 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-2xl text-lg font-bold shadow-xl shadow-blue-600/25 transition-all duration-200"
                onClick={() => {
                  window.location.href = `/${locale}/priser`;
                }}
              >
                <Zap className="w-5 h-5 mr-2" />
                Oppgrader nå
              </Button>

              <p className="text-center text-[11px] text-slate-400 mt-3">
                {selectedTrader.followers} følger allerede denne traderen
              </p>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  );
}
