"use client";

import { format } from "date-fns";
import { nb } from "date-fns/locale";
import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ReferenceLine,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { useEffect, useState } from "react";
import { ChartWrapper } from "@/components/ui/chart-wrapper";

export function BacktestChart({ data }: { data: unknown[] }) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const chartData = (data || []).map((point: unknown) => ({
    date: format(new Date(point.timestamp), "dd MMM", { locale: nb }),
    portfolio: (point.portfolioValue || 0) / 1000, // Convert to thousands
    hodl: (point.buyHoldValue || 0) / 1000,
    drawdown: -Math.abs(point.drawdown || 0), // Negative for below-zero
  }));

  const initialValue = chartData[0]?.portfolio || 0;

  if (!mounted) {
    return (
      <div className="w-full h-[400px] animate-pulse rounded-lg bg-slate-800" />
    );
  }

  return (
    <ChartWrapper height={400} minHeight={400}>
        <LineChart data={chartData}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" opacity={0.5} />
          <XAxis dataKey="date" tick={{ fontSize: 12 }} stroke="#666" />
          <YAxis
            tick={{ fontSize: 12 }}
            stroke="#666"
            tickFormatter={(val) => `${val}k NOK`}
          />
          <Tooltip
            formatter={(value: unknown, name: unknown) => {
              const val = typeof value === "number" ? value : 0;
              const label =
                name === "portfolio"
                  ? "Din Strategi"
                  : name === "hodl"
                    ? "HODL Bitcoin"
                    : "Drawdown";
              return [`${val.toFixed(1)}k NOK`, label];
            }}
            contentStyle={{
              backgroundColor: "rgba(255, 255, 255, 0.95)",
              border: "1px solid #ccc",
              borderRadius: "8px",
            }}
          />
          <Legend
            verticalAlign="top"
            height={36}
            formatter={(value) => {
              const labels: Record<string, string> = {
                portfolio: "🎯 Din Strategi",
                hodl: "💎 HODL Bitcoin",
                drawdown: "📉 Drawdown",
              };
              return labels[value] || value;
            }}
          />

          <ReferenceLine
            y={initialValue}
            stroke="#999"
            strokeDasharray="3 3"
            label={{
              value: "Startkapital",
              fontSize: 12,
              fill: "#666",
              position: "insideTopLeft",
            }}
          />

          <Line
            type="monotone"
            dataKey="portfolio"
            stroke="#3b82f6"
            strokeWidth={3}
            dot={false}
            activeDot={{ r: 6 }}
          />
          <Line
            type="monotone"
            dataKey="hodl"
            stroke="#f59e0b"
            strokeWidth={2}
            strokeDasharray="5 5"
            dot={false}
          />
          <Line
            type="monotone"
            dataKey="drawdown"
            stroke="#ef4444"
            strokeWidth={1}
            dot={false}
            opacity={0.3}
          />
        </LineChart>
      </ChartWrapper>
  );
}
