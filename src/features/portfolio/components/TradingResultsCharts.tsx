"use client";

import { ChartWrapper } from "@/shared/ui/chart-wrapper";
import { PremiumPanel } from "@/features/trading/PremiumTradingLayout";
import { RADIUS, SHADOW } from "@/lib/design/tokens";
import { ArrowDownRight, Info } from "lucide-react";
import { useTranslations } from "next-intl";
import type { ComponentProps } from "react";
import { motion } from "framer-motion";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  Tooltip,
  XAxis,
  YAxis,
  ResponsiveContainer,
} from "recharts";
import type { AnalyticsPayload } from "../TradingResultsDashboard";

const tooltipStyle = {
  backgroundColor: "#0f172a",
  border: "1px solid #334155",
  borderRadius: 12,
  padding: "8px 12px",
  boxShadow: "0 10px 15px -3px rgba(0, 0, 0, 0.3)",
};

interface TradingResultsChartsProps {
  data: AnalyticsPayload;
  cumChart: { label: string; cumulative: number }[];
  dailyTail: { day: string; pnl: number }[];
  pairsChartDesc: { pair: string; pnl: number }[];
  formatDisplay: (v: number) => string;
}

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.15,
    },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.6, ease: [0.21, 0.47, 0.32, 0.98] as const },
  },
};

export function TradingResultsCharts({
  data,
  cumChart,
  dailyTail,
  pairsChartDesc,
  formatDisplay,
}: TradingResultsChartsProps) {
  const t = useTranslations("tradingResults");

  const outcomeLabel = (key: AnalyticsPayload["winLossSlices"][number]["key"]) => {
    switch (key) {
      case "win":
        return t("outcome.win");
      case "loss":
        return t("outcome.loss");
      case "breakeven":
        return t("outcome.breakeven");
      default:
        return t("outcome.unknown");
    }
  };

  const modeLabel = (raw: string) => {
    const m = raw.toLowerCase();
    if (m === "paper") return t("mode.paper");
    if (m === "live") return t("mode.live");
    return t("mode.unknown");
  };

  return (
    <motion.div 
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="space-y-6"
    >
      <div className="grid min-w-0 gap-6 lg:grid-cols-3">
        <motion.div variants={itemVariants} className="lg:col-span-2">
          <PremiumPanel className="h-full border-slate-200/80 dark:border-slate-800/80 dark:bg-slate-900/60 backdrop-blur-sm">
            <div className="flex items-center justify-between mb-1">
              <h2 className="text-lg font-semibold text-white">
                {t("charts.cumulativeTitle")}
              </h2>
              <span title={t("charts.cumulativeHint")}>
                <Info className="h-4 w-4 text-slate-500 cursor-help" />
              </span>
            </div>
            <p className="text-xs text-slate-500">
              {t("charts.cumulativeHint")}
            </p>
            <div className="mt-4 flex h-[240px] sm:h-[320px] items-center justify-center">
              {cumChart.length < 2 ? (
                <p className="text-center text-sm text-slate-500 italic">
                  {t("empty.needTrades")}
                </p>
              ) : (
                <ChartWrapper height={320} minHeight={280}>
                  <AreaChart data={cumChart}>
                    <defs>
                      <linearGradient id="cumPnl" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="#3B82F6" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                    <XAxis
                      dataKey="label"
                      tick={{ fill: "#64748b", fontSize: 10 }}
                      interval="preserveStartEnd"
                      tickFormatter={(v) => String(v).slice(5, 16)}
                      axisLine={false}
                      tickLine={false}
                    />
                    <YAxis
                      tick={{ fill: "#64748b", fontSize: 10 }}
                      tickFormatter={(v) => formatDisplay(Number(v))}
                      axisLine={false}
                      tickLine={false}
                    />
                    <Tooltip
                      contentStyle={tooltipStyle}
                      labelStyle={{ color: "#94a3b8", fontWeight: 600, marginBottom: 4 }}
                      formatter={
                        ((v: unknown) => [
                          <span key="v" className="font-mono text-blue-400 font-bold">{formatDisplay(Number(v))}</span>,
                          t("charts.cumulativeSeries"),
                        ]) as unknown as NonNullable<
                          ComponentProps<typeof Tooltip>["formatter"]
                        >
                      }
                    />
                    <Area
                      type="monotone"
                      dataKey="cumulative"
                      stroke="#3B82F6"
                      strokeWidth={3}
                      fill="url(#cumPnl)"
                      animationDuration={1500}
                    />
                  </AreaChart>
                </ChartWrapper>
              )}
            </div>
          </PremiumPanel>
        </motion.div>

        <motion.div variants={itemVariants}>
          <PremiumPanel className="h-full border-slate-200/80 dark:border-slate-800/80 dark:bg-slate-900/60 backdrop-blur-sm">
            <h2 className="text-lg font-semibold text-white">
              {t("charts.outcomeTitle")}
            </h2>
            <p className="mt-1 text-xs text-slate-500">
              {t("charts.outcomeHint")}
            </p>
            <div className="mt-4 flex h-[240px] sm:h-[280px] w-full min-w-0 items-center justify-center">
              {data.winLossSlices.length === 0 ? (
                <p className="text-center text-sm text-slate-500 italic">
                  {t("empty.noOutcomes")}
                </p>
              ) : (
                <ChartWrapper height={280} minHeight={260}>
                  <PieChart>
                    <Pie
                      data={data.winLossSlices.map((s) => ({
                        ...s,
                        name: outcomeLabel(s.key),
                      }))}
                      dataKey="value"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      innerRadius={65}
                      outerRadius={90}
                      paddingAngle={4}
                      animationBegin={200}
                      animationDuration={1200}
                    >
                      {data.winLossSlices.map((s) => (
                        <Cell 
                          key={s.key} 
                          fill={s.fill} 
                          stroke="rgba(15, 23, 42, 0.5)"
                          strokeWidth={2}
                        />
                      ))}
                    </Pie>
                    <Tooltip contentStyle={tooltipStyle} />
                    <Legend 
                      verticalAlign="bottom" 
                      height={36}
                      wrapperStyle={{ fontSize: 11, fontWeight: 500, paddingTop: 20 }} 
                    />
                  </PieChart>
                </ChartWrapper>
              )}
            </div>
          </PremiumPanel>
        </motion.div>
      </div>

      <motion.div
        variants={itemVariants}
        className={`border border-slate-800/80 bg-slate-900/60 p-6 ${RADIUS.card} ${SHADOW.cardBrand} backdrop-blur-sm`}
      >
        <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
          <h2 className="text-lg font-semibold text-white">
            {t("charts.dailyTitle")}
          </h2>
          {data.worstDay ? (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-rose-500/10 px-2.5 py-1 text-[12px] font-bold uppercase tracking-wider text-rose-400 border border-rose-500/20">
              <ArrowDownRight className="h-3 w-3" />
              {t("charts.worstDayBadge", {
                day: data.worstDay.day,
                amount: formatDisplay(data.worstDay.pnl),
              })}
            </span>
          ) : null}
        </div>
        <p className="mt-1 text-xs text-slate-500">
          {t("charts.dailyHint")}
        </p>
        <div className="mt-6 flex h-[240px] sm:h-[300px] items-center justify-center">
          {dailyTail.length === 0 ? (
            <p className="text-center text-sm text-slate-500 italic">
              {t("empty.needDaily")}
            </p>
          ) : (
            <ChartWrapper height={300} minHeight={260}>
              <BarChart data={dailyTail}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                <XAxis
                  dataKey="day"
                  tick={{ fill: "#64748b", fontSize: 10 }}
                  angle={-24}
                  textAnchor="end"
                  height={56}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  tick={{ fill: "#64748b", fontSize: 10 }}
                  tickFormatter={(v) => formatDisplay(Number(v))}
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip
                  contentStyle={tooltipStyle}
                  formatter={
                    ((v: unknown) => [
                      <span key="v" className={Number(v) >= 0 ? "text-emerald-400 font-bold font-mono" : "text-rose-400 font-bold font-mono"}>
                        {formatDisplay(Number(v))}
                      </span>,
                      t("charts.dailySeries"),
                    ]) as unknown as NonNullable<
                      ComponentProps<typeof Tooltip>["formatter"]
                    >
                  }
                />
                <Bar dataKey="pnl" radius={[4, 4, 0, 0]} maxBarSize={32} animationDuration={1500}>
                  {dailyTail.map((e) => (
                    <Cell
                      key={e.day}
                      fill={e.pnl >= 0 ? "#10b981" : "#f43f5e"}
                      fillOpacity={0.8}
                      className="transition-opacity hover:opacity-100"
                    />
                  ))}
                </Bar>
              </BarChart>
            </ChartWrapper>
          )}
        </div>
      </motion.div>

      <div className="grid gap-6 lg:grid-cols-2">
        <motion.div
          variants={itemVariants}
          className={`border border-slate-800/80 bg-slate-900/60 p-6 ${RADIUS.card} ${SHADOW.card} backdrop-blur-sm`}
        >
          <h2 className="text-lg font-semibold text-white">
            {t("charts.pairsTitle")}
          </h2>
          <p className="mt-1 text-xs text-slate-500">
            {t("charts.pairsHint")}
          </p>
          <div className="mt-4 flex h-[240px] sm:h-[320px] items-center justify-center">
            {data.topPairs.length === 0 ? (
              <p className="text-center text-sm text-slate-500 italic">
                {t("empty.needPairs")}
              </p>
            ) : (
              <ChartWrapper height={320} minHeight={280}>
                <BarChart
                  layout="vertical"
                  data={pairsChartDesc}
                  margin={{ left: 8, right: 24 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" horizontal={false} />
                  <XAxis
                    type="number"
                    tick={{ fill: "#64748b", fontSize: 10 }}
                    tickFormatter={(v) => formatDisplay(Number(v))}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis
                    type="category"
                    dataKey="pair"
                    width={88}
                    tick={{ fill: "#94a3b8", fontSize: 11, fontWeight: 600 }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <Tooltip
                    contentStyle={tooltipStyle}
                    formatter={
                      ((v: unknown) => [
                        <span key="v" className={Number(v) >= 0 ? "text-emerald-400 font-bold font-mono" : "text-rose-400 font-bold font-mono"}>
                          {formatDisplay(Number(v))}
                        </span>,
                        t("charts.pairPnl"),
                      ]) as unknown as NonNullable<
                        ComponentProps<typeof Tooltip>["formatter"]
                      >
                    }
                  />
                  <Bar dataKey="pnl" radius={[0, 4, 4, 0]} maxBarSize={20} animationDuration={1800}>
                    {pairsChartDesc.map((e) => (
                      <Cell
                        key={e.pair}
                        fill={e.pnl >= 0 ? "#10b981" : "#f43f5e"}
                        fillOpacity={0.8}
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ChartWrapper>
            )}
          </div>
        </motion.div>

        <motion.div
          variants={itemVariants}
          className={`border border-slate-800/80 bg-slate-900/60 p-6 ${RADIUS.card} ${SHADOW.card} backdrop-blur-sm`}
        >
          <h2 className="text-lg font-semibold text-white">
            {t("charts.modeTitle")}
          </h2>
          <p className="mt-1 text-xs text-slate-500">
            {t("charts.modeHint")}
          </p>
          <ul className="mt-6 space-y-3">
            {data.modeSplit.length === 0 ? (
              <li className="text-sm text-slate-500 italic">
                {t("empty.needModes")}
              </li>
            ) : (
              data.modeSplit.map((m, idx) => (
                <motion.li
                  key={m.mode}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.5 + idx * 0.1 }}
                  className="group rounded-xl border border-slate-800 bg-slate-950/40 px-4 py-3 hover:border-slate-700 hover:bg-slate-950/60 transition-all shadow-sm"
                >
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-semibold text-slate-300 group-hover:text-white transition-colors">
                      {modeLabel(m.mode)}
                    </span>
                    <span
                      className={`font-mono font-bold ${
                        m.pnl >= 0 ? "text-emerald-400" : "text-rose-400"
                      }`}
                    >
                      {formatDisplay(m.pnl)}
                    </span>
                  </div>
                  <div className="mt-2 flex items-center justify-between">
                    <p className="text-[12px] uppercase font-bold tracking-wider text-slate-500">
                      {t("charts.modeTrades", { count: m.trades })}
                    </p>
                    <div className="h-1 w-24 rounded-full bg-slate-800 overflow-hidden">
                      <motion.div 
                        initial={{ width: 0 }}
                        animate={{ width: "100%" }}
                        transition={{ duration: 1, delay: 0.8 + idx * 0.1 }}
                        className={`h-full ${m.pnl >= 0 ? "bg-emerald-500/50" : "bg-rose-500/50"}`}
                      />
                    </div>
                  </div>
                </motion.li>
              ))
            )}
          </ul>
        </motion.div>
      </div>
    </motion.div>
  );
}

