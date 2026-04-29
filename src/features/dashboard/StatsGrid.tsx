"use client";

import { motion } from "framer-motion";
import {
  TrendingUp,
  TrendingDown,
  Target,
  Activity,
  Trophy,
  AlertTriangle,
  Shield,
  Zap,
  BarChart3,
  Wallet,
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

export function StatsGrid({ stats }: StatsGridProps) {
  const getTrendColor = (trend: string) => {
    switch (trend) {
      case "up":
        return "text-emerald-600 dark:text-emerald-400";
      case "down":
        return "text-red-600 dark:text-red-400";
      default:
        return "text-gray-500 dark:text-slate-400";
    }
  };

  const getBgColor = (trend: string, highlight?: boolean) => {
    if (highlight) return "bg-gradient-to-br from-blue-500/20 to-purple-500/20 border-blue-500/30";
    switch (trend) {
      case "up":
        return "bg-white dark:bg-slate-800/50 hover:bg-emerald-50 dark:hover:bg-emerald-500/10 border-gray-200 dark:border-slate-700/50";
      case "down":
        return "bg-white dark:bg-slate-800/50 hover:bg-red-50 dark:hover:bg-red-500/10 border-gray-200 dark:border-slate-700/50";
      default:
        return "bg-white dark:bg-slate-800/50 border-gray-200 dark:border-slate-700/50";
    }
  };

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
      {stats.map((stat, index) => (
        <motion.div
          key={stat.label}
          className={`${getBgColor(
            stat.trend,
            stat.highlight
          )} rounded-xl p-4 border transition-all duration-200 cursor-pointer`}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: index * 0.05 }}
          whileHover={{ scale: 1.02, y: -2 }}
        >
          <div className="flex items-center justify-between mb-2">
            <stat.icon
              className={`w-4 h-4 ${
                stat.highlight ? "text-blue-600 dark:text-blue-400" : "text-gray-400 dark:text-slate-500"
              }`}
            />
            {stat.trend === "up" && !stat.highlight && (
              <TrendingUp className="w-3 h-3 text-emerald-400" />
            )}
            {stat.trend === "down" && (
              <TrendingDown className="w-3 h-3 text-red-400" />
            )}
          </div>

          <p
            className={`text-2xl font-bold ${
              stat.highlight ? "text-gray-900 dark:text-white" : getTrendColor(stat.trend)
            }`}
          >
            {stat.value}
          </p>

          <p className="text-gray-500 dark:text-slate-400 text-xs mt-1 truncate">{stat.label}</p>

          <p className="text-gray-400 dark:text-slate-500 text-[10px] mt-0.5">{stat.subtext}</p>
        </motion.div>
      ))}
    </div>
  );
}

// Mini versjon for kompakte dashboards
export function StatsGridMini({ stats }: StatsGridProps) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
      {stats.slice(0, 4).map((stat, index) => (
        <motion.div
          key={stat.label}
          className="bg-gray-100 dark:bg-slate-900 rounded-lg p-3 border border-gray-200 dark:border-slate-800"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: index * 0.1 }}
        >
          <div className="flex items-center gap-2 mb-1">
            <stat.icon className="w-3.5 h-3.5 text-gray-400 dark:text-slate-500" />
            <span className="text-gray-500 dark:text-slate-500 text-xs">{stat.label}</span>
          </div>
          <p
            className={`text-lg font-bold ${
              stat.trend === "up" ? "text-emerald-600 dark:text-emerald-400" : "text-gray-900 dark:text-white"
            }`}
          >
            {stat.value}
          </p>
        </motion.div>
      ))}
    </div>
  );
}

export default StatsGrid;
