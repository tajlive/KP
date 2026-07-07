"use client";

import { motion } from "framer-motion";
import { TrendingUp, TrendingDown, BarChart3, Wallet, Target, Info } from "lucide-react";
import { cn } from "@/lib/utils";
import { AnimatedNumber } from "@/shared/ui/AnimatedNumber";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/shared/ui/tooltip";

interface MetricCardProps {
  label: string;
  value: number;
  prefix?: string;
  suffix?: string;
  decimals?: number;
  change?: number;
  changeLabel?: string;
  icon?: React.ReactNode;
  tooltip?: string;
  trend?: "up" | "down" | "neutral";
  className?: string;
}

export function MetricCard({
  label,
  value,
  prefix = "",
  suffix = "",
  decimals = 0,
  change,
  changeLabel,
  icon,
  tooltip,
  trend,
  className,
}: MetricCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className={cn(
        "rounded-2xl bg-kp-bg-card border border-kp-border p-4 sm:p-5 relative overflow-hidden",
        "hover:border-kp-border-strong transition-colors",
        className,
      )}
    >
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <span className="text-xs font-medium text-kp-text-secondary uppercase tracking-wide">
            {label}
          </span>
          {tooltip && (
            <TooltipProvider delayDuration={300}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Info className="w-3.5 h-3.5 text-kp-text-muted cursor-help" />
                </TooltipTrigger>
                <TooltipContent side="top" className="max-w-[200px] text-xs">
                  {tooltip}
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}
        </div>
        {icon && (
          <div
            className={cn(
              "w-8 h-8 rounded-xl flex items-center justify-center",
              trend === "up" && "bg-green-500/10 text-green-400",
              trend === "down" && "bg-red-500/10 text-red-400",
              trend === "neutral" && "bg-blue-500/10 text-blue-400",
            )}
          >
            {icon}
          </div>
        )}
      </div>

      <div className="flex items-baseline gap-1">
        <span
          className={cn(
            "text-2xl sm:text-3xl font-bold tabular-nums tracking-tight text-kp-text-primary",
            trend === "up" && "text-kp-success",
            trend === "down" && "text-kp-danger",
          )}
        >
          {value === 0 && prefix === "" ? (
            "—"
          ) : (
            <AnimatedNumber
              value={value}
              prefix={prefix}
              suffix={suffix}
              decimals={decimals}
              duration={400}
            />
          )}
        </span>
      </div>

      {change !== undefined && (
        <div className="flex items-center gap-1.5 mt-1.5">
          <span
            className={cn(
              "text-xs font-semibold",
              (change ?? 0) >= 0 ? "text-green-400" : "text-red-400",
            )}
          >
            {(change ?? 0) >= 0 ? <TrendingUp className="w-3 h-3 inline" /> : <TrendingDown className="w-3 h-3 inline" />}
            {" "}
            {change >= 0 ? "+" : ""}{change}%
          </span>
          {changeLabel && (
            <span className="text-xs text-kp-text-muted">{changeLabel}</span>
          )}
        </div>
      )}

      {/* Subtle glow on hover */}
      <div
        aria-hidden
        className="absolute inset-0 rounded-2xl opacity-0 hover:opacity-100 transition-opacity pointer-events-none"
        style={{
          background: trend === "up"
            ? "radial-gradient(circle at top right, rgba(34,197,94,0.06) 0%, transparent 70%)"
            : trend === "down"
              ? "radial-gradient(circle at top right, rgba(239,68,68,0.06) 0%, transparent 70%)"
              : "radial-gradient(circle at top right, rgba(59,130,246,0.04) 0%, transparent 70%)",
        }}
      />
    </motion.div>
  );
}
