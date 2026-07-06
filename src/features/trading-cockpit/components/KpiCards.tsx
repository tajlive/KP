"use client";

import * as React from "react";
import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils";
import { Card, CardContent } from "@/shared/ui/card";
import { AnimatedNumber } from "@/shared/ui/AnimatedNumber";
import type {
  DashboardMetrics,
  TradingAnalytics,
} from "@/features/trading-cockpit/types";

interface KpiCardsProps {
  metrics: DashboardMetrics | null;
  analytics?: TradingAnalytics | null;
  className?: string;
}

interface KpiItem {
  key: string;
  label: string;
  value: number | null;
  prefix?: string;
  suffix?: string;
  decimals?: number;
  valueClassName?: string;
}

export function KpiCards({ metrics, analytics, className }: KpiCardsProps) {
  const t = useTranslations("trading");

  const safeMetrics = metrics ?? {
    totalPnl: 0,
    totalTrades: 0,
    winRate: 0,
    totalCapital: 0,
    startingCapital: 0,
    winningTrades: 0,
    losingTrades: 0,
    sessionCount: 0,
    recentSessions: [],
  };

  const kpis: KpiItem[] = [
    {
      key: "totalPnl",
      label: t("cockpit.kpi.totalPnl"),
      value: safeMetrics.totalPnl,
      prefix: "kr ",
      decimals: 0,
      valueClassName:
        safeMetrics.totalPnl >= 0 ? "text-kp-success" : "text-kp-danger",
    },
    {
      key: "winRate",
      label: t("cockpit.kpi.winRate"),
      value: safeMetrics.winRate * 100,
      suffix: "%",
      decimals: 1,
    },
    {
      key: "totalTrades",
      label: t("cockpit.kpi.totalTrades"),
      value: safeMetrics.totalTrades,
      decimals: 0,
    },
    {
      key: "totalCapital",
      label: t("cockpit.kpi.totalCapital"),
      value: safeMetrics.totalCapital,
      prefix: "kr ",
      decimals: 0,
    },
    {
      key: "maxDrawdown",
      label: t("cockpit.kpi.maxDrawdown"),
      value: analytics?.max_drawdown_pct ?? null,
      suffix: "%",
      decimals: 2,
      valueClassName: "text-kp-danger",
    },
    {
      key: "bestPair",
      label: t("cockpit.kpi.bestPair"),
      value: null,
    },
  ];

  return (
    <div
      className={cn(
        "grid grid-cols-2 gap-2 sm:gap-3 sm:grid-cols-3 lg:grid-cols-6",
        className,
      )}
    >
      {kpis.map((kpi) => (
        <Card
          key={kpi.key}
          className="bg-kp-bg-card border-kp-border rounded-2xl p-0"
        >
          <CardContent className="p-3 sm:p-4">
            <p className="text-xs font-medium text-kp-text-secondary mb-1">
              {kpi.label}
            </p>
            {kpi.key === "bestPair" ? (
              <p className="text-lg font-semibold text-kp-text-primary truncate">
                {analytics?.best_pair ?? "—"}
              </p>
            ) : (
              <p
                className={cn(
                  "text-lg font-semibold tabular-nums text-kp-text-primary",
                  kpi.valueClassName,
                )}
              >
                {kpi.value === null ? (
                  "—"
                ) : (
                  <AnimatedNumber
                    value={kpi.value}
                    prefix={kpi.prefix}
                    suffix={kpi.suffix}
                    decimals={kpi.decimals}
                    duration={500}
                  />
                )}
              </p>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
