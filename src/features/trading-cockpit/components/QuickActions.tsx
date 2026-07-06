"use client";

import * as React from "react";
import { useTranslations } from "next-intl";
import { Play, Pause, History } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/shared/ui/button";
import { useCockpit } from "../hooks/useCockpit";

interface QuickActionsProps {
  onStartRobot?: () => void;
  onPauseAll?: () => void;
  onViewHistory?: () => void;
  className?: string;
}

export function QuickActions({
  onStartRobot,
  onPauseAll,
  onViewHistory,
  className,
}: QuickActionsProps) {
  const t = useTranslations("trading");
  const { statusCounts } = useCockpit();
  const activeSessionsCount = statusCounts.active ?? 0;
  const hasActiveSessions = activeSessionsCount > 0;

  return (
    <div className={cn("flex flex-wrap gap-2", className)}>
      <Button className="rounded-xl min-h-12" onClick={() => onStartRobot?.()}>
        <Play className="w-4 h-4" />
        {t("cockpit.quickActions.startRobot")}
      </Button>
      <Button
        variant="secondary"
        className="rounded-xl min-h-12"
        disabled={!hasActiveSessions}
        onClick={() => onPauseAll?.()}
      >
        <Pause className="w-4 h-4" />
        {t("cockpit.quickActions.pauseAll")}
      </Button>
      <Button
        variant="ghost"
        className="rounded-xl min-h-12 text-kp-text-secondary hover:text-kp-text-primary hover:bg-kp-bg-secondary"
        onClick={() => onViewHistory?.()}
      >
        <History className="w-4 h-4" />
        {t("cockpit.quickActions.viewHistory")}
      </Button>
    </div>
  );
}
