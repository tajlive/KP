"use client";

import { useAuth } from "@/components/auth/AuthContext";
import { usePulseData } from "@/hooks/usePulseData";
import { Activity, TrendingDown, TrendingUp } from "lucide-react";
import { hrefWithLocale } from "@/i18n/href-with-locale";
import { useLocale } from "next-intl";
import Link from "next/link";

export function MiniPulseWidget() {
  const locale = useLocale();
  const { user } = useAuth();

  const { stats, isConnected } = usePulseData({
    userId: user?.id || null,
    mode: "paper", // Header shows default paper mode for now
    profileId: "moderat",
    timeframe: "1D",
  });

  const isProfit = stats.dailyChangeNok >= 0;

  return (
    <Link
      href={hrefWithLocale(locale, "/dashboard")}
      className="group flex items-center gap-3 px-3 py-1.5 bg-slate-900/50 hover:bg-slate-800 rounded-2xl border border-white/5 transition-all duration-300 hover:border-white/10"
    >
      <div className="relative">
        <Activity
          className={`w-4 h-4 ${isConnected ? "text-blue-400" : "text-slate-600"}`}
        />
        {isConnected && (
          <span className="absolute -top-0.5 -right-0.5 w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse" />
        )}
      </div>

      <div className="flex flex-col items-start leading-none gap-0.5">
        <span className="text-[10px] font-bold text-slate-500 uppercase tracking-tighter">
          Pulse
        </span>
        <div className="flex items-center gap-1.5">
          <span className="text-sm font-bold text-white tabular-nums">
            {(stats.portfolioValue / 1000).toFixed(1)}k
          </span>
          <div
            className={`flex items-center gap-0.5 text-[10px] font-bold ${isProfit ? "text-green-400" : "text-red-400"}`}
          >
            {isProfit ? (
              <TrendingUp className="w-2 h-2" />
            ) : (
              <TrendingDown className="w-2 h-2" />
            )}
            {stats.dailyChangePct.toFixed(1)}%
          </div>
        </div>
      </div>

      {/* Mini Sparkline Visualization */}
      <div className="hidden sm:block w-12 h-6 overflow-hidden">
        <svg viewBox="0 0 100 40" className="w-full h-full">
          <path
            d="M0,30 Q10,10 20,25 T40,15 T60,35 T80,5 T100,20"
            fill="none"
            stroke={isProfit ? "#22c55e" : "#ef4444"}
            strokeWidth="4"
            strokeLinecap="round"
            className="opacity-50 group-hover:opacity-100 transition-opacity"
          />
        </svg>
      </div>
    </Link>
  );
}
