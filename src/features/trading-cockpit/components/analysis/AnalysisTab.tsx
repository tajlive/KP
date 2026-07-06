"use client";

import * as React from "react";
import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils";
import { useCockpit } from "@/features/trading-cockpit/hooks/useCockpit";
import { Skeleton } from "@/shared/ui/skeleton";
import { EmptyState } from "@/shared/ui/EmptyState";
import { Alert, AlertDescription, AlertTitle } from "@/shared/ui/alert";
import { BarChart3, AlertTriangle } from "lucide-react";
import { PeriodSelector } from "./PeriodSelector";
import { AnalyticsStatGrid } from "./AnalyticsStatGrid";
import { PnLChart } from "./PnLChart";
import { SymbolDistribution } from "./SymbolDistribution";

interface AnalysisTabProps {
  className?: string;
}

export function AnalysisTab({ className }: AnalysisTabProps) {
  const t = useTranslations("trading");
  const { analytics, filters, setFilters, isLoadingTrades, tradesError } =
    useCockpit();

  const handlePeriodChange = React.useCallback(
    (value: typeof filters.dateRange) => {
      setFilters({ dateRange: value });
    },
    [setFilters],
  );

  if (isLoadingTrades) {
    return (
      <div className={cn("space-y-6", className)}>
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <Skeleton variant="heading" width={160} />
            <Skeleton variant="text" width={240} />
          </div>
          <Skeleton variant="badge" width={120} height={36} />
        </div>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
          {Array.from({ length: 10 }).map((_, i) => (
            <Skeleton key={i} variant="kpi" />
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <Skeleton variant="chart" height={320} />
          <Skeleton variant="chart" height={320} />
        </div>
      </div>
    );
  }

  if (tradesError) {
    return (
      <div className={cn("space-y-6", className)}>
        <Alert
          variant="destructive"
          className={cn(
            "bg-kp-bg-card border-rose-500/30 text-white rounded-2xl",
          )}
        >
          <AlertTriangle className="h-4 w-4 text-rose-400" />
          <AlertTitle>{t("cockpit.error.title")}</AlertTitle>
          <AlertDescription className="text-gray-300">
            {tradesError.message || t("cockpit.error.analyticsFailed")}
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  if (!analytics) {
    return (
      <div className={cn("space-y-6", className)}>
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-white">
              {t("cockpit.analysis.title")}
            </h2>
            <p className="text-sm text-gray-400">
              {t("cockpit.analysis.description")}
            </p>
          </div>
          <PeriodSelector
            value={filters.dateRange}
            onChange={handlePeriodChange}
          />
        </div>
        <EmptyState
          icon={<BarChart3 className="w-10 h-10 text-gray-500" />}
          title={t("cockpit.analysis.empty.title")}
          description={t("cockpit.analysis.empty.description")}
          className="bg-kp-bg-card border border-white/[0.06] rounded-2xl py-12"
        />
      </div>
    );
  }

  return (
    <div className={cn("space-y-6", className)}>
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-white">
            {t("cockpit.analysis.title")}
          </h2>
          <p className="text-sm text-gray-400">
            {t("cockpit.analysis.description")}
          </p>
        </div>
        <PeriodSelector
          value={filters.dateRange}
          onChange={handlePeriodChange}
        />
      </div>

      <AnalyticsStatGrid analytics={analytics} />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <PnLChart data={analytics.trades_by_day} />
        <SymbolDistribution data={analytics.trades_by_symbol} />
      </div>
    </div>
  );
}
