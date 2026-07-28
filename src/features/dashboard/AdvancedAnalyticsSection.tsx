"use client";

import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { useLocale, useTranslations } from "next-intl";
import { ChevronDown, BarChart3 } from "lucide-react";
import { EquityCurveChart } from "@/features/portfolio/EquityCurveChart";
import { WinLossHeatmap } from "@/features/portfolio/WinLossHeatmap";
import { AssetAllocationChart } from "@/features/portfolio/AssetAllocationChart";
import { PositionSizingCalculator } from "@/features/trading";
import { ExplainStatButton } from "./ExplainStatButton";

interface TradingAnalytics {
  ok: true;
  cumulativePnl: Array<{ t: string; label: string; cumulative: number }>;
  dailyPnl: Array<{ day: string; pnl: number }>;
  topPairs: Array<{ pair: string; pnl: number; trades: number }>;
  riskMetrics: {
    sortinoRatio: number;
    calmarRatio: number;
    var95: number;
    maxConsecutiveLosses: number;
    omegaRatio: number;
    gainPainRatio: number;
  };
}

interface PortfolioSummary {
  balance: number | null;
  initialBalance?: number | null;
  positions: Array<{
    symbol: string;
    qty: number;
    avgBuyPrice: number;
  }>;
}

interface AdvancedAnalyticsSectionProps {
  accountBalance?: number;
  defaultExpanded?: boolean;
}

export function AdvancedAnalyticsSection({ accountBalance = 100000, defaultExpanded = false }: AdvancedAnalyticsSectionProps) {
  const locale = useLocale();
  const t = useTranslations("dashboard.advancedAnalytics");
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);
  const [analytics, setAnalytics] = useState<TradingAnalytics | null>(null);
  const [summary, setSummary] = useState<PortfolioSummary | null>(null);
  const [loading, setLoading] = useState(false);
  const [hasFetched, setHasFetched] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);

  useEffect(() => {
    if (!isExpanded || hasFetched) return;

    setLoading(true);
    setFetchError(null);
    // Analyse + portefølje-sammendrag (reell saldo og posisjoner) i parallell.
    Promise.all([
      fetch("/api/user/trading-analytics").then((r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json();
      }),
      fetch("/api/portfolio/summary")
        .then((r) => (r.ok ? r.json() : null))
        .catch(() => null),
    ])
      .then(([analyticsData, summaryData]) => {
        if (analyticsData?.ok) {
          setAnalytics(analyticsData as TradingAnalytics);
        } else {
          setFetchError(t("loadError"));
        }
        if (summaryData?.balance != null) {
          setSummary(summaryData as PortfolioSummary);
        }
      })
      .catch(() => {
        setFetchError(t("loadErrorRetry"));
      })
      .finally(() => {
        setLoading(false);
        setHasFetched(true);
      });
  }, [isExpanded, hasFetched]);

  // Sann aktivaallokering: åpne posisjoner (kostpris) + kontanter.
  const allocationSlices = useMemo(() => {
    if (!summary) return undefined;
    const positionSlices = summary.positions.map((p) => ({
      name: p.symbol,
      value: p.qty * p.avgBuyPrice,
    }));
    const deployed = positionSlices.reduce((s, p) => s + p.value, 0);
    const cash = Math.max(0, (summary.balance ?? 0) - deployed);
    const slices = [...positionSlices];
    if (cash > 0) slices.push({ name: t("cash"), value: cash });
    return slices;
  }, [summary, t]);

  // Reell kontobalanse til kalkulatoren (fallback: prop/default).
  const effectiveBalance = summary?.balance ?? accountBalance;
  // FIKS C: Beregn konto-endringsprosent for EquityCurveChart-chip
  const effectiveInitial = summary?.initialBalance ?? accountBalance;
  const headerPct = effectiveBalance != null && effectiveInitial != null && effectiveInitial > 0
    ? ((effectiveBalance - effectiveInitial) / effectiveInitial) * 100
    : undefined;

  return (
    <div className="mt-6">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        aria-expanded={isExpanded}
        aria-controls="advanced-analytics-panel"
        className="w-full py-4 flex items-center justify-center gap-2 bg-gray-100 dark:bg-slate-800/50 hover:bg-gray-200 dark:hover:bg-slate-700 rounded-xl border border-gray-200 dark:border-slate-700/50 text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white transition-all duration-200"
      >
        <BarChart3 className="w-4 h-4" />
        <span className="font-medium text-sm">
          {t("title")}
        </span>
        <motion.div
          animate={{ rotate: isExpanded ? 180 : 0 }}
          transition={{ duration: 0.2 }}
        >
          <ChevronDown className="w-4 h-4" />
        </motion.div>
      </button>

      {isExpanded && (
        <motion.div
          id="advanced-analytics-panel"
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: "auto", opacity: 1 }}
          exit={{ height: 0, opacity: 0 }}
          transition={{ duration: 0.3 }}
          className="overflow-hidden"
        >
          {fetchError && (
            <div className="mb-4 p-4 bg-red-500/10 border border-red-500/30 rounded-xl text-center">
              <p className="text-red-300 text-sm">{fetchError}</p>
              <button
                onClick={() => {
                  setHasFetched(false);
                  setFetchError(null);
                }}
                className="mt-2 text-xs text-blue-400 hover:text-blue-300 underline"
              >
                {t("tryAgain")}
              </button>
            </div>
          )}
          <div className="pt-6 space-y-6">
            {/* Enterprise analytics grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <EquityCurveChart
                data={analytics?.cumulativePnl}
                loading={loading}
                headerValue={summary?.balance ?? undefined}
                headerPct={headerPct}
              />
              <WinLossHeatmap
                data={analytics?.dailyPnl}
                loading={loading}
              />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <AssetAllocationChart
                slices={allocationSlices}
                loading={loading}
              />
              <PositionSizingCalculator accountBalance={effectiveBalance} />
            </div>

            {/* Risk metrics with explanations */}
            {analytics?.riskMetrics && (
              <div className="bg-white dark:bg-slate-900 rounded-2xl p-5 border border-gray-200 dark:border-slate-700 shadow-sm">
                <h3 className="text-sm font-semibold text-slate-900 dark:text-white mb-4">
                  {t("riskMetricsTitle")}
                </h3>
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
                  {[
                    {
                      label: "Sortino",
                      value: analytics.riskMetrics.sortinoRatio.toFixed(2),
                      good: analytics.riskMetrics.sortinoRatio >= 1,
                      type: "sharpe" as const,
                    },
                    {
                      label: "Calmar",
                      value: analytics.riskMetrics.calmarRatio.toFixed(2),
                      good: analytics.riskMetrics.calmarRatio >= 1,
                      type: "sharpe" as const,
                    },
                    {
                      label: "VaR 95%",
                      value: `${(analytics.riskMetrics.var95 * 100).toFixed(2)}%`,
                      good: analytics.riskMetrics.var95 > -0.05,
                      type: "drawdown" as const,
                    },
                    {
                      label: t("maxLossStreakLabel"),
                      value: analytics.riskMetrics.maxConsecutiveLosses.toString(),
                      good: analytics.riskMetrics.maxConsecutiveLosses <= 3,
                      type: "drawdown" as const,
                    },
                    {
                      label: "Omega",
                      value: analytics.riskMetrics.omegaRatio.toFixed(2),
                      good: analytics.riskMetrics.omegaRatio >= 1,
                      type: "sharpe" as const,
                    },
                    {
                      label: "Gain/Pain",
                      value: analytics.riskMetrics.gainPainRatio.toFixed(2),
                      good: analytics.riskMetrics.gainPainRatio >= 1,
                      type: "pnl" as const,
                    },
                  ].map((metric) => (
                    <div
                      key={metric.label}
                      className="bg-gray-100 dark:bg-slate-800/50 rounded-lg p-3 border border-slate-700/50"
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs text-gray-500 dark:text-slate-400">{metric.label}</span>
                      </div>
                      <p
                        className={`text-lg font-bold ${
                          metric.good ? "text-emerald-400" : "text-red-400"
                        }`}
                      >
                        {metric.value}
                      </p>
                      <ExplainStatButton statType={metric.type} />
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </motion.div>
      )}
    </div>
  );
}

export default AdvancedAnalyticsSection;
