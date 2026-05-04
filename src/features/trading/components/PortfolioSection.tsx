"use client";

import { useTranslations } from "next-intl";
import { Wallet, DollarSign, BarChart3, TrendingUp } from "lucide-react";
import type { Portfolio } from "@/lib/trading-api";
import type { Trade } from "@/lib/trading-api";
import type { UserStrategy } from "@/lib/trading-api";
import { PortfolioCharts } from "./PortfolioCharts";
import { PerformanceSection } from "./PerformanceSection";

export function PortfolioSection({
  portfolio,
  trades,
  activeStrategies,
  formatNOK,
}: {
  portfolio: Portfolio | null;
  trades: Trade[];
  activeStrategies: UserStrategy[];
  formatNOK: (v: number) => string;
}) {
  const t = useTranslations("trading.desk");

  if (!portfolio) {
    return (
      <div className="bg-slate-800 rounded-xl p-6 text-center">
        <p className="text-slate-300">{t("welcomeEmpty")}</p>
      </div>
    );
  }

  const isProfit = portfolio.total_pnl >= 0;

  return (
    <div className="space-y-6">
      {/* KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-slate-800 rounded-xl p-4 border border-slate-700/40">
          <div className="flex items-center gap-2 text-slate-300 text-sm mb-1">
            <Wallet className="w-4 h-4 shrink-0" aria-hidden />
            <span>{t("totalValue")}</span>
          </div>
          <p className="text-xl sm:text-2xl font-bold text-white">
            {formatNOK(portfolio.total_value)}
          </p>
        </div>

        <div className="bg-slate-800 rounded-xl p-4 border border-slate-700/40">
          <div className="flex items-center gap-2 text-slate-300 text-sm mb-1">
            <DollarSign className="w-4 h-4 shrink-0" aria-hidden />
            <span>{t("cash")}</span>
          </div>
          <p className="text-xl sm:text-2xl font-bold text-white">
            {formatNOK(portfolio.cash_balance)}
          </p>
        </div>

        <div className="bg-slate-800 rounded-xl p-4 border border-slate-700/40">
          <div className="flex items-center gap-2 text-slate-300 text-sm mb-1">
            <BarChart3 className="w-4 h-4 shrink-0" aria-hidden />
            <span>{t("pnl")}</span>
          </div>
          <p
            className={`text-xl sm:text-2xl font-bold ${isProfit ? "text-emerald-400" : "text-rose-400"}`}
          >
            {isProfit ? "+" : ""}
            {formatNOK(portfolio.total_pnl)}
          </p>
        </div>

        <div className="bg-slate-800 rounded-xl p-4 border border-slate-700/40">
          <div className="flex items-center gap-2 text-slate-300 text-sm mb-1">
            <TrendingUp className="w-4 h-4 shrink-0" aria-hidden />
            <span>{t("winRate")}</span>
          </div>
          <p className="text-xl sm:text-2xl font-bold text-white">
            {(portfolio.win_rate ?? 0).toFixed(1)}%
          </p>
        </div>
      </div>

      {/* Portfolio Charts: Allocation + Equity Curve */}
      <PortfolioCharts
        portfolio={portfolio}
        trades={trades}
        activeStrategies={activeStrategies}
        formatNOK={formatNOK}
      />

      {/* Performance: Heatmap + Streaks + Stats */}
      <PerformanceSection
        trades={trades}
        startingCapital={portfolio.total_value}
        formatNOK={formatNOK}
      />
    </div>
  );
}
