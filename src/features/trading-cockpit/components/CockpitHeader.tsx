"use client";

import * as React from "react";
import { useTranslations } from "next-intl";
import { Lock } from "lucide-react";
import { cn } from "@/lib/utils";
import { Switch } from "@/shared/ui/switch";
import { ModeBadge } from "./ModeBadge";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/shared/ui/tooltip";
import type { CockpitMode } from "@/features/trading-cockpit/types";

interface CockpitHeaderProps {
  mode: CockpitMode;
  canUseLive: boolean;
  onModeChange: (mode: CockpitMode) => void;
  className?: string;
}

export function CockpitHeader({
  mode,
  canUseLive,
  onModeChange,
  className,
}: CockpitHeaderProps) {
  const t = useTranslations("trading");
  const isLive = mode === "live";

  return (
    <header
      data-testid="cockpit-header"
      className={cn("flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between", className)}
    >
      <div className="flex items-center gap-3">
        <h1 className="text-2xl font-bold text-white">{t("cockpit.header.title")}</h1>
        <ModeBadge mode={mode} />
      </div>

      <TooltipProvider delayDuration={100}>
        <div className="flex items-center gap-3">
          <span
            className={cn(
              "text-sm font-medium",
              isLive ? "text-gray-400" : "text-white",
            )}
          >
            {t("cockpit.mode.paperShort")}
          </span>

          {!canUseLive ? (
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="flex items-center gap-2 rounded-full bg-white/[0.05] px-3 py-1.5 border border-white/[0.08]">
                  <Lock className="w-3.5 h-3.5 text-amber-400" />
                  <span className="text-xs text-gray-400">{t("cockpit.mode.locked")}</span>
                </div>
              </TooltipTrigger>
              <TooltipContent side="bottom">
                <p className="max-w-xs text-xs">{t("cockpit.mode.lockedTooltip")}</p>
              </TooltipContent>
            </Tooltip>
          ) : (
            <Switch
              checked={isLive}
              onCheckedChange={(checked) => onModeChange(checked ? "live" : "paper")}
              aria-label={t("toggleAria")}
            />
          )}

          <span
            className={cn(
              "text-sm font-medium",
              isLive ? "text-white" : "text-gray-400",
            )}
          >
            {t("cockpit.mode.liveShort")}
          </span>
        </div>
      </TooltipProvider>
    </header>
  );
}
