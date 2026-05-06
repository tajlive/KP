"use client";

import { useTradingStore } from "@/store/tradingStore";
import { useTranslations } from "next-intl";
import { motion } from "framer-motion";
import {
  PiggyBank,
  Scale,
  TrendingDown,
  TrendingUp,
  Wallet,
} from "lucide-react";
import { formatNOK } from "@/lib/format/currency";

export default function PortfolioStats() {
  const { portfolio } = useTradingStore();
  const t = useTranslations("dashboard.portfolioStats");

  const stats = [
    {
      label: t("totalEquity"),
      value: portfolio.equity,
      icon: Wallet,
      color: "blue",
    },
    {
      label: t("available"),
      value: portfolio.balance,
      icon: PiggyBank,
      color: "green",
    },
    {
      label: t("marginUsed"),
      value: portfolio.marginUsed,
      icon: Scale,
      color: "yellow",
    },
    {
      label: t("totalPnl"),
      value: portfolio.totalPnl,
      icon: portfolio.totalPnl >= 0 ? TrendingUp : TrendingDown,
      color: portfolio.totalPnl >= 0 ? "green" : "red",
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
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
      {stats.map((stat, index) => {
        const colors = colorClasses[stat.color];
        const Icon = stat.icon;

        return (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
            className="bg-white dark:bg-gray-900 rounded-2xl border-2 border-gray-200 dark:border-gray-800 p-3 sm:p-4"
          >
            <div className="flex items-start justify-between mb-2 sm:mb-3">
              <div
                className={`w-8 h-8 sm:w-10 sm:h-10 ${colors.bg} rounded-xl flex items-center justify-center`}
              >
                <Icon className={`w-4 h-4 sm:w-5 sm:h-5 ${colors.text}`} />
              </div>
              {stat.percent !== undefined && (
                <span
                  className={`text-[10px] sm:text-xs font-bold px-2 py-1 rounded-full ${
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
              <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 mb-1">
                {stat.label}
              </p>
              <motion.p
                key={stat.value}
                initial={{ scale: 1.05 }}
                animate={{ scale: 1 }}
                className="text-lg sm:text-xl lg:text-2xl font-black text-gray-900 dark:text-white font-mono"
              >
                {formatNOK(stat.value)}
              </motion.p>
            </div>

            {/* Margin usage bar */}
            {stat.label === t("marginUsed") && portfolio.marginUsed > 0 && (
              <div className="mt-2 sm:mt-3">
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
                <p className="text-[10px] sm:text-xs text-gray-500 mt-1">
                  {(
                    (portfolio.marginUsed /
                      (portfolio.marginUsed + portfolio.marginAvailable)) *
                    100
                  ).toFixed(1)}
                  {t("percentUsed")}
                </p>
              </div>
            )}
          </motion.div>
        );
      })}
    </div>
  );
}
