"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { useTranslations } from "next-intl";
import {
  TrendingUp,
  TrendingDown,
  ShieldAlert,
  Activity,
  BarChart3,
  Zap,
  Info,
} from "lucide-react";

type RiskMetrics = {
  sortinoRatio: number;
  calmarRatio: number;
  var95: number;
  var99: number;
  expectedShortfall95: number;
  omegaRatio: number;
  maxConsecutiveLosses: number;
  avgTimeToRecovery: number;
  gainPainRatio: number;
};

export function RiskMetricsPanel() {
  const t = useTranslations("trading.riskMetrics");
  const [metrics, setMetrics] = useState<RiskMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/user/trading-analytics")
      .then((r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json();
      })
      .then((data) => {
        if (data.ok && data.riskMetrics) {
          setMetrics(data.riskMetrics);
        } else {
          setError(t("loadError"));
        }
      })
      .catch((e) => {
        console.error("[RiskMetricsPanel] Failed to load:", e);
        setError(t("loadError"));
      })
      .finally(() => setLoading(false));
  }, [t]);

  if (loading) return null;
  if (error) {
    return (
      <div className="rounded-xl border border-red-500/30 bg-red-950/40 px-4 py-3 text-sm text-red-200">
        {error}
      </div>
    );
  }
  if (!metrics) return null;

  const cards = [
    {
      key: "sortino",
      label: t("sortinoRatio"),
      value: metrics.sortinoRatio.toFixed(2),
      good: metrics.sortinoRatio >= 1,
      tooltip: t("sortinoTooltip"),
    },
    {
      key: "calmar",
      label: t("calmarRatio"),
      value: metrics.calmarRatio.toFixed(2),
      good: metrics.calmarRatio >= 1,
      tooltip: t("calmarTooltip"),
    },
    {
      key: "var95",
      label: t("var95"),
      value: `${(metrics.var95 * 100).toFixed(2)}%`,
      good: metrics.var95 > -0.05,
      tooltip: t("var95Tooltip"),
    },
    {
      key: "maxLosses",
      label: t("maxConsecutiveLosses"),
      value: metrics.maxConsecutiveLosses.toString(),
      good: metrics.maxConsecutiveLosses <= 3,
      tooltip: t("maxConsecutiveLossesTooltip"),
    },
    {
      key: "omega",
      label: t("omegaRatio"),
      value: metrics.omegaRatio.toFixed(2),
      good: metrics.omegaRatio >= 1,
      tooltip: t("omegaTooltip"),
    },
    {
      key: "gainPain",
      label: t("gainPainRatio"),
      value: metrics.gainPainRatio.toFixed(2),
      good: metrics.gainPainRatio >= 1,
      tooltip: t("gainPainTooltip"),
    },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="space-y-4"
    >
      <div className="flex items-center gap-2">
        <h2 className="text-lg font-semibold text-white">{t("title")}</h2>
        <div className="group relative">
          <Info className="w-4 h-4 text-slate-500 cursor-help" />
          <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-64 p-2 bg-slate-800 text-slate-300 text-xs rounded-lg border border-slate-700 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10">
            {t("panelTooltip")}
          </div>
        </div>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {cards.map((card, i) => (
          <motion.div
            key={card.key}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05 }}
            className="relative group bg-slate-800/50 rounded-xl p-4 border border-slate-700/50 hover:border-slate-600 transition-colors"
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-slate-400 text-sm">{card.label}</span>
              {card.good ? (
                <TrendingUp className="w-4 h-4 text-emerald-400" />
              ) : (
                <TrendingDown className="w-4 h-4 text-red-400" />
              )}
            </div>
            <p
              className={`text-2xl font-bold ${
                card.good ? "text-emerald-400" : "text-red-400"
              }`}
            >
              {card.value}
            </p>
            <div className="absolute bottom-full left-0 mb-2 w-full p-2 bg-slate-800 text-slate-300 text-xs rounded-lg border border-slate-700 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10">
              {card.tooltip}
            </div>
          </motion.div>
        ))}
      </div>
    </motion.div>
  );
}
