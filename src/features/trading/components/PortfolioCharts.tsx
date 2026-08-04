"use client";

import { useMemo } from "react";
import { useTranslations } from "next-intl";
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
} from "recharts";
import { ChartWrapper } from "@/shared/ui/chart-wrapper";
import { buildTradingAnalytics } from "@/lib/trading/build-trading-analytics";
import type { Portfolio } from "@/lib/trading-api";
import type { Trade } from "@/lib/trading-api";
import type { UserStrategy } from "@/lib/trading-api";

interface PortfolioChartsProps {
  portfolio: Portfolio | null;
  trades: Trade[];
  activeStrategies: UserStrategy[];
  formatNOK: (v: number) => string;
}

const COLORS = ["#3b82f6", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6", "#ec4899"];
const CASH_COLOR = "#64748b";

export function PortfolioCharts({ portfolio, trades, activeStrategies, formatNOK }: PortfolioChartsProps) {
  const t = useTranslations("trading.charts");

  const analytics = useMemo(() => {
    if (!trades.length) return null;
    return buildTradingAnalytics(
      trades.map((t) => ({
        id: t.id,
        trading_pair: t.symbol,
        side: t.side,
        realized_pnl: t.realized_pnl,
        mode: t.mode,
        created_at: t.created_at,
        executed_at: t.executed_at,
        total_value: t.total_value,
      })),
      new Date().toISOString(),
      portfolio?.total_value ?? 100000,
    );
  }, [trades, portfolio?.total_value]);

  // Allocation donut data
  const allocationData = useMemo(() => {
    if (!portfolio) return [];
    const data: { name: string; value: number; color: string }[] = [];

    // Cash
    const cash = portfolio.cash_balance - portfolio.invested_value;
    if (cash > 0) {
      data.push({ name: t("cash"), value: cash, color: CASH_COLOR });
    }

    // Invested per pair from active strategies
    const pairMap = new Map<string, number>();
    for (const strategy of activeStrategies) {
      const pair = strategy.trading_pair || "—";
      // Approximate invested per strategy from portfolio share
      const invested = portfolio.invested_value / activeStrategies.length;
      pairMap.set(pair, (pairMap.get(pair) ?? 0) + invested);
    }

    let colorIdx = 0;
    for (const [pair, value] of pairMap) {
      if (value > 0) {
        data.push({ name: pair.replace("USDT", "/NOK"), value, color: COLORS[colorIdx % COLORS.length] });
        colorIdx++;
      }
    }

    return data;
  }, [portfolio, activeStrategies, t]);

  if (!portfolio || (!allocationData.length && !analytics)) {
    return (
      <div className="bg-slate-800 rounded-xl p-6 text-center">
        <p className="text-slate-300">{t("startTrading")}</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Allocation Donut */}
      <div className="bg-slate-800 rounded-xl p-5 border border-slate-700/40">
        <h3 className="text-sm font-semibold text-slate-200 mb-4">{t("allocation")}</h3>
        {allocationData.length > 0 ? (
          <div className="flex flex-col items-center">
            <ChartWrapper height={220} minHeight={180}>
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={allocationData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={90}
                    paddingAngle={3}
                    dataKey="value"
                    stroke="none"
                  >
                    {allocationData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "#1e293b",
                      border: "1px solid #334155",
                      borderRadius: "8px",
                      color: "#f1f5f9",
                    }}
                    formatter={((value: number, name: string) => [
                      formatNOK(value),
                      name,
                    ]) as never}
                  />
                </PieChart>
              </ResponsiveContainer>
            </ChartWrapper>
            <div className="flex flex-wrap justify-center gap-3 mt-3">
              {allocationData.map((item) => (
                <div key={item.name} className="flex items-center gap-1.5 text-xs">
                  <span
                    className="w-2.5 h-2.5 rounded-full"
                    style={{ backgroundColor: item.color }}
                  />
                  <span className="text-slate-300">{item.name}</span>
                  <span className="text-slate-400">
                    {((item.value / portfolio.total_value) * 100).toFixed(0)}%
                  </span>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <p className="text-slate-400 text-sm text-center py-8">{t("noAllocation")}</p>
        )}
      </div>

      {/* Equity Curve */}
      <div className="bg-slate-800 rounded-xl p-5 border border-slate-700/40">
        <h3 className="text-sm font-semibold text-slate-200 mb-4">{t("equityCurve")}</h3>
        {analytics && analytics.cumulativePnl.length > 0 ? (
          <ChartWrapper height={220} minHeight={180}>
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart
                data={analytics.cumulativePnl}
                margin={{ top: 5, right: 5, bottom: 5, left: 5 }}
              >
                <defs>
                  <linearGradient id="equityGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#0052FF" stopOpacity={0.3} />
                    <stop offset="100%" stopColor="#0052FF" stopOpacity={0.02} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                <XAxis
                  dataKey="label"
                  tick={{ fill: "#94a3b8", fontSize: 10 }}
                  tickFormatter={(v: string) => v.slice(0, 10)}
                  interval="preserveStartEnd"
                />
                <YAxis
                  tick={{ fill: "#94a3b8", fontSize: 10 }}
                  tickFormatter={(v: number) => formatNOK(v)}
                  width={60}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "#1e293b",
                    border: "1px solid #334155",
                    borderRadius: "8px",
                    color: "#f1f5f9",
                  }}
                  formatter={((value: number) => [
                    `${value >= 0 ? "+" : ""}${formatNOK(value)}`,
                    t("cumulativePnl"),
                  ]) as never}
                  labelFormatter={((label: string) => label) as never}
                />
                <Area
                  type="monotone"
                  dataKey="cumulative"
                  stroke="#0052FF"
                  strokeWidth={2}
                  fill="url(#equityGradient)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </ChartWrapper>
        ) : (
          <p className="text-slate-400 text-sm text-center py-8">{t("noTradesYet")}</p>
        )}
      </div>
    </div>
  );
}
