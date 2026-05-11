"use client";
import { cn } from "@/lib/utils";
import { useTranslations } from "next-intl";

interface ConfidenceBadgeProps {
  value: number;
}

export function ConfidenceBadge({ value }: ConfidenceBadgeProps) {
  const t = useTranslations("trading.signalFeed");
  let colorClass = "text-kp-text-muted";
  if (value >= 80) colorClass = "text-kp-success";
  else if (value >= 60) colorClass = "text-kp-warning";
  else if (value >= 40) colorClass = "text-kp-warning";
  else colorClass = "text-kp-danger";

  return (
    <div
      className={cn(
        "text-xs font-bold tabular-nums tracking-tight",
        colorClass,
      )}
    >
      {value.toFixed(0)}%
    </div>
  );
}
