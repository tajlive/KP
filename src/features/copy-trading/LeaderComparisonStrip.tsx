"use client";

import { motion, useReducedMotion } from "framer-motion";

type LeaderComparisonStripProps = {
  pnl30: number;
  pnl90: number;
  caption: string;
};

/**
 * Visuell sammenligning 30d vs 90d — ikke en tidslinje (ærlig mot bruker).
 */
export function LeaderComparisonStrip({
  pnl30,
  pnl90,
  caption,
}: LeaderComparisonStripProps) {
  const reduceMotion = useReducedMotion();
  const a = Math.abs(pnl30);
  const b = Math.abs(pnl90);
  const max = Math.max(a, b, 1);
  const w30 = Math.round((a / max) * 100);
  const w90 = Math.round((b / max) * 100);

  return (
    <div className="space-y-1.5" aria-hidden>
      <p className="text-[10px] text-slate-500 leading-snug">{caption}</p>
      <div className="flex flex-col gap-1">
        <div className="flex items-center gap-2">
          <span className="w-8 shrink-0 text-[10px] text-slate-500">30d</span>
          <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-slate-800">
            <motion.div
              className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-blue-500"
              initial={reduceMotion ? false : { width: 0 }}
              animate={{ width: `${w30}%` }}
              transition={{ duration: 0.5, ease: "easeOut" }}
            />
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-8 shrink-0 text-[10px] text-slate-500">90d</span>
          <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-slate-800">
            <motion.div
              className="h-full rounded-full bg-gradient-to-r from-violet-500 to-fuchsia-500"
              initial={reduceMotion ? false : { width: 0 }}
              animate={{ width: `${w90}%` }}
              transition={{ duration: 0.55, ease: "easeOut", delay: 0.05 }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
