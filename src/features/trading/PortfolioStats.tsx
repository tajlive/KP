"use client";

import { useTradingStore } from "@/store/tradingStore";
import { motion } from "framer-motion";
import {
  PiggyBank,
  Scale,
  TrendingDown,
  TrendingUp,
  Wallet,
} from "lucide-react";

export default function PortfolioStats() {
  const { portfolio, positions: _positions } = useTradingStore();

  const stats = [
    {
      label: "Total Equity",
      value: portfolio.equity,
      icon: Wallet,
      color: "blue",
      format: (v: number) => `$${v.toLocaleString()}`,
    },
    {
      label: "Tilgjengelig",
      value: portfolio.balance,
      icon: PiggyBank,
      color: "green",
      format: (v: number) => `$${v.toLocaleString()}`,
    },
    {
      label: "Margin Brukt",
      value: portfolio.marginUsed,
      icon: Scale,
      color: "yellow",
      format: (v: number) => `$${v.toLocaleString()}`,
    },
    {
      label: "Total P&L",
      value: portfolio.totalPnl,
      icon: portfolio.totalPnl >= 0 ? TrendingUp : TrendingDown,
      color: portfolio.totalPnl >= 0 ? "green" : "red",
      format: (v: number) => `${v >= 0 ? "+" : ""}$${v.toLocaleString()}`,
      percent: portfolio.totalPnlPercent,
    },
  ];

  const colorClasses: Record<
    string,
    { bg: string; text: string; light: string }
  > = {
    blue: {
      bg: "bg-blue-100 dark:bg-blue-900/30",
      text: "text-blue-600",
      light: "text-blue-500",
    },
    green: {
      bg: "bg-green-100 dark:bg-green-900/30",
      text: "text-green-600",
      light: "text-green-500",
    },
    yellow: {
      bg: "bg-yellow-100 dark:bg-yellow-900/30",
      text: "text-yellow-600",
      light: "text-yellow-500",
    },
    red: {
      bg: "bg-red-100 dark:bg-red-900/30",
      text: "text-red-600",
      light: "text-red-500",
    },
  };

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {stats.map((stat, index) => {
        const colors = colorClasses[stat.color];
        const Icon = stat.icon;

        return (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
            className="bg-white dark:bg-gray-900 rounded-2xl border-2 border-gray-200 dark:border-gray-800 p-4"
          >
            <div className="flex items-start justify-between mb-3">
              <div
                className={`w-10 h-10 ${colors.bg} rounded-xl flex items-center justify-center`}
              >
                <Icon className={`w-5 h-5 ${colors.text}`} />
              </div>
              {stat.percent !== undefined && (
                <span
                  className={`text-xs font-bold px-2 py-1 rounded-full ${
                    stat.percent >= 0
                      ? "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-200"
                      : "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-200"
                  }`}
                >
                  {stat.percent >= 0 ? "+" : ""}
                  {stat.percent.toFixed(2)}%
                </span>
              )}
            </div>

            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">
                {stat.label}
              </p>
              <motion.p
                key={stat.value}
                initial={{ scale: 1.05 }}
                animate={{ scale: 1 }}
                className="text-xl lg:text-2xl font-black text-gray-900 dark:text-white font-mono"
              >
                {stat.format(stat.value)}
              </motion.p>
            </div>

            {/* Margin usage bar */}
            {stat.label === "Margin Brukt" && portfolio.marginUsed > 0 && (
              <div className="mt-3">
                <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-yellow-500 rounded-full transition-all"
                    style={{
                      width: `${Math.min(
                        (portfolio.marginUsed /
                          (portfolio.marginUsed + portfolio.marginAvailable)) *
                          100,
                        100,
                      )}%`,
                    }}
                  />
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  {(
                    (portfolio.marginUsed /
                      (portfolio.marginUsed + portfolio.marginAvailable)) *
                    100
                  ).toFixed(1)}
                  % brukt
                </p>
              </div>
            )}
          </motion.div>
        );
      })}
    </div>
  );
}
