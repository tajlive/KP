"use client";

import { useEffect, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Sparkles, Shield, TrendingUp, Target, RefreshCw, AlertTriangle, ChevronDown } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";

type InsightType = "risk_assessment" | "performance_summary" | "strategy_tip";

interface TradeMetrics {
  totalTrades: number;
  winRate: number;
  totalPnl: number;
  avgTradePnl: number;
  maxDrawdownPct: number;
  currentStreak: number;
  volatilityEstimate: number;
  bestDayPnl: number;
  worstDayPnl: number;
}

interface InsightData {
  insight: string;
  confidence: "high" | "medium" | "low";
  metrics: TradeMetrics;
  cached: boolean;
  generatedAt: string;
}

const TABS: { key: InsightType; labelKey: string; icon: typeof Shield }[] = [
  { key: "performance_summary", labelKey: "tabs.performance", icon: TrendingUp },
  { key: "risk_assessment", labelKey: "tabs.risk", icon: Shield },
  { key: "strategy_tip", labelKey: "tabs.strategy", icon: Target },
];

export function AIInsightCard() {
  const locale = useLocale();
  const t = useTranslations("dashboard.aiInsight");

  const [activeTab, setActiveTab] = useState<InsightType>("performance_summary");
  const [data, setData] = useState<Partial<Record<InsightType, InsightData>>>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [expanded, setExpanded] = useState(false);

  const fetchInsight = useCallback(
    async (type: InsightType) => {
      if (data[type]) return; // already cached in UI

      setLoading(true);
      setError(null);

      try {
        const res = await fetch("/api/ai/insight", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ type }),
        });

        if (!res.ok) {
          const errBody = await res.json().catch(() => ({}));
          throw new Error(errBody.error || `HTTP ${res.status}`);
        }

        const insight: InsightData = await res.json();
        setData((prev) => ({ ...prev, [type]: insight }));
      } catch (err) {
        setError(err instanceof Error ? err.message : "Unknown error");
      } finally {
        setLoading(false);
      }
    },
    [data]
  );

  // Fetch first tab when expanded
  useEffect(() => {
    if (expanded) {
      fetchInsight(activeTab);
    }
  }, [expanded, activeTab, fetchInsight]);

  // Fetch when tab changes
  useEffect(() => {
    if (expanded) {
      fetchInsight(activeTab);
    }
  }, [activeTab, expanded, fetchInsight]);

  const current = data[activeTab];

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: 0.2 }}
      className="rounded-2xl border border-purple-500/20 bg-gradient-to-br from-purple-500/5 via-transparent to-blue-500/5 backdrop-blur-sm overflow-hidden"
    >
      {/* Header */}
      <button
        onClick={() => setExpanded((e) => !e)}
        className="w-full flex items-center justify-between p-5 text-left hover:bg-purple-500/5 transition-colors"
        aria-expanded={expanded}
      >
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-purple-500/10 border border-purple-500/20">
            <Sparkles className="w-5 h-5 text-purple-400" />
          </div>
          <div>
            <h3 className="font-bold text-gray-900 dark:text-white text-base">
              {t("title")}
            </h3>
            <p className="text-xs text-gray-500 dark:text-slate-400">
              {t("subtitle")}
            </p>
          </div>
        </div>
        <ChevronDown
          className={`w-5 h-5 text-gray-500 dark:text-slate-400 transition-transform ${expanded ? "rotate-180" : ""}`}
        />
      </button>

      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="overflow-hidden"
          >
            {/* Tabs */}
            <div className="flex gap-1 px-5 pb-3 overflow-x-auto">
              {TABS.map((tab) => {
                const Icon = tab.icon;
                const isActive = activeTab === tab.key;
                return (
                  <button
                    key={tab.key}
                    onClick={() => setActiveTab(tab.key)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-all whitespace-nowrap ${
                      isActive
                        ? "bg-purple-500/20 text-purple-600 dark:text-purple-300 border border-purple-500/30"
                        : "text-gray-500 dark:text-slate-400 hover:text-gray-700 dark:hover:text-slate-300 hover:bg-gray-100 dark:hover:bg-slate-800/50"
                    }`}
                  >
                    <Icon className="w-3.5 h-3.5" />
                    {t(tab.labelKey)}
                  </button>
                );
              })}
            </div>

            {/* Content */}
            <div className="px-5 pb-5">
              {loading && !current ? (
                <div className="space-y-3 animate-pulse">
                  <div className="h-4 bg-gray-300 dark:bg-slate-700 rounded w-3/4" />
                  <div className="h-4 bg-gray-300 dark:bg-slate-700 rounded w-full" />
                  <div className="h-4 bg-gray-300 dark:bg-slate-700 rounded w-5/6" />
                </div>
              ) : error ? (
                <div className="flex items-center gap-3 p-4 rounded-xl bg-red-500/10 border border-red-500/20">
                  <AlertTriangle className="w-5 h-5 text-red-400 shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-red-300">
                      {t("error")}
                    </p>
                  </div>
                  <button
                    onClick={() => fetchInsight(activeTab)}
                    className="p-2 rounded-lg bg-red-500/10 hover:bg-red-500/20 transition-colors"
                    aria-label={t("retry")}
                  >
                    <RefreshCw className="w-4 h-4 text-red-400" />
                  </button>
                </div>
              ) : current ? (
                <div className="space-y-4">
                  {/* Insight text */}
                  <div className="p-4 rounded-xl bg-gray-100 dark:bg-slate-800/50 border border-gray-200 dark:border-slate-700/50">
                    <p className="text-sm text-gray-800 dark:text-slate-200 leading-relaxed">{current.insight}</p>
                    <div className="flex items-center gap-2 mt-3">
                      <span
                        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${
                          current.confidence === "high"
                            ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                            : current.confidence === "medium"
                            ? "bg-amber-500/10 text-amber-400 border border-amber-500/20"
                            : "bg-gray-300/10 text-gray-500 dark:text-slate-400 border border-gray-300/20 dark:border-slate-500/20"
                        }`}
                      >
                        {t(`confidence.${current.confidence}`)}
                      </span>
                      {current.cached && (
                        <span className="text-xs text-gray-400 dark:text-slate-500">
                          {t("cached")}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Metrics mini-grid */}
                  <div className="grid grid-cols-3 gap-2">
                    <MetricBox
                      label={t("metrics.winRate")}
                      value={`${current.metrics.winRate}%`}
                      trend={current.metrics.winRate >= 55 ? "up" : "down"}
                    />
                    <MetricBox
                      label={t("metrics.drawdown")}
                      value={`${current.metrics.maxDrawdownPct}%`}
                      trend={current.metrics.maxDrawdownPct > 20 ? "down" : "neutral"}
                    />
                    <MetricBox
                      label={t("metrics.streak")}
                      value={
                        current.metrics.currentStreak > 0
                          ? `+${current.metrics.currentStreak}`
                          : `${current.metrics.currentStreak}`
                      }
                      trend={current.metrics.currentStreak > 0 ? "up" : current.metrics.currentStreak < 0 ? "down" : "neutral"}
                    />
                  </div>

                  <p className="text-xs text-gray-400 dark:text-slate-500 text-center">
                    {t("disclaimer")}
                  </p>
                </div>
              ) : null}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

function MetricBox({
  label,
  value,
  trend,
}: {
  label: string;
  value: string;
  trend: "up" | "down" | "neutral";
}) {
  const trendColor =
    trend === "up"
      ? "text-emerald-400"
      : trend === "down"
      ? "text-red-400"
      : "text-slate-400";

  return (
    <div className="p-3 rounded-xl bg-gray-100 dark:bg-slate-800/30 border border-gray-200 dark:border-slate-700/30 text-center">
      <p className="text-xs text-gray-500 dark:text-slate-500 mb-1">{label}</p>
      <p className={`text-lg font-bold ${trendColor}`}>{value}</p>
    </div>
  );
}
