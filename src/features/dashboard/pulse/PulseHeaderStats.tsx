"use client";

import { PulseMode } from "@/types/pulse";
import { Activity, TrendingDown, TrendingUp } from "lucide-react";
import { useTranslations } from "next-intl";

interface PulseHeaderStatsProps {
  portfolioValue: number;
  dailyChangeNok: number;
  dailyChangePct: number;
  mode: PulseMode;
  isConnected: boolean;
}

export function PulseHeaderStats({
  portfolioValue,
  dailyChangeNok,
  dailyChangePct,
  mode,
  isConnected,
}: PulseHeaderStatsProps) {
  const t = useTranslations("dashboard.pulse");
  const isProfit = dailyChangeNok >= 0;

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("nb-NO", {
      style: "currency",
      currency: "NOK",
      maximumFractionDigits: 0,
    }).format(value);
  };

  const displayValue = portfolioValue;

  return (
    <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 p-6 border-b border-white/5 bg-slate-900/40 backdrop-blur-sm">
      <div className="flex items-center gap-4">
        <div className="relative">
          <div className="w-12 h-12 bg-blue-500/10 rounded-2xl flex items-center justify-center border border-blue-500/20">
            <Activity className="w-6 h-6 text-blue-400" />
          </div>
          {isConnected && (
            <div className="absolute -top-1 -right-1 w-3 h-3 bg-green-500 rounded-full border-2 border-slate-900 animate-pulse" />
          )}
        </div>
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold text-white tracking-tight">
              {t("title")}
            </h1>
            <span
              className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                mode === "live"
                  ? "bg-red-500/10 text-red-400 border border-red-500/20"
                  : "bg-blue-500/10 text-blue-400 border border-blue-500/20"
              }`}
            >
              {mode === "live" ? t("liveMode") : t("paperMode")}
            </span>
          </div>
          <p className="text-slate-400 text-sm">
            {isConnected ? t("systemOnline") : t("connecting")}
          </p>
        </div>
      </div>

      <div className="flex items-center gap-8">
        <div className="text-right">
          <p className="text-slate-500 text-xs font-medium uppercase tracking-widest mb-1">
            {t("totalValue")}
          </p>
          <p className="text-2xl md:text-3xl font-bold text-white tabular-nums">
            {formatCurrency(displayValue)}
          </p>
        </div>

        <div className="text-right">
          <p className="text-slate-500 text-xs font-medium uppercase tracking-widest mb-1">
            {t("dailyChange")}
          </p>
          <div
            className={`flex items-center justify-end gap-1.5 font-bold tabular-nums ${isProfit ? "text-green-400" : "text-red-400"}`}
          >
            {isProfit ? (
              <TrendingUp className="w-4 h-4" />
            ) : (
              <TrendingDown className="w-4 h-4" />
            )}
            <span className="text-lg">
              {isProfit ? "+" : ""}
              {formatCurrency(dailyChangeNok)}
              <span className="text-sm ml-1 opacity-80">
                ({dailyChangePct.toFixed(2)}%)
              </span>
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
