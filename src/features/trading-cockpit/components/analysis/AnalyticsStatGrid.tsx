"use client";

import * as React from "react";
import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils";
import { Card, CardContent } from "@/shared/ui/card";
import { AnimatedNumber } from "@/shared/ui/AnimatedNumber";
import { SURFACE, SEMANTIC_COLORS } from "@/lib/design/tokens";
import type { TradingAnalytics } from "@/features/trading-cockpit/types";

interface StatItem {
  key: string;
  label: string;
  value: number | null;
  prefix?: string;
  suffix?: string;
  decimals?: number;
  valueClassName?: string;
  displayText?: string | null;
}

interface AnalyticsStatGridProps {
  analytics: TradingAnalytics | null;
  className?: string;
}

export function AnalyticsStatGrid({
  analytics,
  className,
}: AnalyticsStatGridProps) {
  const t = useTranslations("trading");

  const safeAnalytics = analytics ?? {
    total_trades: 0,
    winning_trades: 0,
    losing_trades: 0,
    win_rate: null,
    total_pnl: 0,
    total_fees: 0,
    starting_capital: 0,
    max_drawdown_pct: null,
    profit_factor: null,
    best_pair: null,
    best_pair_pnl: null,
    worst_pair: null,
    worst_pair_pnl: null,
    best_session_id: null,
    best_session_pnl: null,
    worst_session_id: null,
    worst_session_pnl: null,
    trades_by_day: [],
    trades_by_symbol: [],
  };

  const stats: StatItem[] = [
    {
      key: "totalTrades",
      label: t("cockpit.analysis.stats.totalTrades"),
      value: safeAnalytics.total_trades,
      decimals: 0,
    },
    {
      key: "winRate",
      label: t("cockpit.analysis.stats.winRate"),
      value:
        safeAnalytics.win_rate === null ? null : safeAnalytics.win_rate * 100,
      suffix: "%",
      decimals: 1,
    },
    {
      key: "totalPnl",
      label: t("cockpit.analysis.stats.totalPnl"),
      value: safeAnalytics.total_pnl,
      prefix: "kr ",
      decimals: 0,
      valueClassName:
        safeAnalytics.total_pnl >= 0 ? "text-emerald-400" : "text-rose-400",
    },
    {
      key: "totalFees",
      label: t("cockpit.analysis.stats.totalFees"),
      value: safeAnalytics.total_fees,
      prefix: "kr ",
      decimals: 0,
    },
    {
      key: "profitFactor",
      label: t("cockpit.analysis.stats.profitFactor"),
      value: safeAnalytics.profit_factor,
      decimals: 2,
    },
    {
      key: "maxDrawdown",
      label: t("cockpit.analysis.stats.maxDrawdown"),
      value:
        safeAnalytics.max_drawdown_pct === null
          ? null
          : safeAnalytics.max_drawdown_pct * 100,
      suffix: "%",
      decimals: 2,
      valueClassName: "text-rose-400",
    },
    {
      key: "bestPair",
      label: t("cockpit.analysis.stats.bestPair"),
      value: safeAnalytics.best_pair_pnl,
      prefix: "kr ",
      decimals: 0,
      displayText: safeAnalytics.best_pair,
      valueClassName: "text-emerald-400",
    },
    {
      key: "worstPair",
      label: t("cockpit.analysis.stats.worstPair"),
      value: safeAnalytics.worst_pair_pnl,
      prefix: "kr ",
      decimals: 0,
      displayText: safeAnalytics.worst_pair,
      valueClassName: "text-rose-400",
    },
    {
      key: "bestSession",
      label: t("cockpit.analysis.stats.bestSession"),
      value: safeAnalytics.best_session_pnl,
      prefix: "kr ",
      decimals: 0,
      displayText: safeAnalytics.best_session_id,
      valueClassName: "text-emerald-400",
    },
    {
      key: "worstSession",
      label: t("cockpit.analysis.stats.worstSession"),
      value: safeAnalytics.worst_session_pnl,
      prefix: "kr ",
      decimals: 0,
      displayText: safeAnalytics.worst_session_id,
      valueClassName: "text-rose-400",
    },
  ];

  return (
    <div
      className={cn(
        "grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5",
        className,
      )}
      data-testid="analytics-stat-grid"
    >
      {stats.map((stat) => (
        <Card
          key={stat.key}
          className={cn(
            SURFACE.BG_CARD,
            "border-white/[0.06] p-0 rounded-2xl",
          )}
        >
          <CardContent className="p-4">
            <p className="text-xs font-medium text-gray-400 mb-1 truncate">
              {stat.label}
            </p>
            {stat.displayText !== undefined ? (
              <div className="space-y-0.5">
                <p
                  className="text-base font-semibold truncate"
                  style={{ color: SEMANTIC_COLORS.textDarkPrimary }}
                >
                  {stat.displayText ?? "—"}
                </p>
                {stat.value !== null ? (
                  <p
                    className={cn(
                      "text-sm font-medium tabular-nums",
                      stat.valueClassName,
                    )}
                  >
                    <AnimatedNumber
                      value={stat.value}
                      prefix={stat.prefix}
                      suffix={stat.suffix}
                      decimals={stat.decimals}
                      duration={500}
                    />
                  </p>
                ) : null}
              </div>
            ) : (
              <p
                className={cn(
                  "text-lg font-semibold tabular-nums",
                  stat.valueClassName,
                )}
              >
                {stat.value === null ? (
                  "—"
                ) : (
                  <AnimatedNumber
                    value={stat.value}
                    prefix={stat.prefix}
                    suffix={stat.suffix}
                    decimals={stat.decimals}
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
