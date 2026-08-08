"use client";

import { motion } from "framer-motion";
import { TrendingUp, TrendingDown, Info } from "lucide-react";
import { cn } from "@/lib/utils";

interface MetricCardProps {
  label: string;
  value: number;
  prefix?: string;
  suffix?: string;
  decimals?: number;
  trend?: "up" | "down" | "neutral";
  tooltip?: string;
  icon?: React.ReactNode;
  className?: string;
}

export function MetricCard({
  label,
  value,
  prefix = "",
  suffix = "",
  decimals = 0,
  trend = "neutral",
  tooltip,
  icon,
  className,
}: MetricCardProps) {
  return (
    <motion.div
      className={cn(
        "group relative overflow-hidden rounded-2xl",
        "border border-white/[0.06]",
        "bg-gradient-to-br from-white/[0.03] to-transparent",
        "p-4 transition-all duration-300",
        "hover:border-white/[0.12] hover:shadow-xl hover:shadow-black/20",
        className,
      )}
      whileHover={{ scale: 1.02 }}
      transition={{ type: "spring", stiffness: 400, damping: 25 }}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-1.5">
          {icon && <div className="text-zinc-400">{icon}</div>}
          <span className="text-[10px] font-bold uppercase tracking-widest text-zinc-500">
            {label}
          </span>
        </div>

        {tooltip && (
          <div className="opacity-0 group-hover:opacity-100 transition-opacity" title={tooltip}>
            <Info className="size-3 text-zinc-600" />
          </div>
        )}
      </div>

      {/* Value */}
      <div className="flex items-baseline gap-1">
        <span
          className={cn(
            "text-2xl font-bold tracking-tight tabular-nums",
            trend === "up" && "text-emerald-400",
            trend === "down" && "text-rose-400",
            trend === "neutral" && "text-white",
          )}
        >
          {prefix}
        {value.toLocaleString("nb-NO", {
          minimumFractionDigits: decimals,
          maximumFractionDigits: decimals,
        })}
        {suffix}
        </span>
      </div>

      {/* Trend indicator */}
      {trend !== "neutral" && (
        <div className="flex items-center gap-1 mt-1">
          {trend === "up" ? (
            <TrendingUp className="size-3 text-emerald-400" />
          ) : (
            <TrendingDown className="size-3 text-rose-400" />
          )}
          <span className={cn("text-xs", trend === "up" ? "text-emerald-400" : "text-rose-400")}>
            {trend === "up" ? "Opp" : "Ned"}
          </span>
        </div>
      )}

      {/* Hover glow */}
      <div className="absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none"
        style={{
          background: "radial-gradient(400px circle at var(--mouse-x, 50%) var(--mouse-y, 50%), rgba(255,255,255,0.03), transparent 40%)",
        }}
      />
    </motion.div>
  );
}
