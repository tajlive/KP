"use client";

import { m } from "framer-motion";
import {
  TrendingUp,
  TrendingDown,
} from "lucide-react";

interface StatItem {
  label: string;
  value: string;
  subtext: string;
  trend: "up" | "down" | "neutral";
  icon: React.ElementType;
  highlight?: boolean;
}

interface StatsGridProps {
  stats: StatItem[];
}

const trendConfig = {
  up: {
    text: "text-emerald-600 dark:text-emerald-400",
    bg: "bg-emerald-500/8 dark:bg-emerald-500/10",
    border: "border-emerald-500/15 dark:border-emerald-500/20",
    iconBg: "bg-emerald-500/12",
    glow: "hover:shadow-emerald-500/5",
  },
  down: {
    text: "text-rose-600 dark:text-rose-400",
    bg: "bg-rose-500/8 dark:bg-rose-500/10",
    border: "border-rose-500/15 dark:border-rose-500/20",
    iconBg: "bg-rose-500/12",
    glow: "hover:shadow-rose-500/5",
  },
  neutral: {
    text: "text-gray-700 dark:text-slate-300",
    bg: "bg-gray-100 dark:bg-slate-800/60",
    border: "border-gray-200 dark:border-slate-700/50",
    iconBg: "bg-gray-200/60 dark:bg-slate-700/40",
    glow: "hover:shadow-slate-500/5",
  },
} as const;

const highlightConfig = {
  bg: "bg-gradient-to-br from-[#0052FF]/10 via-blue-500/8 to-indigo-500/10 dark:from-[#0052FF]/15 dark:via-blue-500/10 dark:to-indigo-500/12",
  border: "border-[#0052FF]/20 dark:border-[#0052FF]/30",
  iconBg: "bg-[#0052FF]/12",
  glow: "hover:shadow-[#0052FF]/8",
};

export function StatsGrid({ stats }: StatsGridProps) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-3 gap-3 sm:gap-4">
      {stats.map((stat, index) => {
        const config = stat.highlight ? null : trendConfig[stat.trend];

        return (
          <m.div
            key={stat.label}
            className={`
              relative rounded-2xl p-4 sm:p-5 border backdrop-blur-xl
              transition-all duration-300 cursor-pointer
              min-h-[100px] touch-manipulation
              shadow-sm hover:shadow-xl hover:border-white/[0.12]
              ${stat.highlight
                ? `${highlightConfig.bg} ${highlightConfig.border} ${highlightConfig.glow}`
                : `bg-white/80 dark:bg-white/[0.03] border-gray-200/60 dark:border-white/[0.06] ${config!.glow}`
              }
            `}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35, delay: index * 0.06, ease: [0.25, 0.46, 0.45, 0.94] }}
            whileHover={{ y: -3, scale: 1.01 }}
            whileTap={{ scale: 0.98 }}
          >
            {/* Icon + Trend indicator row */}
            <div className="flex items-center justify-between mb-3">
              <div
                className={`w-8 h-8 rounded-xl flex items-center justify-center ${
                  stat.highlight ? highlightConfig.iconBg : config!.iconBg
                }`}
              >
                <stat.icon
                  className={`w-4 h-4 ${
                    stat.highlight
                      ? "text-[#0052FF] dark:text-blue-400"
                      : "text-gray-500 dark:text-slate-400"
                  }`}
                />
              </div>
              {stat.trend === "up" && !stat.highlight && (
                <div className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/15">
                  <TrendingUp className="w-3 h-3 text-emerald-500" />
                </div>
              )}
              {stat.trend === "down" && (
                <div className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-rose-500/10 border border-rose-500/15">
                  <TrendingDown className="w-3 h-3 text-rose-500" />
                </div>
              )}
            </div>

            {/* Value — prominent */}
            <p
              className={`text-xl sm:text-2xl font-bold tracking-tight tabular-nums ${
                stat.highlight
                  ? "text-gray-900 dark:text-white"
                  : config!.text
              }`}
            >
              {stat.value}
            </p>

            {/* Label */}
            <p className="text-gray-500 dark:text-slate-400 text-xs sm:text-sm mt-1.5 font-medium">
              {stat.label}
            </p>

            {/* Subtext */}
            <p className="text-gray-400 dark:text-slate-500 text-[10px] sm:text-xs mt-0.5">
              {stat.subtext}
            </p>
          </m.div>
        );
      })}
    </div>
  );
}

/** Mini version for compact dashboards */
export function StatsGridMini({ stats }: StatsGridProps) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-2 sm:gap-3">
      {stats.slice(0, 4).map((stat, index) => (
        <m.div
          key={stat.label}
          className="bg-gray-50 dark:bg-slate-900/80 rounded-xl p-3 border border-gray-200 dark:border-slate-800 backdrop-blur-sm"
          initial={{ opacity: 0, scale: 0.96 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: index * 0.08, duration: 0.3 }}
          whileTap={{ scale: 0.97 }}
        >
          <div className="flex items-center gap-2 mb-1.5">
            <stat.icon className="w-3.5 h-3.5 text-gray-400 dark:text-slate-500" />
            <span className="text-gray-500 dark:text-slate-500 text-xs font-medium truncate">
              {stat.label}
            </span>
          </div>
          <p
            className={`text-lg font-bold tabular-nums ${
              stat.trend === "up"
                ? "text-emerald-600 dark:text-emerald-400"
                : stat.trend === "down"
                  ? "text-rose-600 dark:text-rose-400"
                  : "text-gray-900 dark:text-white"
            }`}
          >
            {stat.value}
          </p>
        </m.div>
      ))}
    </div>
  );
}

export default StatsGrid;
