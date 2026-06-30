"use client";

import * as React from "react";
import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils";
import { SEMANTIC_COLORS, SURFACE } from "@/lib/design/tokens";

interface StatusSummaryProps {
  statusCounts: Record<string, number>;
  className?: string;
}

const STATUS_ORDER = ["active", "paused", "stopped", "crashed"] as const;

export function StatusSummary({ statusCounts, className }: StatusSummaryProps) {
  const t = useTranslations("trading");

  return (
    <div className={cn("grid grid-cols-2 sm:grid-cols-4 gap-3", className)}>
      {STATUS_ORDER.map((status) => {
        const count = statusCounts[status] ?? 0;
        return (
          <div
            key={status}
            className={cn(
              SURFACE.BG_CARD,
              "border-white/[0.06] rounded-2xl p-4 flex items-center justify-between",
            )}
          >
            <span className="text-sm text-gray-400">
              {t(`cockpit.sessions.status.${status}`)}
            </span>
            <span
              className="text-lg font-semibold tabular-nums"
              style={{
                color:
                  status === "crashed"
                    ? SEMANTIC_COLORS.negative
                    : status === "active"
                      ? SEMANTIC_COLORS.positive
                      : SEMANTIC_COLORS.textDarkPrimary,
              }}
            >
              {count}
            </span>
          </div>
        );
      })}
    </div>
  );
}
