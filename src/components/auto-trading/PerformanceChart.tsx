"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { AutoTradingTrade } from "@/lib/auto-trading/types";
import { format } from "date-fns";
import { nb } from "date-fns/locale";
import { useEffect, useMemo, useState } from "react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ReferenceLine,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { ChartWrapper } from "@/components/ui/chart-wrapper";

interface PerformanceChartProps {
  trades: AutoTradingTrade[];
  startingBalance: number;
  period?: "1D" | "1W" | "1M" | "ALL";
}

export function PerformanceChart({
  trades,
  startingBalance,
  period = "ALL",
}: PerformanceChartProps) {
  const chartData = useMemo(() => {
    // 1. Sort trades by close date (oldest first)
    const sortedTrades = [...trades]
      .filter((t) => t.status === "CLOSED" && t.closed_at)
      .sort(
        (a, b) =>
          new Date(a.closed_at!).getTime() - new Date(b.closed_at!).getTime(),
      );

    // 2. Generate equity curve points
    let currentBalance = startingBalance;
    const data = [
      {
        date:
          sortedTrades.length > 0
            ? new Date(sortedTrades[0].opened_at).getTime()
            : Date.now(),
        balance: startingBalance,
        pnl: 0,
      },
    ];

    sortedTrades.forEach((trade) => {
      const pnl = trade.realized_pnl || trade.pnl_nok || 0;
      currentBalance += pnl;

      data.push({
        date: new Date(trade.closed_at!).getTime(),
        balance: currentBalance,
        pnl: pnl,
      });
    });

    // 3. Add current live point if needed (can be added later)
    return data;
  }, [trades, startingBalance]);

  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <Card className="bg-slate-900 border-slate-800">
        <CardHeader>
          <CardTitle className="text-white text-lg font-medium">
            Resultatutvikling (Equity Curve)
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[300px] w-full flex items-center justify-center">
            <span className="text-slate-500">Laster graf...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  const isProfitable =
    (chartData[chartData.length - 1]?.balance || startingBalance) >=
    startingBalance;

  return (
    <Card className="bg-slate-900 border-slate-800">
      <CardHeader>
        <CardTitle className="text-white text-lg font-medium">
          Resultatutvikling (Equity Curve)
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ChartWrapper height={300} minHeight={300}>
          <AreaChart data={chartData}>
              <defs>
                <linearGradient id="colorBalance" x1="0" y1="0" x2="0" y2="1">
                  <stop
                    offset="5%"
                    stopColor={isProfitable ? "#22c55e" : "#ef4444"}
                    stopOpacity={0.3}
                  />
                  <stop
                    offset="95%"
                    stopColor={isProfitable ? "#22c55e" : "#ef4444"}
                    stopOpacity={0}
                  />
                </linearGradient>
              </defs>
              <CartesianGrid
                strokeDasharray="3 3"
                stroke="#1e293b"
                vertical={false}
              />
              <XAxis
                dataKey="date"
                tickFormatter={(tick) =>
                  format(new Date(tick), "d. MMM", { locale: nb })
                }
                stroke="#64748b"
                tick={{ fontSize: 12 }}
                minTickGap={30}
              />
              <YAxis
                domain={["auto", "auto"]}
                tickFormatter={(tick) => `${tick.toLocaleString()} kr`}
                stroke="#64748b"
                tick={{ fontSize: 12 }}
                width={80}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: "#0f172a",
                  borderColor: "#1e293b",
                  color: "#f8fafc",
                }}
                itemStyle={{ color: "#f8fafc" }}
                labelFormatter={(label) =>
                  format(new Date(label), "d. MMM HH:mm", { locale: nb })
                }
                formatter={
                  ((value: number) => [
                    `${value.toFixed(2)}%`,
                    "Avkastning",
                  ]) as any
                }
              />
              <ReferenceLine
                y={startingBalance}
                stroke="#94a3b8"
                strokeDasharray="3 3"
              />
              <Area
                type="monotone"
                dataKey="balance"
                stroke={isProfitable ? "#22c55e" : "#ef4444"}
                strokeWidth={2}
                fill="url(#colorBalance)"
              />
          </AreaChart>
        </ChartWrapper>
      </CardContent>
    </Card>
  );
}
