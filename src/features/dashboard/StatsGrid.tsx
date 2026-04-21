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
  stats?: StatItem[];
}

const DEFAULT_STATS: StatItem[] = [
  {
    label: "Total avkastning",
    value: "+24.5%",
    subtext: "+12,450 kr",
    trend: "up",
    icon: TrendingUp,
    highlight: true,
  },
  {
    label: "Win rate",
    value: "73%",
    subtext: "11 av 15 trades",
    trend: "up",
    icon: Target,
  },
  {
    label: "Sharpe ratio",
    value: "1.8",
    subtext: "Utmerket",
    trend: "up",
    icon: Activity,
  },
  {
    label: "Maks drawdown",
    value: "-5.2%",
    subtext: "God risikostyring",
    trend: "down",
    icon: Shield,
  },
  {
    label: "Gj.snitt vinner",
    value: "+8.3%",
    subtext: "Per vinnende trade",
    trend: "up",
    icon: Trophy,
  },
  {
    label: "Gj.snitt taper",
    value: "-2.1%",
    subtext: "Kontrollert tap",
    trend: "neutral",
    icon: AlertTriangle,
  },
  {
    label: "Profit factor",
    value: "2.4",
    subtext: "Gevinst/tap ratio",
    trend: "up",
    icon: BarChart3,
  },
  {
    label: "Antall trades",
    value: "15",
    subtext: "Siste 30 dager",
    trend: "neutral",
    icon: Zap,
  },
];

export function StatsGrid({ stats = DEFAULT_STATS }: StatsGridProps) {
  const getTrendColor = (trend: string) => {
    switch (trend) {
      case "up":
        return "text-emerald-400";
      case "down":
        return "text-red-400";
      default:
        return "text-slate-400";
    }
  };

  const getBgColor = (trend: string, highlight?: boolean) => {
    if (highlight) return "bg-gradient-to-br from-blue-500/20 to-purple-500/20 border-blue-500/30";
    switch (trend) {
      case "up":
        return "bg-slate-800/50 hover:bg-emerald-500/10";
      case "down":
        return "bg-slate-800/50 hover:bg-red-500/10";
      default:
        return "bg-slate-800/50";
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
          )} rounded-xl p-4 border border-slate-700/50 transition-all duration-200 cursor-pointer`}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: index * 0.05 }}
          whileHover={{ scale: 1.02, y: -2 }}
        >
          <div className="flex items-center justify-between mb-2">
            <stat.icon
              className={`w-4 h-4 ${
                stat.highlight ? "text-blue-400" : "text-slate-500"
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
              stat.highlight ? "text-white" : getTrendColor(stat.trend)
            }`}
          >
            {stat.value}
          </p>

          <p className="text-slate-400 text-xs mt-1 truncate">{stat.label}</p>

          <p className="text-slate-500 text-[10px] mt-0.5">{stat.subtext}</p>
        </motion.div>
      ))}
    </div>
  );
}

// Mini versjon for kompakte dashboards
export function StatsGridMini({ stats = DEFAULT_STATS }: StatsGridProps) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
      {stats.slice(0, 4).map((stat, index) => (
        <motion.div
          key={stat.label}
          className="bg-slate-900 rounded-lg p-3 border border-slate-800"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: index * 0.1 }}
        >
          <div className="flex items-center gap-2 mb-1">
            <stat.icon className="w-3.5 h-3.5 text-slate-500" />
            <span className="text-slate-500 text-xs">{stat.label}</span>
          </div>
          <p
            className={`text-lg font-bold ${
              stat.trend === "up" ? "text-emerald-400" : "text-white"
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
