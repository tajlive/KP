"use client";

import { useEffect, useMemo, useState } from "react";
import { useLocale } from "next-intl";
import { cn } from "@/lib/utils";

type Timestamp = string | number | Date | null | undefined;

interface DataFreshnessBadgeProps {
  timestamp: Timestamp;
  variant?: "pnl" | "positions";
  warnThresholdMs?: number;
  errorThresholdMs?: number;
  label?: string;
  className?: string;
}

const VARIANT_DEFAULTS = {
  pnl: { warn: 5 * 60 * 1000, error: 15 * 60 * 1000 },
  positions: { warn: 1 * 60 * 1000, error: 5 * 60 * 1000 },
} as const;

export function DataFreshnessBadge({
  timestamp,
  variant = "pnl",
  warnThresholdMs,
  errorThresholdMs,
  label,
  className,
}: DataFreshnessBadgeProps) {
  const locale = useLocale();
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 10000);
    return () => clearInterval(id);
  }, []);

  const date = useMemo(() => (timestamp ? new Date(timestamp) : null), [timestamp]);
  const ageMs = useMemo(() => (date ? now - date.getTime() : null), [date, now]);

  const thresholds = VARIANT_DEFAULTS[variant];
  const warnMs = warnThresholdMs ?? thresholds.warn;
  const errorMs = errorThresholdMs ?? thresholds.error;

  const status = useMemo(() => {
    if (ageMs == null) return "unknown";
    if (ageMs >= errorMs) return "error";
    if (ageMs >= warnMs) return "warn";
    return "fresh";
  }, [ageMs, warnMs, errorMs]);

  const labelText = label ?? (locale === "no" ? "Sist oppdatert:" : "Last updated:");

  const timeText = useMemo(() => {
    if (!date) return "—";
    return new Intl.DateTimeFormat(locale === "no" ? "nb-NO" : "en-GB", {
      hour: "2-digit",
      minute: "2-digit",
    }).format(date);
  }, [date, locale]);

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 text-xs tabular-nums",
        status === "fresh" && "text-slate-500 dark:text-slate-400",
        status === "warn" && "text-amber-600 dark:text-amber-400",
        status === "error" && "text-red-600 dark:text-red-400",
        status === "unknown" && "text-slate-400 dark:text-slate-500",
        className,
      )}
    >
      <span
        className={cn(
          "inline-block h-1.5 w-1.5 rounded-full",
          status === "fresh" && "bg-emerald-500",
          status === "warn" && "bg-amber-500",
          status === "error" && "bg-red-500",
          status === "unknown" && "bg-slate-400",
        )}
      />
      <span>{labelText}</span>
      <span>{timeText}</span>
    </span>
  );
}
