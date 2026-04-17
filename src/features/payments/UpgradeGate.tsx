"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useRouter } from "next/navigation";
import { useLocale } from "next-intl";
import { Rocket, X, TrendingUp, Shield, Zap, Crown } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { localizedPathname } from "@/middleware/locale-path";

interface UpgradeGateProps {
  children: React.ReactNode;
  requiredTier?: "student" | "bachelor" | "master" | "phd" | "professor";
  triggerTradesCount?: number;
}

interface UserStats {
  tradesCount: number;
  winRate: number;
  totalReturn: number;
  totalProfit: number;
  currentTier: string;
}

const TIER_NAMES: { [key: string]: string } = {
  student: "Student",
  bachelor: "Bachelor",
  master: "Master",
  phd: "PhD",
  professor: "Professor",
};

export function UpgradeGate({
  children,
  requiredTier = "bachelor",
  triggerTradesCount = 5,
}: UpgradeGateProps) {
  const [showGate, setShowGate] = useState(false);
  const [stats, setStats] = useState<UserStats>({
    tradesCount: 0,
    winRate: 73,
    totalReturn: 12.4,
    totalProfit: 2450,
    currentTier: "student",
  });
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const locale = useLocale();

  useEffect(() => {
    const checkUserStats = async () => {
      try {
        const supabase = createClient();
        const {
          data: { user },
        } = await supabase.auth.getUser();

        if (!user) return;

        // Hent user profile
        const { data: profile } = await supabase
          .from("user_profiles")
          .select("tier, paper_balance")
          .eq("user_id", user.id)
          .single();

        // Hent trades count
        const { count: tradesCount } = await supabase
          .from("trades")
          .select("*", { count: "exact", head: true })
          .eq("user_id", user.id);

        // Beregn stats fra trades
        const { data: trades } = await supabase
          .from("trades")
          .select("realized_pnl")
          .eq("user_id", user.id)
          .limit(100);

        const winningTrades = trades?.filter((t) => (t.realized_pnl || 0) > 0) || [];
        const totalPnl = trades?.reduce((sum, t) => sum + (t.realized_pnl || 0), 0) || 0;

        setStats({
          tradesCount: tradesCount || 0,
          winRate: trades?.length ? Math.round((winningTrades.length / trades.length) * 100) : 0,
          totalReturn: 12.4, // Mock data
          totalProfit: Math.round(totalPnl),
          currentTier: profile?.tier || "student",
        });

        // Trigger gate hvis nok trades
        if ((tradesCount || 0) >= triggerTradesCount && profile?.tier === "student") {
          setShowGate(true);
        }
      } catch (error) {
        console.error("UpgradeGate error:", error);
      } finally {
        setLoading(false);
      }
    };

    checkUserStats();
  }, [triggerTradesCount]);

  if (loading) return <>{children}</>;

  return (
    <>
      {children}

      <AnimatePresence>
        {showGate && (
          <motion.div
            className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <motion.div
              className="bg-gradient-to-br from-slate-900 to-slate-800 rounded-3xl p-8 max-w-lg w-full border border-slate-700 shadow-2xl relative"
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
            >
              {/* Close button */}
              <button
                onClick={() => setShowGate(false)}
                className="absolute top-4 right-4 p-2 hover:bg-slate-700 rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-slate-400" />
              </button>

              {/* Header */}
              <div className="text-center mb-6">
                <motion.div
                  className="w-20 h-20 bg-gradient-to-br from-yellow-400 via-orange-500 to-red-500 rounded-full mx-auto mb-4 flex items-center justify-center shadow-lg shadow-orange-500/30"
                  animate={{ scale: [1, 1.1, 1] }}
                  transition={{ duration: 2, repeat: Infinity }}
                >
                  <Rocket className="w-10 h-10 text-white" />
                </motion.div>

                <h2 className="text-2xl font-bold text-white mb-2">
                  🚀 Du er klar for ekte trading!
                </h2>

                <p className="text-slate-400">
                  Du har gjennomført <strong className="text-white">{stats.tradesCount} handler</strong> med
                  suksess. Oppgrader til {TIER_NAMES[requiredTier]} for å trade med ekte penger.
                </p>
              </div>

              {/* Stats grid */}
              <div className="grid grid-cols-3 gap-3 mb-6">
                <div className="bg-slate-800 rounded-xl p-3 text-center border border-slate-700">
                  <div className="flex justify-center mb-1">
                    <TrendingUp className="w-5 h-5 text-emerald-400" />
                  </div>
                  <p className="text-xl font-bold text-white">{stats.winRate}%</p>
                  <p className="text-xs text-slate-500">Win rate</p>
                </div>

                <div className="bg-slate-800 rounded-xl p-3 text-center border border-slate-700">
                  <div className="flex justify-center mb-1">
                    <Zap className="w-5 h-5 text-yellow-400" />
                  </div>
                  <p className="text-xl font-bold text-white">+{stats.totalReturn}%</p>
                  <p className="text-xs text-slate-500">Avkastning</p>
                </div>

                <div className="bg-slate-800 rounded-xl p-3 text-center border border-slate-700">
                  <div className="flex justify-center mb-1">
                    <Crown className="w-5 h-5 text-purple-400" />
                  </div>
                  <p className="text-xl font-bold text-white">+{stats.totalProfit.toLocaleString()}</p>
                  <p className="text-xs text-slate-500">kr tjent</p>
                </div>
              </div>

              {/* Benefits */}
              <div className="space-y-3 mb-6">
                <div className="flex items-center gap-3 p-3 bg-slate-800/50 rounded-lg">
                  <Shield className="w-5 h-5 text-blue-400 flex-shrink-0" />
                  <p className="text-slate-300 text-sm">
                    <strong className="text-white">Live trading</strong> med Binance integrasjon
                  </p>
                </div>

                <div className="flex items-center gap-3 p-3 bg-slate-800/50 rounded-lg">
                  <TrendingUp className="w-5 h-5 text-emerald-400 flex-shrink-0" />
                  <p className="text-slate-300 text-sm">
                    <strong className="text-white">Avanserte strategier</strong> med AI-optimalisering
                  </p>
                </div>

                <div className="flex items-center gap-3 p-3 bg-slate-800/50 rounded-lg">
                  <Crown className="w-5 h-5 text-yellow-400 flex-shrink-0" />
                  <p className="text-slate-300 text-sm">
                    <strong className="text-white">Prioritet support</strong> og eksklusive funksjoner
                  </p>
                </div>
              </div>

              {/* CTA */}
              <button
                onClick={() => router.push(localizedPathname(locale, "/priser"))}
                className="w-full py-4 bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 rounded-xl text-white font-bold text-lg hover:opacity-90 transition-all hover:scale-[1.02] active:scale-[0.98] shadow-lg shadow-purple-500/25"
              >
                Start live trading
              </button>

              <button
                onClick={() => setShowGate(false)}
                className="w-full mt-3 py-3 text-slate-500 text-sm hover:text-slate-300 transition-colors"
              >
                Fortsett med lekepenger
              </button>

              {/* Trust badge */}
              <p className="text-center text-slate-600 text-xs mt-4">
                🔒 Sikker betaling via Stripe • Kanseller når som helst
              </p>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

export default UpgradeGate;
