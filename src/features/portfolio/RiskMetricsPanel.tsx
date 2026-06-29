"use client";

import { useEffect, useMemo, useState } from "react";
import { m, AnimatePresence } from "framer-motion";
import { useTranslations } from "next-intl";
import {
  TrendingUp,
  TrendingDown,
  ShieldAlert,
  Activity,
  BarChart3,
  Zap,
  Info,
  ChevronDown,
} from "lucide-react";
import { cn } from "@/lib/utils";

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

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

/**
 * Composite risk score (0-100). Higher is better / lower risk.
 * Inverted metrics (VaR, drawdown, consecutive losses) reduce the score.
 */
function calculateRiskScore(metrics: RiskMetrics): number {
  // Reward/risk ratios: higher is better. Clamp to plausible ranges.
  const sortino = clamp(metrics.sortinoRatio, -2, 3);
  const calmar = clamp(metrics.calmarRatio, -2, 3);
  const omega = clamp(metrics.omegaRatio, 0, 3);
  const gainPain = clamp(metrics.gainPainRatio, 0, 3);

  // Risk metrics: lower is better. Convert to 0-100 contribution.
  const var95Abs = Math.abs(metrics.var95);
  const varScore = clamp(1 - var95Abs / 0.1, 0, 1) * 100; // 10% VaR -> 0
  const lossStreakScore = clamp(1 - metrics.maxConsecutiveLosses / 6, 0, 1) * 100;

  // Ratio contribution (weighted average, 0-100)
  const ratioScore =
    ((clamp(sortino, 0, 2) +
      clamp(calmar, 0, 2) +
      clamp(omega, 0, 2) +
      clamp(gainPain, 0, 2)) /
      8) *
    100;

  return Math.round(
    clamp(varScore * 0.35 + lossStreakScore * 0.25 + ratioScore * 0.4, 0, 100),
  );
}

export function RiskMetricsPanel() {
  const t = useTranslations("trading.riskMetrics");
  const [metrics, setMetrics] = useState<RiskMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showDetails, setShowDetails] = useState(false);

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

  const score = useMemo(
    () => (metrics ? calculateRiskScore(metrics) : null),
    [metrics],
  );

  if (loading) return null;
  if (error) {
    return (
      <div className="rounded-xl border border-red-500/30 bg-red-950/40 px-4 py-3 text-sm text-red-200">
        {error}
      </div>
    );
  }
  if (!metrics || score == null) return null;

  const riskLevel =
    score >= 80 ? "low" : score >= 50 ? "moderate" : "high";
  const riskColor =
    score >= 80 ? "emerald" : score >= 50 ? "amber" : "red";

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
    <m.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="space-y-4"
    >
      {/* Single risk score card */}
      <div className="relative overflow-hidden rounded-2xl border border-slate-700/50 bg-slate-800/50 p-5 sm:p-6">
        <div
          className={cn(
            "absolute top-0 left-0 w-1 h-full",
            riskColor === "emerald" && "bg-emerald-500",
            riskColor === "amber" && "bg-amber-500",
            riskColor === "red" && "bg-red-500",
          )}
        />
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-semibold text-white">
                {t("scoreTitle")}
              </h2>
              <div className="group relative">
                <Info className="w-4 h-4 text-slate-500 cursor-help" />
                <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-64 p-2 bg-slate-800 text-slate-300 text-xs rounded-lg border border-slate-700 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10">
                  {t("panelTooltip")}
                </div>
              </div>
            </div>
            <p className="text-sm text-slate-400 max-w-md">
              {t(`scoreDescription.${riskLevel}`)}
            </p>
          </div>

          <div className="flex items-center gap-4">
            <div className="text-right">
              <div
                className={cn(
                  "text-4xl font-bold tracking-tight",
                  riskColor === "emerald" && "text-emerald-400",
                  riskColor === "amber" && "text-amber-400",
                  riskColor === "red" && "text-red-400",
                )}
              >
                {score}
                <span className="text-lg text-slate-500 font-medium">/100</span>
              </div>
              <div className="text-sm font-medium text-slate-300">
                {t(`scoreLabel.${riskLevel}`)}
              </div>
            </div>
            {score >= 80 ? (
              <TrendingUp className="w-10 h-10 text-emerald-400" />
            ) : score >= 50 ? (
              <Activity className="w-10 h-10 text-amber-400" />
            ) : (
              <ShieldAlert className="w-10 h-10 text-red-400" />
            )}
          </div>
        </div>

        <button
          type="button"
          onClick={() => setShowDetails((prev) => !prev)}
          className="mt-5 flex items-center gap-1.5 text-sm text-slate-400 hover:text-slate-300 transition-colors"
          aria-expanded={showDetails}
        >
          <ChevronDown
            className={cn(
              "w-4 h-4 transition-transform duration-200",
              showDetails && "rotate-180",
            )}
          />
          {showDetails ? t("hideDetails") : t("showDetails")}
        </button>
      </div>

      {/* Detailed metrics */}
      <AnimatePresence initial={false}>
        {showDetails && (
          <m.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="overflow-hidden"
          >
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {cards.map((card, i) => (
                <m.div
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
                </m.div>
              ))}
            </div>
          </m.div>
        )}
      </AnimatePresence>
    </m.div>
  );
}
