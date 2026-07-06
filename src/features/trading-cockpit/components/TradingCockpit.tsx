"use client";

import * as React from "react";
import { useTranslations } from "next-intl";
import { AlertTriangle, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { Button } from "@/shared/ui/button";
import { CockpitHeader } from "./CockpitHeader";
import { CockpitTabs } from "./CockpitTabs";
import { Overview } from "./Overview";
import { SessionList } from "./SessionList";
import { TradesTab } from "./trades/TradesTab";
import { AnalysisTab } from "./analysis/AnalysisTab";
import { useCockpit } from "@/features/trading-cockpit/hooks/useCockpit";

export function TradingCockpit({ className }: { className?: string }) {
  const t = useTranslations("trading");
  const {
    mode,
    tab,
    metrics,
    sessions,
    statusCounts,
    canUseLive,
    autoTradeSettings,
    isLoading,
    error,
    setMode,
    setTab,
    refresh,
    loadMoreSessions,
    hasMoreSessions,
  } = useCockpit();

  const [isActivating, setIsActivating] = React.useState(false);

  const handleActivateAutoTrading = React.useCallback(async () => {
    setIsActivating(true);
    try {
      const res = await fetch("/api/trading/auto-trade/activate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ risk_level: "medium" }),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({ error: res.statusText }));
        throw new Error(body.error || res.statusText);
      }

      await refresh();
      toast.success(t("cockpit.activation.success"));
    } catch (err) {
      console.error("[TradingCockpit] activate auto-trading failed:", err);
      toast.error(
        err instanceof Error ? err.message : t("cockpit.activation.error"),
      );
    } finally {
      setIsActivating(false);
    }
  }, [refresh, t]);

  if (isLoading) {
    return (
      <div
        className={cn(
          "bg-kp-bg-card border-kp-border rounded-2xl p-12 flex flex-col items-center justify-center gap-3",
          className,
        )}
      >
        <Loader2 className="w-8 h-8 animate-spin text-kp-brand" />
        <p className="text-sm text-kp-text-secondary">{t("cockpit.loading")}</p>
      </div>
    );
  }

  if (error) {
    return (
      <div
        className={cn(
          "bg-kp-bg-card border-kp-border rounded-2xl p-8 flex flex-col items-center justify-center gap-3 text-center",
          className,
        )}
      >
        <AlertTriangle className="w-8 h-8 text-kp-warning" />
        <div>
          <p className="text-kp-text-primary font-medium">{t("cockpit.error.title")}</p>
          <p className="text-sm text-kp-text-secondary mt-1">{error.message}</p>
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
          autoTradeSettings={autoTradeSettings}
          hasMoreSessions={hasMoreSessions}
          onLoadMoreSessions={loadMoreSessions}
          onStartRobot={() => window.alert(t("cockpit.quickActions.startRobot"))}
          onPauseAll={() => window.alert(t("cockpit.quickActions.pauseAll"))}
          onViewHistory={() => window.alert(t("cockpit.quickActions.viewHistory"))}
          onActivateAutoTrading={handleActivateAutoTrading}
          isActivatingAutoTrading={isActivating}
        />
      )}

      {tab === "trades" && <TradesTab />}

      {tab === "analysis" && <AnalysisTab />}
    </div>
  );
}
