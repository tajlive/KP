"use client";

import { cn } from "@/lib/utils";
import { useCallback, useEffect, useState } from "react";
import { motion } from "framer-motion";
import {
  Award,
  Flame,
  TrendingUp,
  Crown,
  Sparkles,
  Fish,
  Lock,
} from "lucide-react";

// ─── Types ──────────────────────────────────────────────────────────────────

export interface Achievement {
  type: string;
  label: string;
  description: string;
  emoji: string;
  icon: React.ReactNode;
  color: string; // Tailwind color classes
}

export interface UserAchievement {
  id: string;
  achievement_type: string;
  earned_at: string;
  metadata?: Record<string, unknown>;
}

// ─── Achievement definitions ────────────────────────────────────────────────

const ACHIEVEMENT_DEFS: Record<string, Achievement> = {
  first_trade: {
    type: "first_trade",
    label: "Første trade",
    description: "Fullfør din første paper trade",
    emoji: "🎯",
    icon: <Award className="w-5 h-5" />,
    color: "from-blue-500 to-cyan-500",
  },
  streak_7_days: {
    type: "streak_7_days",
    label: "7 dagers streak",
    description: "Tradet 7 dager på rad",
    emoji: "🔥",
    icon: <Flame className="w-5 h-5" />,
    color: "from-orange-500 to-red-500",
  },
  profit_master: {
    type: "profit_master",
    label: "Profit-mester",
    description: "Nådd 10 000 kr i profit",
    emoji: "💰",
    icon: <TrendingUp className="w-5 h-5" />,
    color: "from-emerald-500 to-green-500",
  },
  top_10_percent: {
    type: "top_10_percent",
    label: "Topp 10%",
    description: "På leaderboard topp 10%",
    emoji: "🏆",
    icon: <Crown className="w-5 h-5" />,
    color: "from-yellow-400 to-amber-500",
  },
  pilot_master: {
    type: "pilot_master",
    label: "Pilot-mester",
    description: "Fullført 10 Pilot-trades",
    emoji: "🃏",
    icon: <Sparkles className="w-5 h-5" />,
    color: "from-purple-500 to-violet-500",
  },
  whale: {
    type: "whale",
    label: "Whale",
    description: "Paper balance over 500 000 kr",
    emoji: "🐋",
    icon: <Fish className="w-5 h-5" />,
    color: "from-sky-400 to-blue-600",
  },
};

const ALL_ACHIEVEMENT_TYPES = Object.keys(ACHIEVEMENT_DEFS);

// ─── Hook: Fetch achievements ───────────────────────────────────────────────

export function useAchievements() {
  const [achievements, setAchievements] = useState<UserAchievement[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchAchievements = useCallback(async () => {
    try {
      const res = await fetch("/api/gamification/achievements");
      if (!res.ok) {
        setAchievements([]);
        setLoading(false);
        return;
      }
      const data = await res.json();
      if (data.achievements) {
        setAchievements(
          data.achievements.map(
            (a: Record<string, unknown>) =>
              ({
                id: String(a.achievement_type),
                achievement_type: String(a.achievement_type),
                earned_at: String(a.earned_at),
                metadata: a.metadata as Record<string, unknown> | undefined,
              }) as UserAchievement
          )
        );
      }
    } catch {
      // Silently fail — achievements are decorative
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAchievements();
  }, [fetchAchievements]);

  return { achievements, loading, refetch: fetchAchievements };
}

// ─── Component: AchievementsBadge ───────────────────────────────────────────

interface AchievementsBadgeProps {
  className?: string;
  compact?: boolean;
  /** If true, auto-fetches achievements. Otherwise pass them in. */
  autoFetch?: boolean;
  achievements?: UserAchievement[];
  loading?: boolean;
  /** Show earned count vs total (default: false — shows all) */
  showCount?: boolean;
}

export function AchievementsBadge({
  className,
  compact = false,
  autoFetch = true,
  achievements: externalAchievements,
  loading: externalLoading,
  showCount = false,
}: AchievementsBadgeProps) {
  const {
    achievements: fetchedAchievements,
    loading: fetchedLoading,
    refetch,
  } = useAchievements();

  const achievements = autoFetch ? fetchedAchievements : (externalAchievements ?? fetchedAchievements);
  const loading = autoFetch ? fetchedLoading : (externalLoading ?? false);

  const earnedTypes = new Set(
    achievements.map((a) => a.achievement_type)
  );

  const earnedCount = earnedTypes.size;
  const totalCount = ALL_ACHIEVEMENT_TYPES.length;

  if (loading) {
    return (
      <div
        className={cn(
          "flex flex-wrap gap-3",
          compact && "gap-2",
          className
        )}
      >
        {ALL_ACHIEVEMENT_TYPES.slice(0, compact ? 3 : totalCount).map(
          (type) => (
            <div
              key={type}
              className="w-12 h-12 rounded-xl bg-kp-bg-tertiary animate-pulse"
            />
          )
        )}
      </div>
    );
  }

  if (showCount) {
    return (
      <div className={cn("flex items-center gap-2", className)}>
        <div className="flex -space-x-2">
          {ALL_ACHIEVEMENT_TYPES.slice(0, 4).map((type) => {
            const def = ACHIEVEMENT_DEFS[type];
            const earned = earnedTypes.has(type);
            return (
              <div
                key={type}
                className={cn(
                  "w-8 h-8 rounded-full flex items-center justify-center ring-2 ring-kp-bg-primary text-sm",
                  earned
                    ? "bg-gradient-to-br " + def.color
                    : "bg-kp-bg-tertiary text-kp-text-muted"
                )}
                title={earned ? def.label : `${def.label} (låst)`}
              >
                {earned ? def.emoji : <Lock className="w-3.5 h-3.5" />}
              </div>
            );
          })}
          {totalCount > 4 && (
            <div className="w-8 h-8 rounded-full bg-kp-bg-tertiary flex items-center justify-center ring-2 ring-kp-bg-primary text-[10px] text-kp-text-muted font-medium">
              +{totalCount - 4}
            </div>
          )}
        </div>
        <span className="text-xs text-kp-text-muted">
          {earnedCount}/{totalCount}
        </span>
      </div>
    );
  }

  return (
    <div
      className={cn(
        compact
          ? "flex flex-wrap gap-2"
          : "space-y-2",
        className
      )}
    >
      {ALL_ACHIEVEMENT_TYPES.map((type, index) => {
        const def = ACHIEVEMENT_DEFS[type];
        const earned = earnedTypes.has(type);
        const userAchievement = achievements.find(
          (a) => a.achievement_type === type
        );

        if (compact) {
          return (
            <motion.div
              key={type}
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: index * 0.05 }}
              className={cn(
                "flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium transition-all",
                earned
                  ? `bg-gradient-to-r ${def.color}/20 border border-${def.color.split(" ")[0]}/30 text-white`
                  : "bg-kp-bg-tertiary border border-kp-border text-kp-text-muted opacity-60"
              )}
              title={earned ? def.label : `${def.label} — ${def.description}`}
            >
              <span className="shrink-0 text-sm">
                {earned ? def.emoji : <Lock className="w-3 h-3" />}
              </span>
              <span>{def.label}</span>
            </motion.div>
          );
        }

        // Full view
        return (
          <motion.div
            key={type}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.05 }}
            className={cn(
              "flex items-center gap-3 rounded-xl p-3 transition-all",
              earned
                ? `bg-gradient-to-r ${def.color}/10 border border-${def.color.split(" ")[0]}/20`
                : "bg-kp-bg-tertiary/50 border border-kp-border opacity-60"
            )}
          >
            {/* Icon */}
            <div
              className={cn(
                "flex h-10 w-10 shrink-0 items-center justify-center rounded-full",
                earned
                  ? `bg-gradient-to-br ${def.color} shadow-lg`
                  : "bg-kp-bg-tertiary"
              )}
            >
              {earned ? (
                <span className="text-lg">{def.emoji}</span>
              ) : (
                <Lock className="w-4 h-4 text-kp-text-muted" />
              )}
            </div>

            {/* Info */}
            <div className="min-w-0 flex-1">
              <p
                className={cn(
                  "text-sm font-bold truncate",
                  earned ? "text-white" : "text-kp-text-muted"
                )}
              >
                {def.label}
              </p>
              <p className="text-xs text-kp-text-muted truncate">
                {def.description}
              </p>
            </div>

            {/* Earned date */}
            {earned && userAchievement?.earned_at && (
              <span className="shrink-0 text-[10px] text-kp-text-muted whitespace-nowrap">
                {new Date(userAchievement.earned_at).toLocaleDateString(
                  "no-NO"
                )}
              </span>
            )}
          </motion.div>
        );
      })}
    </div>
  );
}

// ─── Exports ─────────────────────────────────────────────────────────────────

export { ACHIEVEMENT_DEFS, ALL_ACHIEVEMENT_TYPES };
