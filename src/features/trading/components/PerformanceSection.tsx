"use client";

import { useMemo } from "react";
import { useTranslations } from "next-intl";
import { TrendingUp, TrendingDown, Flame, AlertTriangle, Trophy, Skull } from "lucide-react";
import type { Trade } from "@/lib/trading-api";
import { buildTradingAnalytics } from "@/lib/trading/build-trading-analytics";

interface PerformanceSectionProps {
  trades: Trade[];
  startingCapital?: number;
  formatNOK: (v: number) => string;
}

function getHeatColor(pnl: number, capital: number): string {
  const pct = capital > 0 ? (pnl / capital) * 100 : 0;
  if (pnl === 0) return "bg-slate-700";
  if (pct >= 1) return "bg-emerald-500";
  if (pct >= 0.5) return "bg-emerald-600";
  if (pct > 0) return "bg-emerald-700";
  if (pct <= -1) return "bg-rose-500";
  if (pct <= -0.5) return "bg-rose-600";
  return "bg-rose-700";
}

function getHeatTooltip(pnl: number, capital: number, trades: number, formatNOK: (v: number) => string): string {
  const pct = capital > 0 ? ((pnl / capital) * 100).toFixed(2) : "0.00";
  return `${pnl >= 0 ? "+" : ""}${formatNOK(pnl)} (${pct}%) — ${trades} handler`;
}

export function PerformanceSection({ trades, startingCapital = 100000, formatNOK }: PerformanceSectionProps) {
  const t = useTranslations("trading.performance");

  const analytics = useMemo(() => {
    if (!trades.length) return null;
    return buildTradingAnalytics(
      trades.map((t) => ({
        id: t.id,
        trading_pair: t.symbol,
        side: t.side,
        realized_pnl: t.realized_pnl,
        mode: t.mode,
        created_at: t.created_at,
        executed_at: t.executed_at,
        total_value: t.total_value,
      })),
      new Date().toISOString(),
      startingCapital,
    );
  }, [trades, startingCapital]);

  // Streak calculation
  const streakInfo = useMemo(() => {
    if (!trades.length) return { current: 0, best: 0, worst: 0, type: "neutral" as const };
    const sorted = [...trades]
      .filter((t) => t.realized_pnl != null)
      .sort((a, b) => new Date(a.executed_at ?? a.created_at).getTime() - new Date(b.executed_at ?? b.created_at).getTime());

    let currentStreak = 0;
    let bestStreak = 0;
    let worstStreak = 0;
    let currentType: "win" | "loss" | "neutral" = "neutral";

    for (const trade of sorted) {
      const pnl = trade.realized_pnl ?? 0;
      if (pnl > 0) {
        if (currentType === "win") {
          currentStreak++;
        } else {
          currentStreak = 1;
          currentType = "win";
        }
        bestStreak = Math.max(bestStreak, currentStreak);
      } else if (pnl < 0) {
        if (currentType === "loss") {
          currentStreak--;
        } else {
          currentStreak = -1;
          currentType = "loss";
        }
        worstStreak = Math.min(worstStreak, currentStreak);
      }
    }

    return {
      current: currentStreak,
      best: bestStreak,
      worst: Math.abs(worstStreak),
      type: currentStreak > 0 ? "win" : currentStreak < 0 ? "loss" : "neutral" as const,
    };
  }, [trades]);

  if (!analytics || analytics.tradeCount === 0) {
    return (
      <div className="bg-slate-800 rounded-xl p-6 text-center border border-slate-700/40">
        <p className="text-slate-300">{t("keepTrading")}</p>
      </div>
    );
  }

  // Build 30-day calendar grid
  const today = new Date();
  const days: { date: Date; dayStr: string; pnl: number; trades: number }[] = [];
  for (let i = 29; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    const dayStr = d.toISOString().slice(0, 10);
    const dayData = analytics.dailyPnl.find((dp) => dp.day === dayStr);
    days.push({
      date: d,
      dayStr,
      pnl: dayData?.pnl ?? 0,
      trades: trades.filter((t) => {
        const ts = t.executed_at ?? t.created_at;
        return ts?.slice(0, 10) === dayStr;
      }).length,
    });
  }

  const weekDays = ["Ma", "Ti", "On", "To", "Fr", "Lø", "Sø"];

  return (
    <div className="space-y-6">
      {/* Streak Banner */}
      {streakInfo.current !== 0 && (
        <div
          className={`flex items-center gap-3 px-4 py-3 rounded-xl border ${
            streakInfo.type === "win"
              ? "bg-emerald-900/20 border-emerald-700/40"
              : "bg-rose-900/20 border-rose-700/40"
          }`}
        >
          {streakInfo.type === "win" ? (
            <Flame className="w-5 h-5 text-emerald-400" />
          ) : (
            <AlertTriangle className="w-5 h-5 text-rose-400" />
          )}
          <div>
            <p className={`text-sm font-semibold ${streakInfo.type === "win" ? "text-emerald-300" : "text-rose-300"}`}>
              {streakInfo.type === "win"
                ? t("winStreak", { count: streakInfo.current })
                : t("lossStreak", { count: Math.abs(streakInfo.current) })}
            </p>
            <p className="text-xs text-slate-400">
              {t("bestStreak", { wins: streakInfo.best, losses: streakInfo.worst })}
            </p>
          </div>
        </div>
      )}

      {/* Mini Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="bg-slate-800 rounded-xl p-4 border border-slate-700/40">
          <div className="flex items-center gap-2 text-emerald-400 mb-1">
            <Trophy className="w-4 h-4" />
            <span className="text-xs uppercase tracking-wider">{t("bestDay")}</span>
          </div>
          <p className="text-lg font-bold text-white">
            {analytics.bestDay ? `+${formatNOK(analytics.bestDay.pnl)}` : "—"}
          </p>
          <p className="text-xs text-slate-400">{analytics.bestDay?.day ?? ""}</p>
        </div>

        <div className="bg-slate-800 rounded-xl p-4 border border-slate-700/40">
          <div className="flex items-center gap-2 text-rose-400 mb-1">
            <Skull className="w-4 h-4" />
            <span className="text-xs uppercase tracking-wider">{t("worstDay")}</span>
          </div>
          <p className="text-lg font-bold text-white">
            {analytics.worstDay ? formatNOK(analytics.worstDay.pnl) : "—"}
          </p>
          <p className="text-xs text-slate-400">{analytics.worstDay?.day ?? ""}</p>
        </div>

        <div className="bg-slate-800 rounded-xl p-4 border border-slate-700/40">
          <div className="flex items-center gap-2 text-slate-300 mb-1">
            <TrendingUp className="w-4 h-4" />
            <span className="text-xs uppercase tracking-wider">{t("avgTrade")}</span>
          </div>
          <p className="text-lg font-bold text-white">
            {analytics.tradeCount > 0
              ? formatNOK(analytics.aggregates.totalEffectivePnl / analytics.tradeCount)
              : "—"}
          </p>
        </div>

        <div className="bg-slate-800 rounded-xl p-4 border border-slate-700/40">
          <div className="flex items-center gap-2 text-slate-300 mb-1">
            <TrendingDown className="w-4 h-4" />
            <span className="text-xs uppercase tracking-wider">{t("maxDrawdown")}</span>
          </div>
          <p className="text-lg font-bold text-white">
            {analytics.riskMetrics.maxConsecutiveLosses > 0
              ? `${analytics.riskMetrics.maxConsecutiveLosses} tap`
              : "—"}
          </p>
        </div>
      </div>

      {/* Calendar Heatmap */}
      <div className="bg-slate-800 rounded-xl p-5 border border-slate-700/40">
        <h3 className="text-sm font-semibold text-slate-200 mb-4">{t("dailyHeatmap")}</h3>
        <div className="flex flex-col gap-1">
          {/* Weekday headers */}
          <div className="grid grid-cols-7 gap-1 mb-1">
            {weekDays.map((d) => (
              <div key={d} className="text-[10px] text-slate-500 text-center">
                {d}
              </div>
            ))}
          </div>
          {/* Days grid */}
          <div className="grid grid-cols-7 gap-1">
            {days.map((day) => (
              <div
                key={day.dayStr}
                className={`aspect-square rounded-md ${getHeatColor(day.pnl, startingCapital)} relative group cursor-help transition-opacity hover:opacity-80`}
                title={getHeatTooltip(day.pnl, startingCapital, day.trades, formatNOK)}
              >
                <span className="absolute inset-0 flex items-center justify-center text-[9px] text-white/70 font-medium">
                  {day.date.getDate()}
                </span>
              </div>
            ))}
          </div>
          {/* Legend */}
          <div className="flex items-center gap-2 mt-3 text-[10px] text-slate-400">
            <span>{t("loss")}</span>
            <div className="flex gap-0.5">
              <div className="w-3 h-3 rounded bg-rose-700" />
              <div className="w-3 h-3 rounded bg-rose-600" />
              <div className="w-3 h-3 rounded bg-rose-500" />
              <div className="w-3 h-3 rounded bg-slate-700" />
              <div className="w-3 h-3 rounded bg-emerald-700" />
              <div className="w-3 h-3 rounded bg-emerald-600" />
              <div className="w-3 h-3 rounded bg-emerald-500" />
            </div>
            <span>{t("profit")}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
