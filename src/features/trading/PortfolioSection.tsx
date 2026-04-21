"use client";

import { BarChart3, DollarSign, TrendingUp, Wallet } from "lucide-react";
import { useTranslations } from "next-intl";

interface Portfolio {
  total_value: number;
  cash_balance: number;
  total_pnl: number;
  win_rate: number;
}

interface PortfolioSectionProps {
  portfolio: Portfolio | null;
  formatNOK: (v: number) => string;
}

export function PortfolioSection({
  portfolio,
  formatNOK,
}: PortfolioSectionProps) {
  const t = useTranslations("dashboard");

  if (!portfolio) {
    return (
      <div className="bg-slate-800 rounded-xl p-6 text-center">
        <p className="text-slate-400">
          {t("welcomeStart")}
        </p>
      </div>
    );
  }

  const isProfit = portfolio.total_pnl >= 0;

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4" data-testid="portfolio-section">
      <div className="bg-slate-800 rounded-xl p-4" data-testid="portfolio-total-value">
        <div className="flex items-center gap-2 text-slate-400 text-sm mb-1">
          <Wallet className="w-4 h-4" />
          <span>{t("totalValue")}</span>
        </div>
        <p className="text-2xl font-bold text-white">
          {formatNOK(portfolio.total_value)}
        </p>
      </div>

      <div className="bg-slate-800 rounded-xl p-4" data-testid="portfolio-cash">
        <div className="flex items-center gap-2 text-slate-400 text-sm mb-1">
          <DollarSign className="w-4 h-4" />
          <span>{t("cash")}</span>
        </div>
        <p className="text-2xl font-bold text-white">
          {formatNOK(portfolio.cash_balance)}
        </p>
      </div>

      <div className="bg-slate-800 rounded-xl p-4" data-testid="portfolio-pnl">
        <div className="flex items-center gap-2 text-slate-400 text-sm mb-1">
          <BarChart3 className="w-4 h-4" />
          <span>{t("pnl")}</span>
        </div>
        <p
          className={`text-2xl font-bold ${isProfit ? "text-green-400" : "text-red-400"}`}
        >
          {isProfit ? "+" : ""}
          {formatNOK(portfolio.total_pnl)}
        </p>
      </div>

      <div className="bg-slate-800 rounded-xl p-4" data-testid="portfolio-winrate">
        <div className="flex items-center gap-2 text-slate-400 text-sm mb-1">
          <TrendingUp className="w-4 h-4" />
          <span>{t("winRate")}</span>
        </div>
        <p className="text-2xl font-bold text-white">
          {(portfolio.win_rate ?? 0).toFixed(1)}%
        </p>
      </div>
    </div>
  );
}
