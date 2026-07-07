"use client";

import * as React from "react";
import { useLocale, useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { Play, Pause, History, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { Button } from "@/shared/ui/button";
import { useCockpit } from "../hooks/useCockpit";

interface QuickActionsProps {
  className?: string;
}

export function QuickActions({ className }: QuickActionsProps) {
  const t = useTranslations("trading");
  const locale = useLocale();
  const router = useRouter();
  const { mode, statusCounts, refresh } = useCockpit();

  const [isStarting, setIsStarting] = React.useState(false);
  const [isToggling, setIsToggling] = React.useState(false);

  const activeSessionsCount = statusCounts.active ?? 0;
  const pausedSessionsCount = statusCounts.paused ?? 0;
  const hasActiveSessions = activeSessionsCount > 0;
  const hasPausedSessions = pausedSessionsCount > 0;

  const handleStartRobot = React.useCallback(async () => {
    setIsStarting(true);
    try {
      const res = await fetch("/api/trading/sessions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode }),
      });

      const body = await res.json().catch(() => ({}));

      if (!res.ok) {
        throw new Error(body.error || res.statusText);
      }

      if (body.existing) {
        toast.info(t("cockpit.toast.startRobotExisting"));
      } else {
        toast.success(t("cockpit.toast.startRobotSuccess"));
      }

      await refresh();
    } catch (err) {
      console.error("[QuickActions] start robot failed:", err);
      toast.error(
        err instanceof Error ? err.message : t("cockpit.quickActions.error"),
      );
    } finally {
      setIsStarting(false);
    }
  }, [mode, refresh, t]);

  const toggleAction = hasActiveSessions
    ? "pause"
    : hasPausedSessions
      ? "resume"
      : null;

  const handlePauseAll = React.useCallback(async () => {
    if (!toggleAction) return;

    setIsToggling(true);
    try {
      const res = await fetch("/api/trading/sessions", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ all: true, mode, action: toggleAction }),
      });

      const body = await res.json().catch(() => ({}));

      if (!res.ok) {
        throw new Error(body.error || res.statusText);
      }

      toast.success(
        t(
          toggleAction === "pause"
            ? "cockpit.toast.pauseAllSuccess"
            : "cockpit.toast.resumeAllSuccess",
        ),
      );
      await refresh();
    } catch (err) {
      console.error("[QuickActions] pause/resume all failed:", err);
      toast.error(
        err instanceof Error ? err.message : t("cockpit.quickActions.error"),
      );
    } finally {
      setIsToggling(false);
    }
  }, [mode, refresh, t, toggleAction]);

  const handleViewHistory = React.useCallback(() => {
    router.push(`/${locale}/handelshistorikk`);
  }, [locale, router]);

  return (
    <div className={cn("flex flex-wrap gap-2", className)}>
      <Button
        className="rounded-xl min-h-12"
        onClick={handleStartRobot}
        disabled={isStarting}
        loading={isStarting}
      >
        <Play className="w-4 h-4" />
        {t("cockpit.quickActions.startRobot")}
      </Button>
      <Button
        variant="secondary"
        className="rounded-xl min-h-12"
        disabled={!toggleAction || isToggling}
        loading={isToggling}
        onClick={handlePauseAll}
      >
        {isToggling ? (
          <Loader2 className="w-4 h-4 animate-spin" />
        ) : (
          <Pause className="w-4 h-4" />
        )}
        {t(
          toggleAction === "resume"
            ? "cockpit.quickActions.resumeAll"
            : "cockpit.quickActions.pauseAll",
        )}
      </Button>
      <Button
        variant="ghost"
        className="rounded-xl min-h-12 text-kp-text-secondary hover:text-kp-text-primary hover:bg-kp-bg-secondary"
        onClick={handleViewHistory}
      >
        <History className="w-4 h-4" />
        {t("cockpit.quickActions.viewHistory")}
      </Button>
    </div>
  );
}
