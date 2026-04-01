"use client";

import { useMemo } from "react";
import { Area, AreaChart, YAxis } from "recharts";
import { ChartWrapper } from "@/shared/ui/chart-wrapper";

interface SparklineProps {
  data: number[];
  color: "green" | "red" | "yellow";
}

export function Sparkline({ data, color }: SparklineProps) {
  const chartData = useMemo(() => {
    return data.map((value, index) => ({ index, value }));
  }, [data]);

  const colorMap = {
    green: {
      stroke: "#10b981",
      fill: "url(#colorGreen)",
    },
    red: {
      stroke: "#ef4444",
      fill: "url(#colorRed)",
    },
    yellow: {
      stroke: "#eab308",
      fill: "url(#colorYellow)",
    },
  };

  const selectedColor = colorMap[color] || colorMap.green;

  // If there's no data or only 1 point, it's hard to draw a sparkline
  if (!chartData || chartData.length < 2) {
    return (
      <div className="w-full h-full flex items-center justify-center text-xs text-slate-500">
        —
      </div>
    );
  }

  // Calculate min/max for slightly padded Y-axis
  const values = data;
  const min = Math.min(...values);
  const max = Math.max(...values);
  const padding = (max - min) * 0.1 || 1; // 10% padding or at least 1

  return (
    <div className="w-full h-full opacity-80 mix-blend-screen">
      <ChartWrapper height={60} minHeight={30}>
        <AreaChart
          data={chartData}
          margin={{ top: 2, right: 0, bottom: 2, left: 0 }}
        >
          <defs>
            <linearGradient id="colorGreen" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
              <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
            </linearGradient>
            <linearGradient id="colorRed" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#ef4444" stopOpacity={0.3} />
              <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
            </linearGradient>
            <linearGradient id="colorYellow" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#eab308" stopOpacity={0.3} />
              <stop offset="95%" stopColor="#eab308" stopOpacity={0} />
            </linearGradient>
          </defs>
          <YAxis domain={[min - padding, max + padding]} hide={true} />
          <Area
            type="monotone"
            dataKey="value"
            stroke={selectedColor.stroke}
            fill={selectedColor.fill}
            strokeWidth={1.5}
            isAnimationActive={false} // Disable animation for performance if there are many sparklines, or re-enable if desired
          />
        </AreaChart>
      </ChartWrapper>
    </div>
  );
}
