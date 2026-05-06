import { RADIUS, SHADOW } from "@/lib/design/tokens";
import type { ComponentType } from "react";

interface KpiCardProps {
  icon: ComponentType<{ className?: string }>;
  label: string;
  value: string;
  positive: boolean;
}

export function KpiCard({ icon: Icon, label, value, positive }: KpiCardProps) {
  return (
    <div
      className={`relative overflow-hidden border border-slate-800/80 bg-gradient-to-br from-slate-900/90 to-slate-950/90 p-5 ${RADIUS.card} ${SHADOW.card}`}
    >
      <div
        aria-hidden
        className={`absolute inset-x-0 top-0 h-0.5 ${positive ? "bg-emerald-400/80" : "bg-rose-400/80"}`}
      />
      <div className="flex items-center gap-2 text-slate-500">
        <Icon
          className={`h-4 w-4 ${positive ? "text-emerald-400/90" : "text-rose-400/90"}`}
        />
        <span className="text-xs font-medium uppercase tracking-wide">
          {label}
        </span>
      </div>
      <p
        className={`mt-3 font-mono text-2xl font-bold tracking-tight ${positive ? "text-white" : "text-rose-100"}`}
      >
        {value}
      </p>
    </div>
  );
}
