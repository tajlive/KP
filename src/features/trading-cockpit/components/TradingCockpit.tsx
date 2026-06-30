"use client";

import * as React from "react";
import { useTranslations } from "next-intl";
import { AlertTriangle, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/shared/ui/button";
import { CockpitHeader } from "./CockpitHeader";
import { CockpitTabs } from "./CockpitTabs";
import { Overview } from "./Overview";
import { SessionList } from "./SessionList";
import { TradesTab } from "./trades/TradesTab";
import { AnalysisTab } from "./analysis/AnalysisTab";
import { useCockpit } from "@/features/trading-cockpit/hooks/useCockpit";
import { SURFACE } from "@/lib/design/tokens";

export function TradingCockpit({ className }: { className?: string }) {
  const t = useTranslations("trading");
  const {
    mode,
    tab,
    metrics,
    sessions,
    statusCounts,
    canUseLive,
    isLoading,
    error,
    setMode,
    setTab,
    refresh,
    loadMoreSessions,
    hasMoreSessions,
  } = useCockpit();

  if (isLoading) {
    return (
      <div
        className={cn(
          SURFACE.BG_CARD,
          "border-white/[0.06] rounded-2xl p-12 flex flex-col items-center justify-center gap-3",
          className,
        )}
      >
        <Loader2 className="w-8 h-8 animate-spin text-brand-500" />
        <p className="text-sm text-gray-400">{t("cockpit.loading")}</p>
      </div>
    );
  }

  if (error) {
    return (
      <div
        className={cn(
          SURFACE.BG_CARD,
          "border-white/[0.06] rounded-2xl p-8 flex flex-col items-center justify-center gap-3 text-center",
          className,
        )}
      >
        <AlertTriangle className="w-8 h-8 text-amber-400" />
        <div>
          <p className="text-white font-medium">{t("cockpit.error.title")}</p>
          <p className="text-sm text-gray-400 mt-1">{error.message}</p>
        </div>
        <Button variant="secondary" className="rounded-xl" onClick={refresh}>
          {t("cockpit.error.retry")}
        </Button>
      </div>
    );
  }

  return (
    <div className={cn("space-y-6", className)}>
      <CockpitHeader
        mode={mode}
        canUseLive={canUseLive}
        onModeChange={setMode}
      />

      <CockpitTabs activeTab={tab} onTabChange={setTab} />

      {tab === "overview" && (
        <Overview
          metrics={metrics}
          sessions={sessions}
          statusCounts={statusCounts}
          hasMoreSessions={hasMoreSessions}
          onLoadMoreSessions={loadMoreSessions}
          onStartRobot={() => window.alert(t("cockpit.quickActions.startRobot"))}
          onPauseAll={() => window.alert(t("cockpit.quickActions.pauseAll"))}
          onViewHistory={() => window.alert(t("cockpit.quickActions.viewHistory"))}
        />
      )}

      {tab === "trades" && <TradesTab />}

      {tab === "analysis" && <AnalysisTab />}
    </div>
  );
}
