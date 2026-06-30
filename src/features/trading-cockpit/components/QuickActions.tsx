"use client";

import * as React from "react";
import { useTranslations } from "next-intl";
import { Play, Pause, History } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/shared/ui/button";
import { BUTTON } from "@/lib/design/tokens";

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

  return (
    <div className={cn("flex flex-wrap gap-2", className)}>
      <Button
        className={cn(BUTTON.primary, "rounded-xl")}
        onClick={() => onStartRobot?.()}
      >
        <Play className="w-4 h-4" />
        {t("cockpit.quickActions.startRobot")}
      </Button>
      <Button
        variant="secondary"
        className={cn(BUTTON.secondary, "rounded-xl")}
        onClick={() => onPauseAll?.()}
      >
        <Pause className="w-4 h-4" />
        {t("cockpit.quickActions.pauseAll")}
      </Button>
      <Button
        variant="outline"
        className={cn(BUTTON.ghost, "rounded-xl")}
        onClick={() => onViewHistory?.()}
      >
        <History className="w-4 h-4" />
        {t("cockpit.quickActions.viewHistory")}
      </Button>
    </div>
  );
}
