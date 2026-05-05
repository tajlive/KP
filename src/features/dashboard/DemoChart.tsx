"use client";

import { useMemo } from "react";
import { motion } from "framer-motion";
import { useLocale, useTranslations } from "next-intl";

interface DemoChartProps {
  height?: number;
}

function generateCurve(width: number, height: number, seed: number): string {
  const points: { x: number; y: number }[] = [];
  const segments = 40;
  let y = height * 0.7;
  let trend = 0;

  for (let i = 0; i <= segments; i++) {
    const x = (i / segments) * width;
    // Random-ish walk with upward drift
    trend += (Math.sin(i * 0.5 + seed) * 0.3 + 0.1);
    y += trend + (Math.random() - 0.5) * height * 0.08;
    y = Math.max(height * 0.2, Math.min(height * 0.85, y));
    points.push({ x, y });
  }

  // Catmull-Rom spline → SVG path
  const toPath = (pts: typeof points) => {
    if (pts.length < 2) return "";
    let d = `M ${pts[0].x},${pts[0].y}`;
    for (let i = 0; i < pts.length - 1; i++) {
      const p0 = pts[Math.max(0, i - 1)];
      const p1 = pts[i];
      const p2 = pts[Math.min(pts.length - 1, i + 1)];
      const p3 = pts[Math.min(pts.length - 1, i + 2)];

      const cp1x = p1.x + (p2.x - p0.x) / 6;
      const cp1y = p1.y + (p2.y - p0.y) / 6;
      const cp2x = p2.x - (p3.x - p1.x) / 6;
      const cp2y = p2.y - (p3.y - p1.y) / 6;

      d += ` C ${cp1x},${cp1y} ${cp2x},${cp2y} ${p2.x},${p2.y}`;
    }
    return d;
  };

  return toPath(points);
}

export function DemoChart({ height = 180 }: DemoChartProps) {
  const locale = useLocale();
  const t = useTranslations("dashboard.demoChart");
  const w = 400;
  const h = height;

  // Use deterministic "random" values for SSR stability
  const linePath = useMemo(() => generateCurve(w, h, 1.23), []);
  const areaPath = useMemo(() => {
    const base = generateCurve(w, h, 1.23);
    return `${base} L ${w},${h} L 0,${h} Z`;
  }, []);

  const labels = [t("week1"), t("week2"), t("week3"), t("week4")];

  return (
    <motion.div
      id="demo"
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.2 }}
      className="relative rounded-2xl border border-slate-700/50 bg-slate-900/50 p-4 overflow-hidden"
    >
      <div className="absolute top-3 left-4">
        <span className="text-[10px] uppercase tracking-wider text-slate-500 font-medium">
          {t("demoLabel")}
        </span>
      </div>

      <svg
        viewBox={`0 0 ${w} ${h}`}
        className="w-full mt-5"
        style={{ height }}
        preserveAspectRatio="none"
      >
        <defs>
          <linearGradient id="demoArea" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="rgb(16, 185, 129)" stopOpacity="0.2" />
            <stop offset="100%" stopColor="rgb(16, 185, 129)" stopOpacity="0" />
          </linearGradient>
        </defs>

        {/* Grid lines */}
        {[0.25, 0.5, 0.75].map((p) => (
          <line
            key={p}
            x1={0}
            y1={h * p}
            x2={w}
            y2={h * p}
            stroke="rgba(148,163,184,0.08)"
            strokeDasharray="4 4"
          />
        ))}

        {/* Area fill */}
        <path d={areaPath} fill="url(#demoArea)" />

        {/* Line */}
        <motion.path
          d={linePath}
          fill="none"
          stroke="rgb(16, 185, 129)"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          initial={{ pathLength: 0 }}
          animate={{ pathLength: 1 }}
          transition={{ duration: 1.5, ease: "easeInOut" }}
        />

        {/* End dot */}
        <circle cx={w} cy={h * 0.3} r="3" fill="rgb(16, 185, 129)" />
      </svg>

      <div className="flex justify-between mt-2 text-[10px] text-slate-500">
        {labels.map((l, i) => (
          <span key={i}>{l}</span>
        ))}
      </div>
    </motion.div>
  );
}
