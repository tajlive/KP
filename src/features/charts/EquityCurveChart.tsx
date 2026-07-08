"use client";

import { useState, useEffect } from "react";
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, ReferenceLine } from "recharts";
import { motion } from "framer-motion";

interface EquityPoint {
  date: string;
  value: number;
  pnl: number;
}

interface EquityCurveChartProps {
  data?: EquityPoint[];
  startingCapital?: number;
  height?: number;
  className?: string;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any -- recharts Tooltip content gets active+payload from context, not props type
const CustomTooltip = ({ active, payload }: any) => {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload;
  return (
    <div className="rounded-xl border border-white/[0.08] bg-black/90 backdrop-blur-xl px-4 py-3 shadow-2xl">
      <p className="text-xs text-zinc-500">{d.date}</p>
      <p className="text-lg font-bold text-white tabular-nums">
        {d.value.toLocaleString("no")} kr
      </p>
      <p className={`text-xs font-medium ${d.pnl >= 0 ? "text-emerald-400" : "text-rose-400"}`}>
        {d.pnl >= 0 ? "+" : ""}{d.pnl.toLocaleString("no")} kr
      </p>
    </div>
  );
};

export function EquityCurveChart({
  data,
  startingCapital = 100000,
  height = 280,
  className,
}: EquityCurveChartProps) {
  const [animated, setAnimated] = useState(false);
  const currentValue = data?.[data.length - 1]?.value ?? startingCapital;
  const totalPnl = currentValue - startingCapital;
  const isPositive = totalPnl >= 0;

  useEffect(() => {
    const t = setTimeout(() => setAnimated(true), 300);
    return () => clearTimeout(t);
  }, []);

  // Generate mock data if none provided
  const chartData = data || generateMockEquity(startingCapital);

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className={className}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-500">
            Egenkapitalkurve
          </p>
          <div className="flex items-baseline gap-2 mt-0.5">
            <span className="text-2xl font-bold text-white tabular-nums">
              {currentValue.toLocaleString("no")}
            </span>
            <span className="text-sm text-zinc-500">kr</span>
          </div>
        </div>
        <div className={`text-right ${isPositive ? "text-emerald-400" : "text-rose-400"}`}>
          <p className="text-xs font-medium">
            {isPositive ? "▲" : "▼"} {Math.abs(totalPnl).toLocaleString("no")} kr
          </p>
          <p className="text-[10px] opacity-60">
            {((totalPnl / startingCapital) * 100).toFixed(1)}%
          </p>
        </div>
      </div>

      {/* Chart */}
      <div style={{ height }}>
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={animated ? chartData : []}>
            <defs>
              <linearGradient id="equityGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={isPositive ? "#22C55E" : "#EF4444"} stopOpacity={0.2} />
                <stop offset="100%" stopColor={isPositive ? "#22C55E" : "#EF4444"} stopOpacity={0} />
              </linearGradient>
            </defs>
            <XAxis dataKey="date" hide />
            <YAxis hide domain={["auto", "auto"]} />
            <Tooltip content={<CustomTooltip />} />
            <ReferenceLine
              y={startingCapital}
              stroke="rgba(255,255,255,0.1)"
              strokeDasharray="4 4"
            />
            <Area
              type="monotone"
              dataKey="value"
              stroke={isPositive ? "#22C55E" : "#EF4444"}
              strokeWidth={2}
              fill="url(#equityGrad)"
              animationDuration={1500}
              animationEasing="ease-out"
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </motion.div>
  );
}

function generateMockEquity(start: number): EquityPoint[] {
  const data: EquityPoint[] = [];
  let value = start;
  const now = new Date();
  for (let i = 30; i >= 0; i--) {
    const change = (Math.random() - 0.45) * start * 0.03;
    value += change;
    const date = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
    data.push({
      date: date.toLocaleDateString("nb-NO", { day: "numeric", month: "short" }),
      value: Math.round(value),
      pnl: Math.round(change),
    });
  }
  return data;
}
