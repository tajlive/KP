"use client";

import { cn } from "@/lib/utils";
import type { LeaderboardEntry } from "@/lib/shared";

// ─── Level thresholds ───────────────────────────────────────────────────────

interface LevelInfo {
  minTrades: number;
  level: number;
  label: string;
}

const LEVELS: LevelInfo[] = [
  { minTrades: 0, level: 1, label: "Nybegynner" },
  { minTrades: 10, level: 2, label: "Lærling" },
  { minTrades: 25, level: 3, label: "Aktiv" },
  { minTrades: 50, level: 4, label: "Pro" },
  { minTrades: 100, level: 5, label: "Elite" },
];

const NEXT_LEVEL: Record<number, { minTrades: number } | null> = {
  1: { minTrades: 10 },
  2: { minTrades: 25 },
  3: { minTrades: 50 },
  4: { minTrades: 100 },
  5: null, // max level — no next
};

// ─── Helpers ────────────────────────────────────────────────────────────────

export function getTraderLevel(entry: LeaderboardEntry) {
  const trades = entry.total_trades;

  // Find current level (highest threshold the user has reached)
  let currentLevel: LevelInfo = LEVELS[0];
  for (const l of LEVELS) {
    if (trades >= l.minTrades) {
      currentLevel = l;
    }
  }

  // Calculate progress toward next level
  const next = NEXT_LEVEL[currentLevel.level];
  let progress: number;

  if (!next) {
    // Elite — already at max, cap at 100
    progress = 100;
  } else {
    const rangeStart = currentLevel.minTrades;
    const rangeEnd = next.minTrades;
    const rangeSize = rangeEnd - rangeStart;
    const earned = trades - rangeStart;
    progress = Math.min(100, Math.round((earned / rangeSize) * 100));
  }

  return {
    level: currentLevel.level,
    label: currentLevel.label,
    progress,
  };
}

// ─── Component ──────────────────────────────────────────────────────────────

interface TraderProgressProps {
  entry: LeaderboardEntry;
  className?: string;
}

export function TraderProgress({ entry, className }: TraderProgressProps) {
  const { level, label, progress } = getTraderLevel(entry);

  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      {/* Label + Level */}
      <div className="flex items-center justify-between text-xs">
        <span className="font-medium text-zinc-300">{label}</span>
        <span className="font-bold text-zinc-500">Lvl {level}</span>
      </div>

      {/* Progress bar */}
      <div className="h-2 w-full overflow-hidden rounded-full bg-slate-200">
        <div
          className="h-full rounded-full bg-blue-500 transition-all duration-500"
          style={{ width: `${progress}%` }}
        />
      </div>

      {/* Trades count */}
      <p className="text-[11px] text-zinc-500">
        {entry.total_trades} handler
        {progress < 100 && " til neste nivå"}
      </p>
    </div>
  );
}
