"use client";

import Link from "next/link";
import { useLocale } from "next-intl";
import { motion } from "framer-motion";
import { Bot, TrendingUp, Sparkles, Zap, Target, Wallet } from "lucide-react";
import { useAuth } from "@/lib/auth/new/AuthContext";

// Nye WOW-komponenter
import { PortfolioChart } from "./PortfolioChart";
import { BeatTheMarket } from "./BeatTheMarket";
import { StatsGrid } from "./StatsGrid";
import { LiveTradeFeed } from "@/features/trading/LiveTradeFeed";
import { UpgradeGate } from "@/features/payments/UpgradeGate";
import { TopTradersPreview } from "@/features/copy-trading/TopTradersPreview";
import { DailyChallenge } from "@/features/gamification/DailyChallenge";

// Eksisterende komponenter
import { FirstTradePrompt } from "./FirstTradePrompt";
import { SimplifiedHero } from "./SimplifiedHero";

interface UserStats {
  totalTrades: number;
  winRate: number;
  totalPnl: number;
  currentCapital: number;
  startingCapital: number;
}

interface DashboardProProps {
  paperBalance?: number;
  sessionId?: string;
  trades?: any[];
  initialStats?: UserStats;
}

export function DashboardPro({ 
  paperBalance = 100000, 
  sessionId,
  initialStats 
}: DashboardProProps) {
  const { user } = useAuth();
  const locale = useLocale();
  const isNo = locale === "no";
  const stats = initialStats || {
    totalTrades: 0,
    winRate: 0,
    totalPnl: 0,
    currentCapital: paperBalance,
    startingCapital: 100000,
  };

  const totalReturn = ((stats.currentCapital - stats.startingCapital) / stats.startingCapital) * 100;

  return (
    <UpgradeGate triggerTradesCount={5}>
      <div className="min-h-screen bg-slate-950 p-4 md:p-8">
        <div className="max-w-7xl mx-auto space-y-6">
          {/* Hero - Simplified balance */}
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <SimplifiedHero balance={stats.currentCapital} changePct={totalReturn} />
          </motion.div>

          {/* CTA: Start bot when no active session */}
          {!sessionId && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              whileHover={{ scale: 1.01 }}
              transition={{ duration: 0.4, ease: "easeOut" }}
              className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#0052FF] via-[#7000FF] to-[#D100FF] p-8 shadow-[0_20px_50px_rgba(112,0,255,0.3)] mb-8"
            >
              <div className="absolute top-0 right-0 -mr-16 -mt-16 w-64 h-64 bg-white/10 rounded-full blur-3xl" />
              <div className="absolute bottom-0 left-0 -ml-16 -mb-16 w-64 h-64 bg-blue-400/10 rounded-full blur-3xl" />
              
              <div className="relative flex flex-col md:flex-row items-center justify-between gap-6">
                <div className="flex items-center gap-5">
                  <div className="p-4 bg-white/15 backdrop-blur-md rounded-2xl border border-white/20 shadow-inner">
                    <Bot className="w-8 h-8 text-white" />
                  </div>
                  <div>
                    <h2 className="text-2xl font-bold text-white tracking-tight">
                      {isNo ? "Eksplosiv vekst venter" : "Explosive growth awaits"}
                    </h2>
                    <p className="text-blue-50/80 mt-1 max-w-md">
                      {isNo
                        ? "Du har ingen aktive trading-strategier. La vår KI jobbe for deg mens du sover."
                        : "You have no active trading strategies. Let our AI work for you while you sleep."}
                    </p>
                  </div>
                </div>
                <Link
                  href={`/${locale}/dashboard/auto-trade`}
                  className="group relative inline-flex items-center justify-center gap-2 rounded-2xl bg-white px-8 py-4 text-base font-black text-[#0052FF] hover:bg-white/95 transition-all shadow-[0_10px_20px_rgba(0,0,0,0.1)] active:scale-95"
                >
                  <Sparkles className="w-5 h-5 text-purple-600 animate-pulse" />
                  {isNo ? "Utforsk Strategier" : "Explore Strategies"}
                </Link>
              </div>
            </motion.div>
          )}

          {/* Idle Funds Nudge */}
          {stats.currentCapital > 0 && !sessionId && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.15 }}
              className="rounded-2xl border border-amber-300/50 bg-gradient-to-r from-amber-50 to-amber-100 dark:from-amber-900/20 dark:to-amber-800/20 p-5 shadow-sm"
            >
              <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 bg-amber-500/20 rounded-xl">
                    <TrendingUp className="w-6 h-6 text-amber-700 dark:text-amber-300" />
                  </div>
                  <div>
                    <p className="font-semibold text-[#1A1D26] dark:text-white">
                      {isNo
                        ? "Du har ubrukte midler. La KI-en vår investere gradvis over tid med DCA, eller tjen renter."
                        : "You have idle funds. Let our AI invest gradually over time with DCA, or earn yield."}
                    </p>
                  </div>
                </div>
                <Link
                  href={`/${locale}/dashboard/auto-trade`}
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-amber-600 px-5 py-2.5 text-sm font-bold text-white hover:bg-amber-700 transition-colors whitespace-nowrap"
                >
                  {isNo ? "Aktiver Auto-Invest" : "Activate Auto-Invest"}
                </Link>
              </div>
            </motion.div>
          )}

          {/* First trade prompt */}
          {stats.totalTrades === 0 && <FirstTradePrompt />}

          {/* Main grid */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left column - 2/3 width */}
            <div className="lg:col-span-2 space-y-6">
              {/* Portfolio Chart */}
              <PortfolioChart userId={user?.id} sessionId={sessionId} />

              {/* Stats Grid */}
              <StatsGrid stats={[
                {
                  label: isNo ? "Total avkastning" : "Total Return",
                  value: `${stats.totalPnl > 0 ? "+" : ""}${stats.totalPnl.toLocaleString()} kr`,
                  subtext: isNo ? "Akkumulert profitt" : "Accumulated profit",
                  trend: stats.totalPnl >= 0 ? "up" : "down",
                  icon: TrendingUp,
                  highlight: true,
                },
                {
                  label: "Win rate",
                  value: `${stats.winRate}%`,
                  subtext: isNo ? `${stats.totalTrades} trades totalt` : `${stats.totalTrades} trades total`,
                  trend: stats.winRate >= 50 ? "up" : "down",
                  icon: Target,
                },
                {
                  label: isNo ? "Kontobalanse" : "Account Balance",
                  value: `${Math.round(stats.currentCapital).toLocaleString()} kr`,
                  subtext: isNo ? "Tilgjengelig kapital" : "Available capital",
                  trend: "neutral",
                  icon: Wallet,
                },
                {
                   label: isNo ? "Antall trades" : "Trade Count",
                   value: stats.totalTrades.toString(),
                   subtext: isNo ? "Fullførte handler" : "Completed trades",
                   trend: "neutral",
                   icon: Zap,
                }
              ]} />

              {/* Beat the Market */}
              <BeatTheMarket yourReturn={totalReturn} />

              {/* Daily Challenge */}
              <DailyChallenge userId={user?.id} />
            </div>

            {/* Right column - 1/3 width */}
            <div className="space-y-6">
              {/* Live Trade Feed */}
              <LiveTradeFeed limit={8} />

              {/* Top Traders */}
              <TopTradersPreview />
            </div>
          </div>

          {/* Bottom section */}
          <motion.div
            className="bg-gradient-to-r from-blue-500/10 via-purple-500/10 to-pink-500/10 rounded-2xl p-6 border border-slate-700"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
          >
            <div className="flex flex-col md:flex-row items-center justify-between gap-4">
              <div>
                <h3 className="text-xl font-bold text-white">🚀 Klar for neste nivå?</h3>
                <p className="text-slate-400 mt-1">
                  Oppgrader til Bachelor for live trading, avanserte strategier og prioritet support.
                </p>
              </div>
              <button className="px-6 py-3 bg-gradient-to-r from-blue-500 to-purple-500 rounded-xl text-white font-semibold hover:opacity-90 transition-opacity whitespace-nowrap">
                Se priser
              </button>
            </div>
          </motion.div>
        </div>
      </div>
    </UpgradeGate>
  );
}

export default DashboardPro;
