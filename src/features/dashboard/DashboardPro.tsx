"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useLocale } from "next-intl";
import { motion } from "framer-motion";
import { Bot, TrendingUp } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
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

interface DashboardProProps {
  paperBalance?: number;
  sessionId?: string;
}

interface UserStats {
  totalTrades: number;
  winRate: number;
  totalPnl: number;
  currentCapital: number;
  startingCapital: number;
}

export function DashboardPro({ paperBalance = 100000, sessionId }: DashboardProProps) {
  const { user } = useAuth();
  const locale = useLocale();
  const isNo = locale === "no";
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<UserStats>({
    totalTrades: 0,
    winRate: 0,
    totalPnl: 0,
    currentCapital: paperBalance,
    startingCapital: 100000,
  });

  useEffect(() => {
    const fetchStats = async () => {
      if (!user?.id) {
        setLoading(false);
        return;
      }

      try {
        const supabase = createClient();

        // Hent session
        const { data: session } = await supabase
          .from("trading_sessions")
          .select("id, current_capital_nok, starting_capital_nok, total_pnl")
          .eq("user_id", user.id)
          .eq("mode", "paper")
          .eq("status", "active")
          .order("updated_at", { ascending: false })
          .limit(1)
          .single();

        // Hent trades
        const { data: trades } = await supabase
          .from("trades")
          .select("realized_pnl")
          .eq("user_id", user.id)
          .limit(100);

        const winningTrades = trades?.filter((t) => (t.realized_pnl || 0) > 0) || [];
        const totalPnl = trades?.reduce((sum, t) => sum + (t.realized_pnl || 0), 0) || 0;

        setStats({
          totalTrades: trades?.length || 0,
          winRate: trades?.length ? Math.round((winningTrades.length / trades.length) * 100) : 0,
          totalPnl,
          currentCapital: session?.current_capital_nok || paperBalance,
          startingCapital: session?.starting_capital_nok || 100000,
        });
      } catch (error) {
        console.error("DashboardPro error:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, [user?.id, paperBalance]);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 p-4 md:p-8">
        <div className="max-w-7xl mx-auto space-y-6">
          <div className="h-32 bg-slate-900 rounded-2xl animate-pulse" />
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 h-96 bg-slate-900 rounded-2xl animate-pulse" />
            <div className="h-96 bg-slate-900 rounded-2xl animate-pulse" />
          </div>
        </div>
      </div>
    );
  }

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
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="rounded-2xl bg-gradient-to-r from-blue-600 to-purple-600 p-6 text-white shadow-lg"
            >
              <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="p-3 bg-white/20 rounded-xl">
                    <Bot className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <p className="font-semibold text-lg">
                      {isNo ? "Ingen aktive bot-er" : "No active bots"}
                    </p>
                    <p className="text-sm text-white/80">
                      {isNo
                        ? "Start din første auto-trading strategi i dag."
                        : "Start your first auto-trading strategy today."}
                    </p>
                  </div>
                </div>
                <Link
                  href={`/${locale}/dashboard/auto-trade`}
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-white px-6 py-3 text-sm font-bold text-blue-600 hover:bg-white/90 transition-colors whitespace-nowrap"
                >
                  {isNo ? "Utforsk strategier" : "Explore strategies"}
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
              <StatsGrid />

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
