"use client";

import * as React from "react";
import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils";

interface StatusSummaryProps {
  statusCounts: Record<string, number>;
  className?: string;
}

const STATUS_ORDER = ["active", "paused", "stopped", "crashed"] as const;

const STATUS_COLOR_CLASS: Record<typeof STATUS_ORDER[number], string> = {
  active: "text-kp-success",
  paused: "text-kp-warning",
  stopped: "text-kp-text-secondary",
  crashed: "text-kp-danger",
};

export function StatusSummary({ statusCounts, className }: StatusSummaryProps) {
  const t = useTranslations("trading");

  return (
    <div className={cn("grid grid-cols-2 sm:grid-cols-4 gap-3", className)}>
      {STATUS_ORDER.map((status) => {
        const count = statusCounts[status] ?? 0;
        return (
          <div
            key={status}
            className="bg-kp-bg-card border-kp-border rounded-2xl p-4 flex items-center justify-between"
          >
            <span className="text-sm text-kp-text-secondary">
              {t(`cockpit.sessions.status.${status}`)}
            </span>
            <span
              className={cn(
                "text-lg font-semibold tabular-nums",
                STATUS_COLOR_CLASS[status],
              )}
            >
              {count}
            </span>
          </div>
        );
      })}
    </div>
  );
}
