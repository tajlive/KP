"use client";

import { ChartWrapper } from "@/shared/ui/chart-wrapper";
import { PremiumPanel } from "@/features/trading/PremiumTradingLayout";
import { RADIUS, SHADOW } from "@/lib/design/tokens";
import { ArrowDownRight } from "lucide-react";
import { useTranslations } from "next-intl";
import type { ComponentProps } from "react";
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
} from "recharts";
import type { AnalyticsPayload } from "../TradingResultsDashboard";

const tooltipStyle = {
  backgroundColor: "#0f172a",
  border: "1px solid #334155",
  borderRadius: 10,
};

interface TradingResultsChartsProps {
  data: AnalyticsPayload;
  cumChart: { label: string; cumulative: number }[];
  dailyTail: { day: string; pnl: number }[];
  pairsChartDesc: { pair: string; pnl: number }[];
  formatDisplay: (v: number) => string;
}

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
    <>
      <div className="grid min-w-0 gap-6 lg:grid-cols-3">
        <PremiumPanel className="min-w-0 lg:col-span-2 border-slate-200/80 dark:border-slate-800/80 dark:bg-slate-900/60">
          <h2 className="text-lg font-semibold text-white">
            {t("charts.cumulativeTitle")}
          </h2>
          <p className="mt-1 text-xs text-slate-500">
            {t("charts.cumulativeHint")}
          </p>
          <div className="mt-4 h-[320px]">
            {cumChart.length < 2 ? (
              <p className="py-20 text-center text-sm text-slate-500">
                {t("empty.needTrades")}
              </p>
            ) : (
              <ChartWrapper height={320} minHeight={280}>
                <AreaChart data={cumChart}>
                  <defs>
                    <linearGradient id="cumPnl" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#0052FF" stopOpacity={0.35} />
                      <stop offset="95%" stopColor="#0052FF" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                  <XAxis
                    dataKey="label"
                    tick={{ fill: "#64748b", fontSize: 10 }}
                    interval="preserveStartEnd"
                    tickFormatter={(v) => String(v).slice(5, 16)}
                  />
                  <YAxis
                    tick={{ fill: "#64748b", fontSize: 10 }}
                    tickFormatter={(v) => formatDisplay(Number(v))}
                  />
                  <Tooltip
                    contentStyle={tooltipStyle}
                    labelStyle={{ color: "#94a3b8" }}
                    formatter={
                      ((v: unknown) => [
                        formatDisplay(Number(v)),
                        t("charts.cumulativeSeries"),
                      ]) as unknown as NonNullable<
                        ComponentProps<typeof Tooltip>["formatter"]
                      >
                    }
                  />
                  <Area
                    type="monotone"
                    dataKey="cumulative"
                    stroke="#0052FF"
                    strokeWidth={2}
                    fill="url(#cumPnl)"
                  />
                </AreaChart>
              </ChartWrapper>
            )}
          </div>
        </PremiumPanel>

        <PremiumPanel className="min-w-0 border-slate-200/80 dark:border-slate-800/80 dark:bg-slate-900/60">
          <h2 className="text-lg font-semibold text-white">
            {t("charts.outcomeTitle")}
          </h2>
          <p className="mt-1 text-xs text-slate-500">
            {t("charts.outcomeHint")}
          </p>
          <div className="mt-4 h-[280px] w-full min-w-0">
            {data.winLossSlices.length === 0 ? (
              <p className="py-16 text-center text-sm text-slate-500">
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
                    innerRadius={52}
                    outerRadius={78}
                    paddingAngle={2}
                  >
                    {data.winLossSlices.map((s) => (
                      <Cell key={s.key} fill={s.fill} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={tooltipStyle} />
                  <Legend wrapperStyle={{ fontSize: 12, color: "#94a3b8" }} />
                </PieChart>
              </ChartWrapper>
            )}
          </div>
        </PremiumPanel>
      </div>

      <div
        className={`border border-slate-800/80 bg-slate-900/60 p-5 ${RADIUS.card} ${SHADOW.cardBrand}`}
      >
        <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
          <h2 className="text-lg font-semibold text-white">
            {t("charts.dailyTitle")}
          </h2>
          {data.worstDay ? (
            <span className="inline-flex items-center gap-1 text-xs text-slate-500">
              <ArrowDownRight className="h-3.5 w-3.5 text-rose-400" />
              {t("worstDay", {
                day: data.worstDay.day,
                amount: formatDisplay(data.worstDay.pnl),
              })}
            </span>
          ) : null}
        </div>
        <p className="mt-1 text-xs text-slate-500">
          {t("charts.dailyHint")}
        </p>
        <div className="mt-4 h-[300px]">
          {dailyTail.length === 0 ? (
            <p className="py-20 text-center text-sm text-slate-500">
              {t("empty.needDaily")}
            </p>
          ) : (
            <ChartWrapper height={300} minHeight={260}>
              <BarChart data={dailyTail}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                <XAxis
                  dataKey="day"
                  tick={{ fill: "#64748b", fontSize: 10 }}
                  angle={-24}
                  textAnchor="end"
                  height={56}
                />
                <YAxis
                  tick={{ fill: "#64748b", fontSize: 10 }}
                  tickFormatter={(v) => formatDisplay(Number(v))}
                />
                <Tooltip
                  contentStyle={tooltipStyle}
                  formatter={
                    ((v: unknown) => [
                      formatDisplay(Number(v)),
                      t("charts.dailySeries"),
                    ]) as unknown as NonNullable<
                      ComponentProps<typeof Tooltip>["formatter"]
                    >
                  }
                />
                <Bar dataKey="pnl" radius={[6, 6, 0, 0]} maxBarSize={36}>
                  {dailyTail.map((e) => (
                    <Cell
                      key={e.day}
                      fill={e.pnl >= 0 ? "#10b981" : "#f43f5e"}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ChartWrapper>
          )}
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div
          className={`border border-slate-800/80 bg-slate-900/60 p-5 ${RADIUS.card} ${SHADOW.card}`}
        >
          <h2 className="text-lg font-semibold text-white">
            {t("charts.pairsTitle")}
          </h2>
          <p className="mt-1 text-xs text-slate-500">
            {t("charts.pairsHint")}
          </p>
          <div className="mt-4 h-[320px]">
            {data.topPairs.length === 0 ? (
              <p className="py-20 text-center text-sm text-slate-500">
                {t("empty.needPairs")}
              </p>
            ) : (
              <ChartWrapper height={320} minHeight={280}>
                <BarChart
                  layout="vertical"
                  data={pairsChartDesc}
                  margin={{ left: 8, right: 16 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                  <XAxis
                    type="number"
                    tick={{ fill: "#64748b", fontSize: 10 }}
                    tickFormatter={(v) => formatDisplay(Number(v))}
                  />
                  <YAxis
                    type="category"
                    dataKey="pair"
                    width={88}
                    tick={{ fill: "#94a3b8", fontSize: 11 }}
                  />
                  <Tooltip
                    contentStyle={tooltipStyle}
                    formatter={
                      ((v: unknown) => [
                        formatDisplay(Number(v)),
                        t("charts.pairPnl"),
                      ]) as unknown as NonNullable<
                        ComponentProps<typeof Tooltip>["formatter"]
                      >
                    }
                  />
                  <Bar dataKey="pnl" radius={[0, 6, 6, 0]} maxBarSize={22}>
                    {pairsChartDesc.map((e) => (
                      <Cell
                        key={e.pair}
                        fill={e.pnl >= 0 ? "#10b981" : "#f43f5e"}
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ChartWrapper>
            )}
          </div>
        </div>

        <div
          className={`border border-slate-800/80 bg-slate-900/60 p-5 ${RADIUS.card} ${SHADOW.card}`}
        >
          <h2 className="text-lg font-semibold text-white">
            {t("charts.modeTitle")}
          </h2>
          <p className="mt-1 text-xs text-slate-500">
            {t("charts.modeHint")}
          </p>
          <ul className="mt-6 space-y-4">
            {data.modeSplit.length === 0 ? (
              <li className="text-sm text-slate-500">
                {t("empty.needModes")}
              </li>
            ) : (
              data.modeSplit.map((m) => (
                <li
                  key={m.mode}
                  className="rounded-xl border border-slate-800 bg-slate-950/50 px-4 py-3"
                >
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-medium text-slate-200">
                      {modeLabel(m.mode)}
                    </span>
                    <span
                      className={
                        m.pnl >= 0 ? "text-emerald-400" : "text-rose-400"
                      }
                    >
                      {formatDisplay(m.pnl)}
                    </span>
                  </div>
                  <p className="mt-1 text-xs text-slate-500">
                    {t("modeTrades", { count: m.trades })}
                  </p>
                </li>
              ))
            )}
          </ul>
        </div>
      </div>
    </>
  );
}
