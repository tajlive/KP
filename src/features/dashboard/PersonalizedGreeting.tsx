"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { useLocale, useTranslations } from "next-intl";
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

function getGreeting(timeOfDay: string, t: (key: string) => string): string {
  return t(`greeting.${timeOfDay}`);
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

/** Fetch real market context from /api/market/snapshot */
function useMarketContext(): MarketContext | null {
  const [context, setContext] = useState<MarketContext | null>(null);

  useEffect(() => {
    fetch("/api/market/snapshot")
      .then((r) => r.json())
      .then((data) => {
        if (data.assets && data.assets.length > 0) {
          // Pick the asset with the highest absolute movement for "interesting" context
          const top = data.assets.reduce((best: typeof data.assets[0], current: typeof data.assets[0]) =>
            Math.abs(current.change24hPct) > Math.abs(best.change24hPct) ? current : best
          );
          setContext({
            symbol: top.symbol,
            changePct: top.change24hPct,
          });
        }
      })
      .catch(() => {
        // Silent fallback — no market context shown
      });
  }, []);

  return context;
}

function getPerformanceMessage(
  totalPnl: number | undefined,
  winRate: number | undefined,
  t: (key: string) => string
): string | null {
  if (totalPnl === undefined || winRate === undefined) return null;

  if (totalPnl > 10000 && winRate >= 55) {
    return t("performance.strong");
  }
  if (totalPnl < 0 && winRate < 45) {
    return t("performance.tough");
  }
  if (winRate >= 50 && totalPnl >= 0) {
    return t("performance.steady");
  }
  if (totalPnl > 0 && winRate < 50) {
    return t("performance.uneven");
  }
  return null;
}

export function PersonalizedGreeting({ userName, totalPnl, winRate }: PersonalizedGreetingProps) {
  const locale = useLocale();
  const t = useTranslations("dashboard");
  const [mounted, setMounted] = useState(false);
  const timeOfDay = getTimeOfDay();
  const market = useMarketContext();
  const performanceMsg = getPerformanceMessage(totalPnl, winRate, t);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return <div className="h-16 bg-gray-200/50 dark:bg-slate-900/50 rounded-xl animate-pulse" />;
  }

  return (
    <motion.div
      className="bg-white dark:bg-slate-900 rounded-2xl p-5 border border-gray-200 dark:border-slate-700 shadow-sm"
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
    >
      <div className="flex items-start justify-between">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            {getTimeIcon(timeOfDay)}
            <h2 className="text-lg font-bold text-slate-900 dark:text-white">
              {getGreeting(timeOfDay, t)}
              {userName ? `, ${userName}` : ""}
            </h2>
          </div>

          <div className="flex items-center gap-3 flex-wrap">
            {performanceMsg && (
              <span className="text-sm text-slate-600 dark:text-slate-300">{performanceMsg}</span>
            )}

            {market && (
              <div className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-gray-100 dark:bg-slate-800 border border-gray-200 dark:border-slate-700">
                <span className="text-xs text-gray-500 dark:text-slate-400">{market.symbol}</span>
                {market.changePct >= 0 ? (
                  <TrendingUp className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
                ) : (
                  <TrendingDown className="w-3 h-3 text-red-600 dark:text-red-400" />
                )}
                <span
                  className={`text-xs font-medium ${
                    market.changePct >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-red-600 dark:text-red-400"
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
                <p className="text-[10px] text-slate-400 dark:text-slate-500 uppercase tracking-wider">
                  {t("pnlLabel")}
                </p>
                <p
                  className={`text-sm font-bold ${
                    totalPnl >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-red-600 dark:text-red-400"
                  }`}
                >
                  {totalPnl >= 0 ? "+" : ""}
                  {totalPnl.toLocaleString()} NOK
                </p>
              </div>
            )}
            {winRate !== undefined && (
              <div className="text-right">
                <p className="text-[10px] text-slate-400 dark:text-slate-500 uppercase tracking-wider">
                  {t("winRateLabel")}
                </p>
                <p
                  className={`text-sm font-bold ${
                    winRate >= 50 ? "text-emerald-600 dark:text-emerald-400" : "text-amber-600 dark:text-amber-400"
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
