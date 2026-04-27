"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { useLocale } from "next-intl";
import { Sunrise, Sun, Sunset, Moon, TrendingUp, TrendingDown } from "lucide-react";

interface MarketContext {
  symbol: string;
  changePct: number;
}

interface PersonalizedGreetingProps {
  userName?: string | null;
  totalPnl?: number;
  winRate?: number;
}

function getTimeOfDay(): "morning" | "day" | "evening" | "night" {
  const hour = new Date().getHours();
  if (hour >= 5 && hour < 12) return "morning";
  if (hour >= 12 && hour < 17) return "day";
  if (hour >= 17 && hour < 22) return "evening";
  return "night";
}

function getGreeting(timeOfDay: string, isNo: boolean): string {
  switch (timeOfDay) {
    case "morning":
      return isNo ? "God morgen" : "Good morning";
    case "day":
      return isNo ? "God dag" : "Good afternoon";
    case "evening":
      return isNo ? "God kveld" : "Good evening";
    default:
      return isNo ? "God natt" : "Good night";
  }
}

function getTimeIcon(timeOfDay: string) {
  switch (timeOfDay) {
    case "morning":
      return <Sunrise className="w-5 h-5 text-amber-400" />;
    case "day":
      return <Sun className="w-5 h-5 text-yellow-400" />;
    case "evening":
      return <Sunset className="w-5 h-5 text-orange-400" />;
    default:
      return <Moon className="w-5 h-5 text-indigo-400" />;
  }
}

/** Simulated market context — in production, fetch from /api/market/snapshot */
function useMarketContext(): MarketContext | null {
  const [context, setContext] = useState<MarketContext | null>(null);

  useEffect(() => {
    // TODO: Replace with real API call to /api/market/snapshot
    // For now, rotate between a few major assets with realistic-looking data
    const assets: MarketContext[] = [
      { symbol: "BTC", changePct: 2.4 },
      { symbol: "ETH", changePct: -1.2 },
      { symbol: "SOL", changePct: 5.1 },
      { symbol: "S&P 500", changePct: 0.8 },
    ];
    // Deterministic "random" based on day of month
    const dayOfMonth = new Date().getDate();
    setContext(assets[dayOfMonth % assets.length]);
  }, []);

  return context;
}

function getPerformanceMessage(
  totalPnl: number | undefined,
  winRate: number | undefined,
  isNo: boolean
): string | null {
  if (totalPnl === undefined || winRate === undefined) return null;

  if (totalPnl > 10000 && winRate >= 55) {
    return isNo
      ? "Du er på 🔥 — sterkt resultat!"
      : "You're on 🔥 — strong performance!";
  }
  if (totalPnl < 0 && winRate < 45) {
    return isNo
      ? "Tøff periode — vurder å justere strategi."
      : "Tough stretch — consider adjusting your strategy.";
  }
  if (winRate >= 50 && totalPnl >= 0) {
    return isNo
      ? "Stødig trading — fortsett slik."
      : "Steady trading — keep it up.";
  }
  if (totalPnl > 0 && winRate < 50) {
    return isNo
      ? "Profittabel men ujevn — fokuser på konsistens."
      : "Profitable but uneven — focus on consistency.";
  }
  return null;
}

export function PersonalizedGreeting({ userName, totalPnl, winRate }: PersonalizedGreetingProps) {
  const locale = useLocale();
  const isNo = locale === "no";
  const [mounted, setMounted] = useState(false);
  const timeOfDay = getTimeOfDay();
  const market = useMarketContext();
  const performanceMsg = getPerformanceMessage(totalPnl, winRate, isNo);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return <div className="h-16 bg-slate-900/50 rounded-xl animate-pulse" />;
  }

  return (
    <motion.div
      className="bg-slate-900 rounded-2xl p-5 border border-slate-700"
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
    >
      <div className="flex items-start justify-between">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            {getTimeIcon(timeOfDay)}
            <h2 className="text-lg font-bold text-white">
              {getGreeting(timeOfDay, isNo)}
              {userName ? `, ${userName}` : ""}
            </h2>
          </div>

          <div className="flex items-center gap-3 flex-wrap">
            {performanceMsg && (
              <span className="text-sm text-slate-300">{performanceMsg}</span>
            )}

            {market && (
              <div className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-slate-800 border border-slate-700">
                <span className="text-xs text-slate-400">{market.symbol}</span>
                {market.changePct >= 0 ? (
                  <TrendingUp className="w-3 h-3 text-emerald-400" />
                ) : (
                  <TrendingDown className="w-3 h-3 text-red-400" />
                )}
                <span
                  className={`text-xs font-medium ${
                    market.changePct >= 0 ? "text-emerald-400" : "text-red-400"
                  }`}
                >
                  {market.changePct >= 0 ? "+" : ""}
                  {market.changePct.toFixed(1)}%
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Quick stats mini */}
        {(totalPnl !== undefined || winRate !== undefined) && (
          <div className="hidden sm:flex items-center gap-4">
            {totalPnl !== undefined && (
              <div className="text-right">
                <p className="text-[10px] text-slate-500 uppercase tracking-wider">
                  {isNo ? "P&L" : "P&L"}
                </p>
                <p
                  className={`text-sm font-bold ${
                    totalPnl >= 0 ? "text-emerald-400" : "text-red-400"
                  }`}
                >
                  {totalPnl >= 0 ? "+" : ""}
                  {totalPnl.toLocaleString()} NOK
                </p>
              </div>
            )}
            {winRate !== undefined && (
              <div className="text-right">
                <p className="text-[10px] text-slate-500 uppercase tracking-wider">
                  {isNo ? "Win Rate" : "Win Rate"}
                </p>
                <p
                  className={`text-sm font-bold ${
                    winRate >= 50 ? "text-emerald-400" : "text-amber-400"
                  }`}
                >
                  {winRate}%
                </p>
              </div>
            )}
          </div>
        )}
      </div>
    </motion.div>
  );
}

export default PersonalizedGreeting;
