"use client";

import { useReducedMotion } from "framer-motion";
import { motion } from "framer-motion";
import { TrendingDown, TrendingUp } from "lucide-react";

type TrendDeltaProps = {
  valueNok: number;
  label: string;
  /** For aria-label / screen readers */
  periodDescription: string;
};

function formatSignedNok(n: number): string {
  const abs = Math.abs(n);
  const fmt = new Intl.NumberFormat("no-NO", {
    style: "currency",
    currency: "NOK",
    maximumFractionDigits: 0,
  }).format(abs);
  if (n > 0) return `+${fmt}`;
  if (n < 0) return `−${fmt}`;
  return fmt;
}

export function TrendDelta({
  valueNok,
  label,
  periodDescription,
}: TrendDeltaProps) {
  const reduceMotion = useReducedMotion();
  const positive = valueNok >= 0;
  const Icon = positive ? TrendingUp : TrendingDown;
  const color = positive ? "text-emerald-400" : "text-rose-400";

  return (
    <motion.div
      key={`${label}-${valueNok}`}
      initial={reduceMotion ? false : { opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
      className="flex flex-col gap-0.5"
    >
      <span className="text-[11px] font-medium uppercase tracking-wide text-slate-500">
        {label}
      </span>
      <div className="flex items-center gap-1.5">
        <Icon className={`h-4 w-4 shrink-0 ${color}`} aria-hidden />
        <span
          className={`text-lg font-bold tabular-nums tracking-tight ${color}`}
          aria-label={`${periodDescription}: ${formatSignedNok(valueNok)}`}
        >
          {formatSignedNok(valueNok)}
        </span>
      </div>
    </motion.div>
  );
}
