"use client";

import { motion } from "framer-motion";
import { useLocale } from "next-intl";
import { useState } from "react";
import { Info, ChevronLeft, ChevronRight } from "lucide-react";

interface DailyPnl {
  day: string;
  pnl: number;
}

interface WinLossHeatmapProps {
  data?: DailyPnl[];
  loading?: boolean;
}

function Skeleton() {
  return (
    <div className="h-[320px] w-full bg-slate-900 rounded-2xl border border-slate-700 animate-pulse" />
  );
}

function EmptyState() {
  const locale = useLocale();
  const isNo = locale === "no";
  return (
    <div className="h-[320px] w-full bg-slate-900 rounded-2xl border border-slate-700 flex items-center justify-center">
      <p className="text-slate-400 dark:text-slate-500 text-sm">
        {isNo ? "Ikke nok data for heatmap" : "Not enough data for heatmap"}
      </p>
    </div>
  );
}

/** Group daily PnL by ISO week. Returns array of weeks, each with 7 days (Mon-Sun). */
function groupByWeeks(data: DailyPnl[]): Array<Array<{ day: string; pnl: number | null }>> {
  if (data.length === 0) return [];

  // Sort by day
  const sorted = [...data].sort((a, b) => a.day.localeCompare(b.day));
  const firstDay = new Date(sorted[0].day + "T00:00:00");
  const lastDay = new Date(sorted[sorted.length - 1].day + "T00:00:00");

  // Create a map of day -> pnl
  const pnlMap = new Map<string, number>();
  sorted.forEach((d) => pnlMap.set(d.day, d.pnl));

  // Fill all days between first and last
  const allDays: { day: string; pnl: number | null }[] = [];
  const cursor = new Date(firstDay);
  while (cursor <= lastDay) {
    const iso = cursor.toISOString().slice(0, 10);
    allDays.push({ day: iso, pnl: pnlMap.get(iso) ?? null });
    cursor.setDate(cursor.getDate() + 1);
  }

  // Group into weeks (Mon-Sun)
  const weeks: Array<Array<{ day: string; pnl: number | null }>> = [];
  let currentWeek: Array<{ day: string; pnl: number | null }> = [];

  allDays.forEach((d) => {
    const date = new Date(d.day + "T00:00:00");
    const dayOfWeek = date.getDay(); // 0=Sun, 1=Mon
    const mondayBased = dayOfWeek === 0 ? 6 : dayOfWeek - 1;

    if (mondayBased === 0 && currentWeek.length > 0) {
      weeks.push(currentWeek);
      currentWeek = [];
    }
    currentWeek[mondayBased] = d;
  });

  if (currentWeek.length > 0) {
    weeks.push(currentWeek);
  }

  return weeks;
}

function getColorClass(pnl: number | null, maxPnl: number): string {
  if (pnl === null) return "bg-gray-100 dark:bg-slate-800/50";
  if (pnl === 0) return "bg-slate-700";

  const intensity = Math.min(Math.abs(pnl) / Math.max(maxPnl * 0.6, 1), 1);
  if (pnl > 0) {
    if (intensity > 0.8) return "bg-emerald-500";
    if (intensity > 0.5) return "bg-emerald-600";
    if (intensity > 0.2) return "bg-emerald-700";
    return "bg-emerald-800/70";
  }
  if (intensity > 0.8) return "bg-red-500";
  if (intensity > 0.5) return "bg-red-600";
  if (intensity > 0.2) return "bg-red-700";
  return "bg-red-800/70";
}

const DAY_LABELS_NO = ["Man", "Tir", "Ons", "Tor", "Fre", "Lør", "Søn"];
const DAY_LABELS_EN = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

export function WinLossHeatmap({ data, loading }: WinLossHeatmapProps) {
  const locale = useLocale();
  const isNo = locale === "no";
  const [showInfo, setShowInfo] = useState(false);
  const [weekOffset, setWeekOffset] = useState(0);

  if (loading) return <Skeleton />;
  if (!data || data.length === 0) return <EmptyState />;

  const weeks = groupByWeeks(data);
  const maxPnl = Math.max(...data.map((d) => Math.abs(d.pnl)), 1);

  const winningDays = data.filter((d) => d.pnl > 0).length;
  const losingDays = data.filter((d) => d.pnl < 0).length;
  const winRate = data.length > 0 ? (winningDays / data.length) * 100 : 0;

  // Show max 12 weeks at a time
  const WEEKS_PER_PAGE = 12;
  const totalPages = Math.max(1, Math.ceil(weeks.length / WEEKS_PER_PAGE));
  const currentPage = Math.min(weekOffset, totalPages - 1);
  const visibleWeeks = weeks.slice(
    currentPage * WEEKS_PER_PAGE,
    (currentPage + 1) * WEEKS_PER_PAGE
  );

  const dayLabels = isNo ? DAY_LABELS_NO : DAY_LABELS_EN;

  return (
    <motion.div
      className="bg-white dark:bg-slate-900 rounded-2xl p-5 border border-gray-200 dark:border-slate-700 shadow-sm"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
    >
      <div className="flex items-center justify-between mb-4">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-semibold text-slate-900 dark:text-white">
              {isNo ? "Daglig P&L Heatmap" : "Daily P&L Heatmap"}
            </h3>
            <button
              onClick={() => setShowInfo(!showInfo)}
              className="text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:text-slate-300 transition-colors"
            >
              <Info className="w-3.5 h-3.5" />
            </button>
          </div>
          <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">
            {isNo
              ? `${winningDays} grønne · ${losingDays} røde · ${winRate.toFixed(0)}% win rate`
              : `${winningDays} green · ${losingDays} red · ${winRate.toFixed(0)}% win rate`}
          </p>
        </div>

        {totalPages > 1 && (
          <div className="flex items-center gap-1">
            <button
              onClick={() => setWeekOffset((p) => Math.max(0, p - 1))}
              disabled={currentPage === 0}
              className="p-1 rounded hover:bg-slate-700 disabled:opacity-30 transition-colors"
            >
              <ChevronLeft className="w-4 h-4 text-slate-400 dark:text-slate-500 dark:text-slate-400" />
            </button>
            <span className="text-xs text-slate-400 dark:text-slate-500">
              {currentPage + 1}/{totalPages}
            </span>
            <button
              onClick={() => setWeekOffset((p) => Math.min(totalPages - 1, p + 1))}
              disabled={currentPage >= totalPages - 1}
              className="p-1 rounded hover:bg-slate-700 disabled:opacity-30 transition-colors"
            >
              <ChevronRight className="w-4 h-4 text-slate-400 dark:text-slate-500 dark:text-slate-400" />
            </button>
          </div>
        )}
      </div>

      {showInfo && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: "auto" }}
          className="mb-3 p-3 bg-blue-500/10 border border-blue-500/20 rounded-lg text-xs text-blue-200"
        >
          {isNo
            ? "Hver farge representerer din P&L for en dag. Mørk grønn = stor gevinst, mørk rød = stort tap. Bruk dette til å identifisere mønstre (f.eks. tap på mandager)."
            : "Each color represents your P&L for one day. Dark green = big win, dark red = big loss. Use this to identify patterns (e.g., losses on Mondays)."}
        </motion.div>
      )}

      {/* Day labels */}
      <div className="flex gap-1">
        <div className="w-8" />
        {visibleWeeks.map((_, wi) => (
          <div key={wi} className="flex-1 text-center">
            <span className="text-[10px] text-slate-600">
              {weeks[currentPage * WEEKS_PER_PAGE + wi]?.[0]?.day?.slice(5) ?? ""}
            </span>
          </div>
        ))}
      </div>

      {/* Heatmap grid */}
      <div className="space-y-1 mt-1">
        {dayLabels.map((label, dayIndex) => (
          <div key={label} className="flex items-center gap-1">
            <span className="w-8 text-[10px] text-slate-400 dark:text-slate-500 text-right pr-1">{label}</span>
            <div className="flex gap-1 flex-1">
              {visibleWeeks.map((week, wi) => {
                const day = week[dayIndex];
                const cellKey = `${wi}-${dayIndex}`;
                return (
                  <div
                    key={cellKey}
                    className={`flex-1 aspect-square rounded-sm ${getColorClass(
                      day?.pnl ?? null,
                      maxPnl
                    )} transition-all hover:scale-110 hover:ring-1 hover:ring-white/30 cursor-pointer`}
                    title={
                      day?.day
                        ? `${day.day}: ${day.pnl !== null ? `${day.pnl >= 0 ? "+" : ""}${day.pnl.toLocaleString()} NOK` : "Ingen trades"}`
                        : undefined
                    }
                  />
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {/* Legend */}
      <div className="flex items-center justify-center gap-3 mt-4">
        <span className="text-[10px] text-slate-400 dark:text-slate-500">{isNo ? "Tap" : "Loss"}</span>
        <div className="flex gap-0.5">
          {["bg-red-800/70", "bg-red-700", "bg-red-600", "bg-red-500"].map((c) => (
            <div key={c} className={`w-4 h-3 rounded-sm ${c}`} />
          ))}
          <div className="w-4 h-3 rounded-sm bg-slate-700" />
          {["bg-emerald-800/70", "bg-emerald-700", "bg-emerald-600", "bg-emerald-500"].map((c) => (
            <div key={c} className={`w-4 h-3 rounded-sm ${c}`} />
          ))}
        </div>
        <span className="text-[10px] text-slate-400 dark:text-slate-500">{isNo ? "Gevinst" : "Win"}</span>
      </div>
    </motion.div>
  );
}

export default WinLossHeatmap;
