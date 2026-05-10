"use client";

import { useEffect, useState } from "react";
import { m } from "framer-motion";
import { useLocale, useTranslations } from "next-intl";
import { Sunrise, Sun, Sunset, Moon, TrendingUp, TrendingDown } from "lucide-react";
import { SkeletonBlock } from "./loading-skeleton";

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

const timeIcons = {
  morning: { Icon: Sunrise, color: "text-amber-400", glow: "bg-amber-400/10" },
  day: { Icon: Sun, color: "text-yellow-400", glow: "bg-yellow-400/10" },
  evening: { Icon: Sunset, color: "text-orange-400", glow: "bg-orange-400/10" },
  night: { Icon: Moon, color: "text-indigo-400", glow: "bg-indigo-400/10" },
} as const;

function getTimeIcon(timeOfDay: keyof typeof timeIcons) {
  const { Icon, color, glow } = timeIcons[timeOfDay];
  return (
    <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${glow}`}>
      <Icon className={`w-5 h-5 ${color}`} />
    </div>
  );
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
    return (
      <div className="rounded-2xl border border-white/[0.08] bg-white/[0.04] backdrop-blur-xl p-5 flex items-center gap-4 h-[90px]">
        <SkeletonBlock className="w-9 h-9 rounded-xl shrink-0" />
        <div className="flex-1 space-y-2">
          <SkeletonBlock className="h-5 w-40" delay={0.1} />
          <SkeletonBlock className="h-3 w-64" delay={0.2} />
        </div>
      </div>
    );
  }

  return (
    <m.div
      className="relative overflow-hidden rounded-2xl border border-gray-200/80 dark:border-white/[0.08] bg-white/90 dark:bg-white/[0.04] backdrop-blur-xl shadow-sm"
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: [0.25, 0.46, 0.45, 0.94] }}
    >
      {/* Subtle gradient overlay */}
      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/[0.02] to-transparent pointer-events-none" />

      <div className="relative p-4 sm:p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="space-y-1.5 min-w-0 flex-1">
            <div className="flex items-center gap-2.5">
              {getTimeIcon(timeOfDay)}
              <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white truncate">
                {getGreeting(timeOfDay, t)}
                {userName ? `, ${userName}` : ""}
              </h2>
            </div>

            <div className="flex items-center gap-2 flex-wrap pl-[46px]">
              {performanceMsg && (
                <span className="text-sm text-slate-600 dark:text-slate-300">{performanceMsg}</span>
              )}

              {market && (
                <m.div
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.3, duration: 0.3 }}
                  className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-gray-100/80 dark:bg-white/[0.06] border border-gray-200/60 dark:border-white/[0.08]"
                >
                  <span className="text-[11px] font-medium text-gray-500 dark:text-slate-400">
                    {market.symbol}
                  </span>
                  {market.changePct >= 0 ? (
                    <TrendingUp className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
                  ) : (
                    <TrendingDown className="w-3 h-3 text-rose-600 dark:text-rose-400" />
                  )}
                  <span
                    className={`text-[11px] font-semibold tabular-nums ${
                      market.changePct >= 0
                        ? "text-emerald-600 dark:text-emerald-400"
                        : "text-rose-600 dark:text-rose-400"
                    }`}
                  >
                    {market.changePct >= 0 ? "+" : ""}
                    {market.changePct.toFixed(1)}%
                  </span>
                </m.div>
              )}
            </div>
          </div>

          {/* Quick stats mini — desktop only */}
          {(totalPnl !== undefined || winRate !== undefined) && (
            <div className="hidden sm:flex items-center gap-5 shrink-0">
              {totalPnl !== undefined && (
                <div className="text-right">
                  <p className="text-[10px] text-slate-400 dark:text-slate-500 uppercase tracking-wider font-medium">
                    {t("pnlLabel")}
                  </p>
                  <p
                    className={`text-sm font-bold tabular-nums ${
                      totalPnl >= 0
                        ? "text-emerald-600 dark:text-emerald-400"
                        : "text-rose-600 dark:text-rose-400"
                    }`}
                  >
                    {totalPnl >= 0 ? "+" : ""}
                    {totalPnl.toLocaleString()} NOK
                  </p>
                </div>
              )}
              {winRate !== undefined && (
                <div className="text-right">
                  <p className="text-[10px] text-slate-400 dark:text-slate-500 uppercase tracking-wider font-medium">
                    {t("winRateLabel")}
                  </p>
                  <p
                    className={`text-sm font-bold tabular-nums ${
                      winRate >= 50
                        ? "text-emerald-600 dark:text-emerald-400"
                        : "text-amber-600 dark:text-amber-400"
                    }`}
                  >
                    {winRate}%
                  </p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </m.div>
  );
}

export default PersonalizedGreeting;
