"use client";

import { motion } from "framer-motion";
import { TrendingUp, TrendingDown } from "lucide-react";
import { useLivePnL } from "@/hooks/useLivePnL";
import { useCountUp } from "@/hooks/useCountUp";
import { SparklineChart } from "./SparklineChart";
import { Skeleton } from "@/components/ui/skeleton";

export function LivePnLWidget() {
  const {
    totalNok,
    changeNok,
    changePct,
    lastUpdated,
    isLoading,
    sparklineData,
  } = useLivePnL();

  const animatedTotal = useCountUp({ end: totalNok, duration: 800 });
  const isPositive = changePct >= 0;

  if (isLoading) {
    return <Skeleton variant="kpi" height="120px" />;
  }

  const formattedTotal = Math.round(animatedTotal).toLocaleString("nb-NO", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  });

  const formattedChange = Math.round(changeNok).toLocaleString("nb-NO", {
    minimumFractionDigits: 0,
  });

  const formattedPct = changePct.toFixed(2);

  return (
    <div
      className="w-full"
      style={{
        backgroundColor: "#111827",
        borderRadius: "16px",
        padding: "20px",
        border: "1px solid rgba(255,255,255,0.07)",
        boxShadow: "0 4px 24px rgba(0,0,0,0.4)",
      }}
    >
      {/* Header Row */}
      <div className="flex items-center justify-between mb-2">
        <span
          style={{
            fontSize: "12px",
            color: "#6b7280",
            textTransform: "uppercase",
            letterSpacing: "0.08em",
          }}
        >
          Porteføljeverdi
        </span>
        <div className="flex items-center gap-1.5">
          <div className="live-dot" />
          <span
            style={{
              fontSize: "10px",
              color: "#22c55e",
              textTransform: "uppercase",
            }}
          >
            LIVE
          </span>
        </div>
      </div>

      {/* Value Row */}
      <motion.div
        className="mb-2"
        key={Math.round(totalNok)}
        initial={{ scale: 0.98, opacity: 0.8 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.2 }}
      >
        <span
          style={{
            fontSize: "28px",
            fontWeight: 700,
            color: "white",
            fontVariantNumeric: "tabular-nums",
          }}
        >
          NOK {formattedTotal}
        </span>
      </motion.div>

      {/* Change Row */}
      <div
        className="flex items-center gap-2 mb-2"
        style={{ color: isPositive ? "#22c55e" : "#ef4444" }}
      >
        {isPositive ? (
          <TrendingUp size={14} />
        ) : (
          <TrendingDown size={14} />
        )}
        <span style={{ fontSize: "13px" }}>
          {changeNok > 0 ? "+" : ""}NOK {formattedChange} i dag (
          {changePct > 0 ? "+" : ""}
          {formattedPct}%)
        </span>
      </div>

      {/* Sparkline */}
      <div className="mt-2">
        <SparklineChart
          data={sparklineData}
          isPositive={isPositive}
          height={48}
        />
      </div>

      {/* Footer */}
      <div
        className="mt-2 text-right"
        style={{ fontSize: "11px", color: "#4b5563" }}
      >
        Oppdatert{" "}
        {lastUpdated.toLocaleTimeString("nb-NO", {
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
        })}
      </div>
    </div>
  );
}
