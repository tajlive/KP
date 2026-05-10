"use client";

import React, { useState } from "react";
import { motion } from "framer-motion";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";
import { useLocale, useTranslations } from "next-intl";
import { Info, Wallet } from "lucide-react";
import { AnimatedNumber } from "@/components/ui/AnimatedNumber";

interface TopPair {
  pair: string;
  pnl: number;
  trades: number;
}

interface AssetAllocationChartProps {
  data?: TopPair[];
  loading?: boolean;
}

const COLORS = [
  "#3b82f6", // blue
  "#10b981", // emerald
  "#f59e0b", // amber
  "#ef4444", // red
  "#8b5cf6", // violet
  "#06b6d4", // cyan
  "#f97316", // orange
  "#ec4899", // pink
];

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

export function AssetAllocationChart({ data, loading }: AssetAllocationChartProps) {
  const locale = useLocale();
  const t = useTranslations("dashboard.assetAllocation");
  const [showInfo, setShowInfo] = useState(false);
  const [activeIndex, setActiveIndex] = useState<number | null>(null);

  if (loading) return <Skeleton />;
  if (!data || data.length === 0) return <EmptyState noDataText={t("noData")} />;

  const { chartData, totalValue } = React.useMemo(() => {
    const sorted = [...data].sort((a, b) => Math.abs(b.pnl) - Math.abs(a.pnl));
    const top = sorted.slice(0, 6);
    const rest = sorted.slice(6);

    const generatedData = [
      ...top.map((item) => ({
        name: item.pair,
        value: Math.abs(item.pnl),
        pnl: item.pnl,
        trades: item.trades,
      })),
      ...(rest.length > 0
        ? [
            {
              name: t("other"),
              value: rest.reduce((sum, r) => sum + Math.abs(r.pnl), 0),
              pnl: rest.reduce((sum, r) => sum + r.pnl, 0),
              trades: rest.reduce((sum, r) => sum + r.trades, 0),
            },
          ]
        : []),
    ];

    const val = generatedData.reduce((sum, d) => sum + d.value, 0);
    return { chartData: generatedData, totalValue: val };
  }, [data, t]);

  const CustomTooltip = ({
    active,
    payload,
  }: {
    active?: boolean;
    payload?: Array<{
      payload: { name: string; value: number; pnl: number; trades: number };
    }>;
  }) => {
    if (active && payload && payload.length) {
      const item = payload[0].payload;
      return (
        <div className="bg-slate-900 border border-slate-700 rounded-lg p-3 shadow-xl min-w-[140px]">
          <p className="text-slate-900 dark:text-white font-semibold text-sm">{item.name}</p>
          <p
            className={`text-sm font-medium ${
              item.pnl >= 0 ? "text-emerald-400" : "text-red-400"
            }`}
          >
            {item.pnl >= 0 ? "+" : ""}
            {item.pnl.toLocaleString()} NOK
          </p>
          <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">
            {item.trades} {t("trades")}
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
        <div className="flex items-center gap-2">
          <h3 className="text-sm font-semibold text-slate-900 dark:text-white">
            {t("title")}
          </h3>
          <button
            onClick={() => setShowInfo(!showInfo)}
            className="text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:text-slate-300 transition-colors"
          >
            <Info className="w-3.5 h-3.5" />
          </button>
        </div>
        <div className="flex items-center gap-1.5">
          <Wallet className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500" />
          <AnimatedNumber 
            value={totalValue} 
            formatFn={(val) => `${val.toLocaleString("no-NO", { maximumFractionDigits: 2 })} NOK`}
            className="text-sm font-bold text-slate-700 dark:text-slate-300"
          />
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

      <div className="flex flex-col sm:flex-row items-center gap-4">
        <div className="h-[180px] w-[180px] shrink-0">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={chartData}
                cx="50%"
                cy="50%"
                innerRadius={50}
                outerRadius={85}
                paddingAngle={2}
                dataKey="value"
                onMouseEnter={(_, index) => setActiveIndex(index)}
                onMouseLeave={() => setActiveIndex(null)}
                animationDuration={800}
              >
                {chartData.map((_, index) => (
                  <Cell
                    key={`cell-${index}`}
                    fill={COLORS[index % COLORS.length]}
                    opacity={activeIndex === null || activeIndex === index ? 1 : 0.4}
                    stroke="transparent"
                  />
                ))}
              </Pie>
              <Tooltip content={<CustomTooltip />} />
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* Legend list */}
        <div className="flex-1 w-full space-y-2">
          {chartData.map((item, index) => {
            const percentage =
              chartData.reduce((s, d) => s + d.value, 0) > 0
                ? (item.value / chartData.reduce((s, d) => s + d.value, 0)) * 100
                : 0;
            return (
              <div
                key={item.name}
                className="flex items-center justify-between text-sm"
                onMouseEnter={() => setActiveIndex(index)}
                onMouseLeave={() => setActiveIndex(null)}
              >
                <div className="flex items-center gap-2">
                  <div
                    className="w-2.5 h-2.5 rounded-full shrink-0"
                    style={{ backgroundColor: COLORS[index % COLORS.length] }}
                  />
                  <span className="text-slate-600 dark:text-slate-300 text-xs">{item.name}</span>
                </div>
                <div className="text-right flex items-center justify-end gap-2">
                  <span className="text-xs font-medium text-slate-700 dark:text-slate-300">
                    {item.value.toLocaleString()} NOK
                  </span>
                  <span className="text-xs text-slate-500 font-medium bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded">
                    {percentage.toFixed(0)}%
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </motion.div>
  );
}

export default AssetAllocationChart;
