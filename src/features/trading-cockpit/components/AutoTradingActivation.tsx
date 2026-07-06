"use client";

import * as React from "react";
import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils";
import { Button } from "@/shared/ui/button";
import { Loader2, Play, TriangleAlert } from "lucide-react";
import type { CockpitInitialData } from "@/features/trading-cockpit/types";

interface AutoTradingActivationProps {
  autoTradeSettings: CockpitInitialData["autoTradeSettings"];
  isLoading: boolean;
  onActivate: () => void;
  className?: string;
}

export function AutoTradingActivation({
  autoTradeSettings,
  isLoading,
  onActivate,
  className,
}: AutoTradingActivationProps) {
  const t = useTranslations("trading");

  const hasSettings = autoTradeSettings !== null;
  const isEnabled = Boolean(autoTradeSettings?.auto_trading_enabled);

  if (hasSettings && isEnabled) return null;

  return (
    <div
      data-testid="auto-trading-activation"
      className={cn(
        "bg-kp-bg-card border border-white/[0.06] rounded-2xl p-5 flex flex-col sm:flex-row sm:items-center gap-4",
        className,
      )}
    >
      <div className="flex items-start gap-3 flex-1">
        <div
          className={cn(
            "flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center",
            hasSettings ? "bg-amber-500/10" : "bg-blue-500/10",
          )}
        >
          {hasSettings ? (
            <TriangleAlert className="w-5 h-5 text-amber-400" />
          ) : (
            <Play className="w-5 h-5 text-blue-400" />
          )}
        </div>
        <div>
          <h3 className="text-white font-semibold">
            {hasSettings
              ? t("cockpit.activation.pausedTitle")
              : t("cockpit.activation.missingTitle")}
          </h3>
          <p className="text-sm text-gray-400 mt-1">
            {hasSettings
              ? t("cockpit.activation.pausedDescription")
              : t("cockpit.activation.missingDescription")}
          </p>
        </div>
      </div>

      <Button
        className={cn(
          "rounded-xl whitespace-nowrap",
          hasSettings
            ? "bg-amber-500 hover:bg-amber-600 text-white"
            : "bg-blue-500 hover:bg-blue-600 text-white",
        )}
        onClick={onActivate}
        disabled={isLoading}
        data-testid="auto-trading-activate-button"
      >
        {isLoading ? (
          <Loader2 className="w-4 h-4 animate-spin mr-2" />
        ) : (
          <Play className="w-4 h-4 mr-2" />
        )}
        {t("cockpit.activation.activateButton")}
      </Button>
    </div>
  );
}
