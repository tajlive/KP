"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { useLocale } from "next-intl";
import { ChevronDown, BarChart3 } from "lucide-react";
import { EquityCurveChart } from "./EquityCurveChart";
import { WinLossHeatmap } from "./WinLossHeatmap";
import { AssetAllocationChart } from "./AssetAllocationChart";
import { PositionSizingCalculator } from "./PositionSizingCalculator";
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

interface AdvancedAnalyticsSectionProps {
  accountBalance?: number;
}

export function AdvancedAnalyticsSection({ accountBalance = 100000 }: AdvancedAnalyticsSectionProps) {
  const locale = useLocale();
  const isNo = locale === "no";
  const [isExpanded, setIsExpanded] = useState(false);
  const [analytics, setAnalytics] = useState<TradingAnalytics | null>(null);
  const [loading, setLoading] = useState(false);
  const [hasFetched, setHasFetched] = useState(false);

  useEffect(() => {
    if (!isExpanded || hasFetched) return;

    setLoading(true);
    fetch("/api/user/trading-analytics")
      .then((r) => r.json())
      .then((data) => {
        if (data.ok) {
          setAnalytics(data as TradingAnalytics);
        }
      })
      .finally(() => {
        setLoading(false);
        setHasFetched(true);
      });
  }, [isExpanded, hasFetched]);

  return (
    <div className="mt-6">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full py-4 flex items-center justify-center gap-2 bg-slate-800/50 hover:bg-slate-800 rounded-xl border border-slate-700/50 text-slate-300 hover:text-white transition-all duration-200"
      >
        <BarChart3 className="w-4 h-4" />
        <span className="font-medium text-sm">
          {isNo ? "Avansert analyse" : "Advanced Analytics"}
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
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: "auto", opacity: 1 }}
          exit={{ height: 0, opacity: 0 }}
          transition={{ duration: 0.3 }}
          className="overflow-hidden"
        >
          <div className="pt-6 space-y-6">
            {/* Enterprise analytics grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <EquityCurveChart
                data={analytics?.cumulativePnl}
                loading={loading}
              />
              <WinLossHeatmap
                data={analytics?.dailyPnl}
                loading={loading}
              />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <AssetAllocationChart
                data={analytics?.topPairs}
                loading={loading}
              />
              <PositionSizingCalculator accountBalance={accountBalance} />
            </div>

            {/* Risk metrics with explanations */}
            {analytics?.riskMetrics && (
              <div className="bg-slate-900 rounded-2xl p-5 border border-slate-700">
                <h3 className="text-sm font-semibold text-white mb-4">
                  {isNo ? "Risk Metrics" : "Risk Metrics"}
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
                      label: isNo ? "Max tap streak" : "Max loss streak",
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
                      className="bg-slate-800/50 rounded-lg p-3 border border-slate-700/50"
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs text-slate-400">{metric.label}</span>
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
