"use client";

import * as React from "react";
import { useTranslations } from "next-intl";
import { AlertTriangle, Activity } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { Switch } from "@/shared/ui/switch";
import { Badge } from "@/shared/ui/badge";
import { Button } from "@/shared/ui/button";
import { Checkbox } from "@/shared/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/shared/ui/dialog";
import { Alert, AlertDescription, AlertTitle } from "@/shared/ui/alert";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/shared/ui/tooltip";
import { ModeBadge } from "./ModeBadge";
import type {
  CockpitMode,
  CockpitRiskStatus,
} from "@/features/trading-cockpit/types";

interface CockpitHeaderProps {
  mode: CockpitMode;
  canUseLive: boolean;
  onModeChange: (mode: CockpitMode) => void;
  riskStatus: CockpitRiskStatus;
  lastTickAt?: string | null;
  className?: string;
}

export function CockpitHeader({
  mode,
  canUseLive,
  onModeChange,
  riskStatus,
  lastTickAt = null,
  className,
}: CockpitHeaderProps) {
  const t = useTranslations("trading");
  const isLive = mode === "live";

  const [isDialogOpen, setIsDialogOpen] = React.useState(false);
  const [rememberDefault, setRememberDefault] = React.useState(true);
  const [isConfirming, setIsConfirming] = React.useState(false);

  const hasRiskBanner = React.useMemo(() => {
    return (
      riskStatus.crashed ||
      riskStatus.dailyLossLimitReached ||
      riskStatus.maxDrawdownReached
    );
  }, [riskStatus]);

  const riskMessage = React.useMemo(() => {
    if (riskStatus.crashed) return t("cockpit.riskBanner.crashed");
    if (riskStatus.dailyLossLimitReached)
      return t("cockpit.riskBanner.dailyLossLimit");
    if (riskStatus.maxDrawdownReached)
      return t("cockpit.riskBanner.maxDrawdown");
    return null;
  }, [riskStatus, t]);

  const marketDataStatus = React.useMemo(() => {
    if (!lastTickAt) {
      return {
        variant: "danger" as const,
        label: t("cockpit.marketData.stale"),
      };
    }
    const tickTime = new Date(lastTickAt).getTime();
    if (Number.isNaN(tickTime)) {
      return {
        variant: "danger" as const,
        label: t("cockpit.marketData.stale"),
      };
    }
    const minutesSince = (Date.now() - tickTime) / 1000 / 60;
    if (minutesSince > 15) {
      return { variant: "danger" as const, label: t("cockpit.marketData.stale") };
    }
    if (minutesSince > 5) {
      return {
        variant: "warning" as const,
        label: t("cockpit.marketData.delayed"),
      };
    }
    return { variant: "success" as const, label: t("cockpit.marketData.ok") };
  }, [lastTickAt, t]);

  const handleSwitchChange = React.useCallback(
    (checked: boolean) => {
      if (checked) {
        setIsDialogOpen(true);
      } else {
        onModeChange("paper");
      }
    },
    [onModeChange],
  );

  const handleOpenChange = React.useCallback((open: boolean) => {
    setIsDialogOpen(open);
    if (!open) {
      setRememberDefault(true);
    }
  }, []);

  const handleConfirm = React.useCallback(async () => {
    setIsConfirming(true);
    try {
      const res = await fetch("/api/trading/mode", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode: "live", rememberDefault }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(body.error || res.statusText);
      }
      onModeChange("live");
      setIsDialogOpen(false);
    } catch (err) {
      console.error("[CockpitHeader] failed to switch to live mode:", err);
      toast.error(
        err instanceof Error ? err.message : t("cockpit.error.description"),
      );
    } finally {
      setIsConfirming(false);
    }
  }, [onModeChange, rememberDefault, t]);

  const handleCancel = React.useCallback(() => {
    setIsDialogOpen(false);
    setRememberDefault(true);
  }, []);

  return (
    <header
      data-testid="cockpit-header"
      className={cn("flex flex-col gap-4", className)}
    >
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
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
                mode: isLive
                  ? t("cockpit.mode.live")
                  : t("cockpit.mode.paper"),
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
                      onCheckedChange={handleSwitchChange}
                      aria-label={t("toggleAria")}
                      data-testid="mode-switch"
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
      </div>

      <Dialog open={isDialogOpen} onOpenChange={handleOpenChange}>
        <DialogContent data-testid="live-mode-dialog">
          <DialogHeader>
            <DialogTitle>{t("cockpit.liveModeConfirm.title")}</DialogTitle>
            <DialogDescription>
              {t("cockpit.liveModeConfirm.description")}
            </DialogDescription>
          </DialogHeader>
          <div className="flex items-center gap-3 py-2">
            <Checkbox
              id="remember-default"
              checked={rememberDefault}
              onCheckedChange={(checked) =>
                setRememberDefault(Boolean(checked))
              }
              data-testid="remember-default-checkbox"
            />
            <label
              htmlFor="remember-default"
              className="text-sm text-kp-text-secondary"
            >
              {t("cockpit.liveModeConfirm.rememberDefault")}
            </label>
          </div>
          <DialogFooter>
            <Button
              variant="secondary"
              onClick={handleCancel}
              disabled={isConfirming}
              data-testid="live-mode-cancel"
            >
              {t("cockpit.liveModeConfirm.cancel")}
            </Button>
            <Button
              onClick={handleConfirm}
              loading={isConfirming}
              disabled={isConfirming}
              data-testid="live-mode-confirm"
            >
              {t("cockpit.liveModeConfirm.confirm")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <div className="flex flex-wrap items-center gap-3">
        <Badge
          variant={marketDataStatus.variant}
          icon={<Activity className="size-3" />}
          data-testid="market-data-pill"
          aria-label={t("cockpit.marketData.aria", {
            status: marketDataStatus.label,
          })}
        >
          {marketDataStatus.label}
        </Badge>
      </div>

      {hasRiskBanner && riskMessage && (
        <Alert variant="destructive" data-testid="risk-banner">
          <AlertTriangle className="size-4" />
          <AlertTitle>{t("cockpit.riskBanner.title")}</AlertTitle>
          <AlertDescription>{riskMessage}</AlertDescription>
        </Alert>
      )}
    </header>
  );
}
