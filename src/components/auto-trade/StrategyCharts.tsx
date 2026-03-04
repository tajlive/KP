"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Activity, BarChart3 } from "lucide-react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ReferenceDot,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

interface ChartPoint {
  time: string;
  price: number;
  signal?: "BUY" | "SELL";
}

interface EquityPoint {
  time: string;
  equity: number;
}

interface StrategyChartsProps {
  chartData: ChartPoint[];
  equityData: EquityPoint[];
  symbol: string;
  pnl: number;
  startingEquity: number;
  buyDots: ChartPoint[];
  sellDots: ChartPoint[];
}

export default function StrategyCharts({
  chartData,
  equityData,
  symbol,
  pnl,
  startingEquity,
  buyDots,
  sellDots,
}: StrategyChartsProps) {
  return (
    <div className="lg:col-span-2 space-y-4">
      {/* Price Chart */}
      <Card className="bg-slate-900 text-white border-slate-700">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm text-slate-400 flex items-center gap-2">
            <Activity className="h-4 w-4" />
            Priskart — {symbol}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={250}>
            <AreaChart data={chartData}>
              <defs>
                <linearGradient id="priceGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
              <XAxis
                dataKey="time"
                tick={{ fill: "#94a3b8", fontSize: 10 }}
                interval="preserveStartEnd"
              />
              <YAxis
                tick={{ fill: "#94a3b8", fontSize: 10 }}
                domain={["auto", "auto"]}
                tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: "#1e293b",
                  border: "1px solid #475569",
                  borderRadius: 8,
                }}
                labelStyle={{ color: "#94a3b8" }}
                formatter={(v: number) => [
                  `${Math.round(v).toLocaleString("no")} kr`,
                  "Pris",
                ]}
              />
              <Area
                type="monotone"
                dataKey="price"
                stroke="#3b82f6"
                fill="url(#priceGrad)"
                strokeWidth={2}
              />
              {buyDots.map((d, i) => (
                <ReferenceDot
                  key={`b${i}`}
                  x={d.time}
                  y={d.price}
                  r={5}
                  fill="#22c55e"
                  stroke="#166534"
                />
              ))}
              {sellDots.map((d, i) => (
                <ReferenceDot
                  key={`s${i}`}
                  x={d.time}
                  y={d.price}
                  r={5}
                  fill="#ef4444"
                  stroke="#991b1b"
                />
              ))}
            </AreaChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Equity Curve */}
      <Card className="bg-slate-900 text-white border-slate-700">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm text-slate-400 flex items-center gap-2">
            <BarChart3 className="h-4 w-4" />
            Equity Curve
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={180}>
            <AreaChart data={equityData}>
              <defs>
                <linearGradient id="eqGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop
                    offset="5%"
                    stopColor={pnl >= 0 ? "#22c55e" : "#ef4444"}
                    stopOpacity={0.3}
                  />
                  <stop
                    offset="95%"
                    stopColor={pnl >= 0 ? "#22c55e" : "#ef4444"}
                    stopOpacity={0}
                  />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
              <XAxis
                dataKey="time"
                tick={{ fill: "#94a3b8", fontSize: 10 }}
                interval="preserveStartEnd"
              />
              <YAxis
                tick={{ fill: "#94a3b8", fontSize: 10 }}
                domain={["auto", "auto"]}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: "#1e293b",
                  border: "1px solid #475569",
                  borderRadius: 8,
                }}
                formatter={(v: number) => [`${v.toFixed(2)} USDT`, "Equity"]}
              />
              <ReferenceLine
                y={startingEquity}
                stroke="#475569"
                strokeDasharray="3 3"
              />
              <Area
                type="monotone"
                dataKey="equity"
                stroke={pnl >= 0 ? "#22c55e" : "#ef4444"}
                fill="url(#eqGrad)"
                strokeWidth={2}
              />
            </AreaChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  );
}
