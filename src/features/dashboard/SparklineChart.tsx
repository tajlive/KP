"use client";

import { motion } from "framer-motion";

interface SparklineChartProps {
  data: number[];
  isPositive: boolean;
  width?: number;
  height?: number;
}

export function SparklineChart({
  data,
  isPositive,
  width = 280,
  height = 48,
}: SparklineChartProps) {
  if (data.length < 2) return null;

  const strokeColor = isPositive ? "#22c55e" : "#ef4444";
  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;

  const padding = 4;
  const chartWidth = width - padding * 2;
  const chartHeight = height - padding * 2;

  // Generate points for the polyline
  const points = data.map((value, index) => {
    const x = padding + (index / (data.length - 1)) * chartWidth;
    const y = padding + chartHeight - ((value - min) / range) * chartHeight;
    return `${x},${y}`;
  });

  const pathD = `M ${points.join(" L ")}`;

  // Generate area path (closed)
  const areaPathD = `${pathD} L ${padding + chartWidth},${padding + chartHeight} L ${padding},${padding + chartHeight} Z`;

  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      className="overflow-visible"
    >
      <defs>
        <linearGradient id={`sparklineGradient-${isPositive}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={strokeColor} stopOpacity={0.1} />
          <stop offset="100%" stopColor={strokeColor} stopOpacity={0} />
        </linearGradient>
      </defs>

      {/* Area fill */}
      <motion.path
        d={areaPathD}
        fill={`url(#sparklineGradient-${isPositive})`}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5 }}
      />

      {/* Line */}
      <motion.path
        d={pathD}
        fill="none"
        stroke={strokeColor}
        strokeWidth={1.5}
        strokeLinecap="round"
        strokeLinejoin="round"
        initial={{ pathLength: 0 }}
        animate={{ pathLength: 1 }}
        transition={{ duration: 0.8, ease: "easeOut" }}
      />
    </svg>
  );
}
