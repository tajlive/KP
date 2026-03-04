"use client";

import { motion } from "framer-motion";
import { Award, Download, Flame, Target, Trophy } from "lucide-react";
import { useRef } from "react";
import { toast } from "sonner";
import { useGamification } from "../gamification/GamificationProvider";

interface ProfileCardProps {
  username?: string;
  winRate?: number;
  totalPnl?: number;
}

export function ProfileCard({
  username = "Trader",
  winRate = 72.5,
  totalPnl = 15000,
}: ProfileCardProps) {
  const cardRef = useRef<HTMLDivElement>(null);
  const { state } = useGamification();

  const handleShare = async () => {
    try {
      if (navigator.share) {
        await navigator.share({
          title: "Min Klarpakke Status",
          text: `Jeg har en Win-Rate på ${winRate}% på Klarpakke! Bli med og få 1000 XP via min link!`,
          url: "https://klarpakke.no/register?ref=GOLDEN_TICKET",
        });
        toast.success("Delt via system dialogen!");
      } else {
        await navigator.clipboard.writeText(
          "https://klarpakke.no/register?ref=GOLDEN_TICKET",
        );
        toast.success("Golden Ticket URL kopiert til utklippstavlen!");
      }
    } catch (err) {
      console.error("Share failed", err);
    }
  };

  const handleDownload = async () => {
    try {
      // Only dynamically import html2canvas on the client side
      const html2canvas = (await import("html2canvas")).default;
      if (!cardRef.current) return;

      const canvas = await html2canvas(cardRef.current, {
        backgroundColor: "#0f172a", // slate-900 equivalent for the screenshot background
        scale: 2,
      });

      const link = document.createElement("a");
      link.download = `klarpakke-profile-${username}.png`;
      link.href = canvas.toDataURL("image/png");
      link.click();
      toast.success("Bilde lastet ned!");
    } catch (err) {
      toast.error("Kunne ikke generere bilde.");
      console.error(err);
    }
  };

  const isProfit = totalPnl >= 0;

  return (
    <div className="flex flex-col gap-4 max-w-sm mx-auto">
      {/* The Visual Card to be Screenshotted */}
      <motion.div
        ref={cardRef}
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-slate-800 to-slate-900 border-2 border-slate-700/50 p-6 shadow-2xl aspect-[4/5] flex flex-col justify-between"
      >
        {/* Background glow fx */}
        <div className="absolute top-0 right-0 w-48 h-48 bg-blue-500/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/4" />
        <div className="absolute bottom-0 left-0 w-64 h-64 bg-emerald-500/10 rounded-full blur-3xl translate-y-1/4 -translate-x-1/4" />

        {/* Header */}
        <div className="relative z-10 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center p-0.5 shadow-lg">
              <div className="w-full h-full bg-slate-900 rounded-full flex items-center justify-center text-lg">
                😎
              </div>
            </div>
            <div>
              <h3 className="font-bold text-white text-lg">{username}</h3>
              <div className="flex items-center gap-1 text-xs font-semibold text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded-full w-fit">
                <Trophy className="w-3 h-3" /> Nv. {state?.current_level || 1}{" "}
                Trader
              </div>
            </div>
          </div>
          {/* Klarpakke Logo Watermark essentially */}
          <div className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-emerald-400">
            KLARPAKKE
          </div>
        </div>

        {/* Stats */}
        <div className="relative z-10 space-y-6 my-8">
          <div className="text-center">
            <p className="text-sm font-medium text-slate-400 uppercase tracking-wider mb-1">
              Total P&L
            </p>
            <div className="flex justify-center items-center gap-2">
              <span
                className={`text-5xl font-extrabold tracking-tighter ${isProfit ? "text-emerald-400" : "text-red-400"}`}
              >
                {isProfit ? "+" : ""}
                {totalPnl}
              </span>
              <span className="text-slate-500 font-bold self-end mb-1">
                NOK
              </span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="bg-slate-800/80 rounded-xl p-3 border border-slate-700 text-center">
              <Target className="w-5 h-5 text-blue-400 mx-auto mb-1" />
              <p className="text-xs text-slate-400">Win Rate</p>
              <p className="text-xl font-bold text-white">{winRate}%</p>
            </div>
            <div className="bg-slate-800/80 rounded-xl p-3 border border-slate-700 text-center">
              <Flame className="w-5 h-5 text-orange-400 mx-auto mb-1" />
              <p className="text-xs text-slate-400">Streak</p>
              <p className="text-xl font-bold text-white">
                {state?.current_streak || 0} dager
              </p>
            </div>
          </div>
        </div>

        {/* Footer XP Bar */}
        <div className="relative z-10">
          <div className="flex justify-between text-xs font-medium text-slate-400 mb-2">
            <span>Totalt XP</span>
            <span className="text-blue-400">{state?.total_xp || 0} pts</span>
          </div>
          <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden">
            <motion.div
              className="h-full bg-gradient-to-r from-blue-500 to-indigo-500"
              initial={{ width: 0 }}
              animate={{
                width: `${Math.min(100, ((state?.total_xp || 0) / 1000) * 100)}%`,
              }}
              transition={{ duration: 1, ease: "easeOut" }}
            />
          </div>
        </div>
      </motion.div>

      {/* Action Buttons */}
      <div className="flex flex-col gap-2">
        <button
          onClick={handleShare}
          className="w-full py-3 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-white font-bold rounded-xl transition-all shadow-lg flex items-center justify-center gap-2 focus:ring-4 focus:ring-amber-500/30"
        >
          <Award className="w-5 h-5" />
          Inviter en venn (Få 1000 XP)
        </button>
        <button
          onClick={handleDownload}
          className="w-full py-3 bg-slate-800 hover:bg-slate-700 text-white font-medium rounded-xl transition-all border border-slate-700 flex items-center justify-center gap-2"
        >
          <Download className="w-5 h-5" />
          Last ned bilde
        </button>
      </div>
    </div>
  );
}
