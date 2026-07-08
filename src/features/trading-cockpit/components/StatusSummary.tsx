"use client";

import * as React from "react";
import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils";
import { Play, Pause, Square, AlertTriangle } from "lucide-react";

interface StatusSummaryProps {
  statusCounts: Record<string, number>;
  className?: string;
}

const STATUS_CONFIG: Record<string, { icon: React.ReactNode; color: string }> = {
  active:  { icon: <Play className="size-4" />,           color: "bg-emerald-400/10 text-emerald-400" },
  paused:  { icon: <Pause className="size-4" />,          color: "bg-amber-400/10 text-amber-400" },
  stopped: { icon: <Square className="size-4" />,         color: "bg-zinc-500/10 text-zinc-400" },
  crashed: { icon: <AlertTriangle className="size-4" />,  color: "bg-rose-400/10 text-rose-400" },
};

const STATUS_ORDER = ["active", "paused", "stopped", "crashed"] as const;

export function StatusSummary({ statusCounts, className }: StatusSummaryProps) {
  const t = useTranslations("trading");

  return (
    <div className={cn(
      "rounded-2xl border border-white/[0.06] bg-gradient-to-br from-white/[0.03] to-transparent p-4",
      className,
    )}>
      <div className="flex items-center gap-2 mb-3">
        <span className="text-[10px] font-bold uppercase tracking-widest text-zinc-500">Status</span>
      </div>
      <div className="grid grid-cols-4 gap-2">
        {STATUS_ORDER.map((status) => {
          const cfg = STATUS_CONFIG[status];
          const count = statusCounts[status] ?? 0;
          return (
            <div key={status} className="text-center">
              <div className={cn(
                "flex items-center justify-center size-9 rounded-xl mx-auto mb-1",
                cfg.color,
              )}>
                {cfg.icon}
              </div>
              <span className="text-lg font-bold text-white tabular-nums">{count}</span>
              <p className="text-[10px] text-zinc-500 mt-0.5">
                {t(`cockpit.sessions.status.${status}`)}
              </p>
            </div>
          );
        })}
      </div>
    </div>
  );
}
