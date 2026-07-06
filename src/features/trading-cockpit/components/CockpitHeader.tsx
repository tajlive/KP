"use client";

import * as React from "react";
import { useTranslations } from "next-intl";
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
      className={cn(
        "flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between",
        className,
      )}
    >
      <div className="flex items-center gap-3">
        <h1 className="text-2xl font-bold text-kp-text-primary">
          {t("cockpit.header.title")}
        </h1>
        <ModeBadge mode={mode} />
      </div>

      <TooltipProvider delayDuration={100}>
        <div className="flex flex-wrap items-center gap-3">
          <span className="text-sm font-medium text-kp-text-secondary">
            {t("cockpit.mode.label", {
              mode: isLive ? t("cockpit.mode.live") : t("cockpit.mode.paper"),
            })}
          </span>

          <div className="flex items-center gap-3">
            <span
              className={cn(
                "text-sm font-medium",
                isLive ? "text-kp-text-secondary" : "text-kp-text-primary",
              )}
            >
              {t("cockpit.mode.paperShort")}
            </span>

            <Tooltip>
              <TooltipTrigger asChild>
                <span className="inline-flex items-center">
                  <Switch
                    checked={isLive}
                    disabled={!canUseLive}
                    onCheckedChange={(checked) =>
                      onModeChange(checked ? "live" : "paper")
                    }
                    aria-label={t("toggleAria")}
                  />
                </span>
              </TooltipTrigger>
              {!canUseLive && (
                <TooltipContent side="bottom">
                  <p className="max-w-xs text-xs">
                    {t("cockpit.mode.lockedTooltip")}
                  </p>
                </TooltipContent>
              )}
            </Tooltip>

            <span
              className={cn(
                "text-sm font-medium",
                isLive ? "text-kp-text-primary" : "text-kp-text-secondary",
              )}
            >
              {t("cockpit.mode.liveShort")}
            </span>
          </div>

          {!canUseLive && (
            <span className="text-xs text-kp-text-muted">
              {t("cockpit.mode.lockedInline")}
            </span>
          )}
        </div>
      </TooltipProvider>
    </header>
  );
}
