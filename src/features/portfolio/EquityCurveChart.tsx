"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  ReferenceLine,
} from "recharts";
import { TrendingUp, TrendingDown, Info } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";

interface CumulativePnlPoint {
  t: string;
  label: string;
  cumulative: number;
}

interface EquityCurveChartProps {
  data?: CumulativePnlPoint[];
  loading?: boolean;
  /** FIKS 5: KONTO-header — overskriver kurvens siste PnL-verdi med reell kontobalanse */
  headerValue?: number;
  headerPct?: number;
  headerLabel?: string;
}

function Skeleton() {
  return (
    <div className="h-[280px] w-full bg-slate-900 rounded-2xl border border-slate-700 animate-pulse" />
  );
}

function EmptyState({ noDataText }: { noDataText: string }) {
  return (
    <div className="h-[280px] w-full bg-slate-900 rounded-2xl border border-slate-700 flex items-center justify-center">
      <p className="text-slate-400 dark:text-slate-500 text-sm">
        {noDataText}
      </p>
    </div>
  );
}

export function EquityCurveChart({ data, loading, headerValue, headerPct, headerLabel }: EquityCurveChartProps) {
  const locale = useLocale();
  const t = useTranslations("dashboard.equityCurve");
  const [showInfo, setShowInfo] = useState(false);

  if (loading) return <Skeleton />;
  if (!data || data.length < 2) return <EmptyState noDataText={t("noData")} />;

  const firstValue = data[0]?.cumulative ?? 0;
  const lastValue = data[data.length - 1]?.cumulative ?? 0;
  // FIKS 5: Bruk KONTO-header hvis tilgjengelig, ellers kurvens siste punkt
  const totalReturn = firstValue !== 0 ? ((lastValue - firstValue) / Math.abs(firstValue)) * 100 : 0;
  const displayValue = headerValue ?? lastValue;
  const displayPct = headerPct ?? totalReturn;
  const maxPnl = Math.max(...data.map((d) => d.cumulative));
  const minPnl = Math.min(...data.map((d) => d.cumulative));

  const formatCurrency = (value: number) =>
    new Intl.NumberFormat(locale === "no" ? "nb-NO" : "en-US", {
      style: "currency",
      currency: "NOK",
      maximumFractionDigits: 0,
    }).format(value);

  const CustomTooltip = ({
    active,
    payload,
  }: {
    active?: boolean;
    payload?: Array<{ payload: CumulativePnlPoint; value: number }>;
  }) => {
    if (active && payload && payload.length) {
      const point = payload[0].payload;
      return (
        <div className="bg-slate-900 border border-slate-700 rounded-lg p-3 shadow-xl">
          <p className="text-slate-400 dark:text-slate-500 dark:text-slate-400 text-xs mb-1">{point.label}</p>
          <p
            className={`font-bold text-lg ${
              point.cumulative >= 0 ? "text-emerald-400" : "text-red-400"
            }`}
          >
            {formatCurrency(point.cumulative)}
          </p>
        </div>
      );
    }
    return null;
  };

  return (
    <motion.div
      className="bg-white dark:bg-slate-900 rounded-2xl p-5 border border-gray-200 dark:border-slate-700 shadow-sm"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
    >
      <div className="flex items-center justify-between mb-4">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-semibold text-slate-900 dark:text-white">
              {t("title")}
            </h3>
            <button
              onClick={() => setShowInfo(!showInfo)}
              className="text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:text-slate-300 transition-colors"
              aria-label={t("ariaLabel")}
            >
              <Info className="w-3.5 h-3.5" />
            </button>
          </div>
          <div className="flex items-center gap-2 mt-1">
            <span className="text-2xl font-bold text-slate-900 dark:text-white">
              {formatCurrency(displayValue)}
            </span>
            <span
              className={`flex items-center gap-0.5 text-xs font-medium px-2 py-0.5 rounded-full ${
                displayPct >= 0
                  ? "bg-emerald-500/20 text-emerald-400"
                  : "bg-red-500/20 text-red-400"
              }`}
            >
              {displayPct >= 0 ? (
                <TrendingUp className="w-3 h-3" />
              ) : (
                <TrendingDown className="w-3 h-3" />
              )}
              {displayPct >= 0 ? "+" : ""}
              {displayPct.toFixed(1)}%
            </span>
          </div>
        </div>
        <div className="text-right">
          <p className="text-xs text-slate-400 dark:text-slate-500">
            {t("max")}:{" "}
            <span className="text-emerald-400">{formatCurrency(maxPnl)}</span>
          </p>
          <p className="text-xs text-slate-400 dark:text-slate-500">
            {t("min")}:{" "}
            <span className="text-red-400">{formatCurrency(minPnl)}</span>
          </p>
        </div>
      </div>

      {showInfo && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: "auto" }}
          className="mb-3 p-3 bg-blue-500/10 border border-blue-500/20 rounded-lg text-xs text-blue-200"
        >
          {t("infoTooltip")}
        </motion.div>
      )}

      <div className="h-[200px]">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id="equityGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#10b981" stopOpacity={0.25} />
                <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
            <XAxis
              dataKey="label"
              axisLine={false}
              tickLine={false}
              tick={{ fill: "#64748b", fontSize: 10 }}
              minTickGap={40}
              interval="preserveStartEnd"
            />
            <YAxis
              hide
              domain={["auto", "auto"]}
            />
            <Tooltip content={<CustomTooltip />} />
            <ReferenceLine y={0} stroke="#475569" strokeDasharray="4 4" />
            <Area
              type="monotone"
              dataKey="cumulative"
              stroke="#10b981"
              strokeWidth={2}
              fillOpacity={1}
              fill="url(#equityGradient)"
              animationDuration={1200}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </motion.div>
  );
}

export default EquityCurveChart;
