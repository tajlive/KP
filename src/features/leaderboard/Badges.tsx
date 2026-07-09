"use client";

import { cn } from "@/lib/utils";
import type { LeaderboardEntry } from "@/types/paper-trading";

// ─── Types ──────────────────────────────────────────────────────────────────

export interface Badge {
  emoji: string;
  label: string;
  color: string; // Tailwind bg/text/border color
}

// ─── Badge definitions ──────────────────────────────────────────────────────

const BADGE_DEFS: Record<string, Omit<Badge, "label"> & { label: string }> = {
  moon: {
    emoji: "🚀",
    label: "Til månen",
    color: "purple",
  },
  profitable: {
    emoji: "💰",
    label: "Profitabel",
    color: "green",
  },
  sniper: {
    emoji: "🎯",
    label: "Snikskytter",
    color: "blue",
  },
  trader: {
    emoji: "⚡",
    label: "Trader",
    color: "yellow",
  },
  diamond: {
    emoji: "💎",
    label: "Diamanthånd",
    color: "slate",
  },
} as const;

const COLOR_MAP: Record<string, { bg: string; ring: string; text: string }> = {
  purple: {
    bg: "bg-purple-100 dark:bg-purple-900/40",
    ring: "ring-purple-300 dark:ring-purple-600",
    text: "text-purple-700 dark:text-purple-300",
  },
  green: {
    bg: "bg-green-100 dark:bg-green-900/40",
    ring: "ring-green-300 dark:ring-green-600",
    text: "text-green-700 dark:text-green-300",
  },
  blue: {
    bg: "bg-blue-100 dark:bg-blue-900/40",
    ring: "ring-blue-300 dark:ring-blue-600",
    text: "text-blue-700 dark:text-blue-300",
  },
  yellow: {
    bg: "bg-yellow-100 dark:bg-yellow-900/40",
    ring: "ring-yellow-300 dark:ring-yellow-600",
    text: "text-yellow-700 dark:text-yellow-300",
  },
  slate: {
    bg: "bg-slate-100 dark:bg-slate-800",
    ring: "ring-slate-300 dark:ring-slate-600",
    text: "text-slate-600 dark:text-slate-400",
  },
};

// ─── Badge logic ─────────────────────────────────────────────────────────────

/**
 * Returns all badges a leaderboard entry qualifies for.
 * Each badge is a separate achievement; an entry can have multiple.
 */
export function getBadges(entry: LeaderboardEntry): Badge[] {
  const badges: Badge[] = [];
  const { return_pct, total_trades, win_rate } = entry;

  // 🚀 Til månen — exceptional returns
  if (return_pct > 100) {
    badges.push({
      emoji: BADGE_DEFS.moon.emoji,
      label: BADGE_DEFS.moon.label,
      color: BADGE_DEFS.moon.color,
    });
  }

  // 💰 Profitabel — positive return with meaningful activity
  if (return_pct > 0 && total_trades >= 10) {
    badges.push({
      emoji: BADGE_DEFS.profitable.emoji,
      label: BADGE_DEFS.profitable.label,
      color: BADGE_DEFS.profitable.color,
    });
  }

  // 🎯 Snikskytter — high accuracy
  if (win_rate >= 70) {
    badges.push({
      emoji: BADGE_DEFS.sniper.emoji,
      label: BADGE_DEFS.sniper.label,
      color: BADGE_DEFS.sniper.color,
    });
  }

  // ⚡ Trader — high volume
  if (total_trades >= 50) {
    badges.push({
      emoji: BADGE_DEFS.trader.emoji,
      label: BADGE_DEFS.trader.label,
      color: BADGE_DEFS.trader.color,
    });
  }

  // 💎 Diamanthånd — holds through losses (return_pct < 0, but still trading)
  if (return_pct < 0) {
    badges.push({
      emoji: BADGE_DEFS.diamond.emoji,
      label: BADGE_DEFS.diamond.label,
      color: BADGE_DEFS.diamond.color,
    });
  }

  return badges;
}

// ─── Component ───────────────────────────────────────────────────────────────

interface TraderBadgesProps {
  badges: Badge[];
  className?: string;
}

/**
 * Renders a row of small round achievement badges.
 * Each badge shows an emoji icon; the text label is hidden on mobile (sm:block).
 */
export function TraderBadges({ badges, className }: TraderBadgesProps) {
  if (badges.length === 0) return null;

  return (
    <div className={cn("flex flex-wrap items-center gap-1.5", className)}>
      {badges.map((badge, i) => {
        const colors = COLOR_MAP[badge.color] ?? COLOR_MAP.slate;
        return (
          <span
            key={`${badge.color}-${i}`}
            className={cn(
              "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset",
              colors.bg,
              colors.ring,
              colors.text,
            )}
            title={badge.label}
          >
            <span className="shrink-0">{badge.emoji}</span>
            <span className="hidden sm:inline">{badge.label}</span>
          </span>
        );
      })}
    </div>
  );
}
