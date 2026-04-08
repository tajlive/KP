"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/features/auth/AuthContext";

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
