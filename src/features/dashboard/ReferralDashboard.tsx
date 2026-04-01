"use client";

import { Button } from "@/shared/ui/button";
import { createClient } from "@/lib/utils";
import { motion } from "framer-motion";
import { Check, Copy, Flame, Gift, Share2, Unlock, Users } from "lucide-react";
import { useEffect, useState } from "react";

interface ReferralStats {
  referralCode: string;
  points: number;
}

export default function ReferralDashboard() {
  const [copied, setCopied] = useState(false);
  const [stats, setStats] = useState<ReferralStats | null>(null);
  const [loading, setLoading] = useState(true);

  // Gamification target
  const TARGET = 3;

  useEffect(() => {
    async function fetchReferralStats() {
      try {
        const supabase = createClient();
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (!user) return;

        const { data } = await supabase
          .from("user_trading_config")
          .select("referral_code, referral_points")
          .eq("user_id", user.id)
          .single();

        if (data) {
          setStats({
            referralCode: data.referral_code || "MANGLER_KODE",
            points: data.referral_points || 0,
          });
        }
      } catch (err) {
        console.error("Failed to fetch referral stats", err);
      } finally {
        setLoading(false);
      }
    }
    fetchReferralStats();
  }, []);

  const referralLink =
    typeof window !== "undefined" && stats?.referralCode
      ? `${window.location.origin}/no/onboarding?ref=${stats.referralCode}`
      : "Laster lenke...";

  const handleCopy = () => {
    if (!stats?.referralCode) return;
    navigator.clipboard.writeText(referralLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleShare = async () => {
    if (!stats?.referralCode) return;
    if (navigator.share) {
      await navigator.share({
        title: "Prøv Klarpakke – lær krypto-trading",
        text: "Bli med på Klarpakke og lær krypto-trading med paper trading!",
        url: referralLink,
      });
    } else {
      handleCopy();
    }
  };

  if (loading) {
    return (
      <div className="bg-white dark:bg-slate-900 rounded-3xl p-8 border border-slate-100 dark:border-slate-800 shadow-xl animate-pulse h-64 flex items-center justify-center">
        <div className="text-slate-400 font-bold">Laster vervestatus...</div>
      </div>
    );
  }

  const points = stats?.points || 0;
  const progress = Math.min((points / TARGET) * 100, 100);
  const isUnlocked = points >= TARGET;

  return (
    <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 md:p-8 border border-slate-100 dark:border-slate-800 shadow-xl relative overflow-hidden">
      {/* Background glow for unlocked state */}
      {isUnlocked && (
        <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-radial from-amber-500/10 to-transparent rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 pointer-events-none" />
      )}

      <div className="flex flex-col md:flex-row gap-8 items-center">
        {/* Left: Info & Link */}
        <div className="flex-1 space-y-6 w-full z-10">
          <div>
            <div className="inline-flex items-center gap-2 bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 px-3 py-1 rounded-full text-xs font-bold mb-4 uppercase tracking-wider">
              <Gift className="w-3.5 h-3.5" /> VERV & VINN
            </div>
            <h3 className="text-2xl md:text-3xl font-black text-slate-900 dark:text-white mb-2">
              Lås opp{" "}
              <span className="text-transparent bg-clip-text bg-linear-to-r from-orange-400 to-amber-500">
                avanserte strategier
              </span>
            </h3>
            <p className="text-slate-500 dark:text-slate-400 text-sm md:text-base">
              Inviter {TARGET} venner til å teste paper-trading. Når de
              registrerer seg via din lenke, låser du automatisk opp{" "}
              <strong>Offensiv</strong> og <strong>Aggressiv</strong> strategi
              gratis.
            </p>
          </div>

          <div className="bg-slate-50 dark:bg-slate-800/50 p-4 rounded-2xl border border-slate-200 dark:border-slate-700">
            <div className="text-xs font-bold text-slate-400 mb-2 uppercase tracking-wide">
              Din personlige invitasjonslenke
            </div>
            <div className="flex items-center gap-2">
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 flex-1 overflow-hidden">
                <div className="truncate text-sm font-medium text-slate-700 dark:text-slate-300">
                  {referralLink}
                </div>
              </div>
              <Button
                onClick={handleCopy}
                className={`h-[46px] px-5 rounded-xl font-bold transition-all ${
                  copied
                    ? "bg-green-500 hover:bg-green-600 text-white shadow-lg shadow-green-500/30"
                    : "bg-blue-600 hover:bg-blue-700 text-white shadow-lg shadow-blue-600/30"
                }`}
              >
                {copied ? (
                  <Check className="w-5 h-5" />
                ) : (
                  <Copy className="w-5 h-5" />
                )}
              </Button>
              <Button
                onClick={handleShare}
                className="h-[46px] px-5 rounded-xl font-bold bg-indigo-600 hover:bg-indigo-700 text-white shadow-lg shadow-indigo-600/30"
              >
                <Share2 className="w-5 h-5" />
              </Button>
            </div>
          </div>
        </div>

        {/* Right: Progress & Status */}
        <div className="w-full md:w-72 bg-slate-50 dark:bg-slate-800/50 p-6 rounded-3xl border border-slate-200 dark:border-slate-700 relative z-10">
          <div className="flex justify-between items-end mb-4">
            <div className="text-center w-full">
              <div className="text-4xl font-black text-slate-900 dark:text-white flex items-center justify-center gap-2">
                <Users
                  className={`w-8 h-8 ${points > 0 ? "text-blue-500" : "text-slate-300"}`}
                />
                {points}
                <span className="text-2xl text-slate-400">/{TARGET}</span>
              </div>
              <div className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-1">
                Venner invitert
              </div>
            </div>
          </div>

          {/* Progress Bar */}
          <div className="h-3 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden mb-6 relative">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${progress}%` }}
              transition={{ duration: 1, ease: "easeOut" }}
              className={`absolute top-0 left-0 h-full rounded-full ${
                isUnlocked
                  ? "bg-linear-to-r from-amber-400 to-orange-500"
                  : "bg-blue-500"
              }`}
            />
          </div>

          {/* Status Alert */}
          {isUnlocked ? (
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="bg-amber-100 dark:bg-amber-900/40 border border-amber-200 dark:border-amber-700/50 p-4 rounded-2xl text-center"
            >
              <div className="w-10 h-10 bg-linear-to-br from-amber-400 to-orange-500 rounded-full flex items-center justify-center mx-auto mb-2 shadow-lg shadow-amber-500/30">
                <Flame className="w-5 h-5 text-white" />
              </div>
              <div className="font-bold text-amber-800 dark:text-amber-400 text-sm">
                Strategier ulåst!
              </div>
              <div className="text-xs text-amber-700 dark:text-amber-500/80 leading-tight mt-1">
                Du kan nå benytte deg av alle høy-risiko strategier.
              </div>
            </motion.div>
          ) : (
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 rounded-2xl text-center shadow-sm">
              <div className="w-10 h-10 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-2">
                <Unlock className="w-5 h-5 text-slate-400" />
              </div>
              <div className="font-bold text-slate-700 dark:text-slate-300 text-sm">
                Mangler {TARGET - points} venner
              </div>
              <div className="text-xs text-slate-500 leading-tight mt-1">
                Del lenken din til venner via sosiale medier eller chat.
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
