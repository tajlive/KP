"use client";

import * as React from "react";
import { useLocale, useTranslations } from "next-intl";
import Link from "next/link";
import { AlertTriangle, Activity } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
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
import { usePrices } from "@/hooks/usePrices";
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
  const locale = useLocale();
  const isLive = mode === "live";
  const { prices } = usePrices();
  const btcPrice = prices["BTCUSDT"];

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
      return {
        variant: "danger" as const,
        label: t("cockpit.marketData.stale"),
      };
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
          {/* Side-tittel fjernet: TopNav viser allerede aktiv «Handel»-lenke
              i brand-farge (Task 5 — én topp-nav per skjerm). Beholder kun
              ModeBadge + modus-toggle (unik funksjonalitet). */}
          <ModeBadge mode={mode} />
        </div>

        <TooltipProvider delayDuration={100}>
          <div className="flex flex-wrap items-center gap-3">
            {/* 2026-08-10: Segmentert modusvelger erstatter bryteren — to
                tydelige 48px-knapper («Lekepenger» / «Ekte penger»). Den gamle
                bryteren med «Papir short/Live short»-etiketter var uforståelig
                for målgruppen («short» betyr noe helt annet i trading).
                Live-klikk åpner samme bekreftelsesdialog som før. */}
            <div
              role="group"
              aria-label={t("toggleAria")}
              className="flex rounded-xl border border-kp-border bg-kp-bg-card p-1"
              data-testid="mode-toggle"
            >
              <button
                type="button"
                onClick={() => handleSwitchChange(false)}
                aria-pressed={!isLive}
                data-testid="mode-paper-button"
                className={cn(
                  "min-h-[48px] rounded-lg px-4 text-sm font-semibold transition-colors",
                  !isLive
                    ? "bg-[#0052ff] text-white shadow-md"
                    : "text-kp-text-secondary hover:bg-kp-bg-hover hover:text-kp-text-primary",
                )}
              >
                🎮 {t("cockpit.mode.paper")}
              </button>
              <Tooltip>
                <TooltipTrigger asChild>
                  <span className="inline-flex">
                    <button
                      type="button"
                      onClick={() => handleSwitchChange(true)}
                      disabled={!canUseLive}
                      aria-pressed={isLive}
                      data-testid="mode-live-button"
                      className={cn(
                        "min-h-[48px] rounded-lg px-4 text-sm font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-50",
                        isLive
                          ? "bg-amber-500 text-black shadow-md"
                          : "text-kp-text-secondary hover:bg-kp-bg-hover hover:text-kp-text-primary",
                      )}
                    >
                      💰 {t("cockpit.mode.liveMoney")}
                    </button>
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
            </div>

            {!canUseLive && (
              <Link
                href={`/${locale}/priser`}
                className="text-xs text-kp-brand hover:underline"
              >
                {t("cockpit.mode.upgrade")} →
              </Link>
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
        {btcPrice ? (
          <Badge
            variant="success"
            icon={<Activity className="size-3" />}
            data-testid="market-data-pill"
          >
            BTC:{" "}
            {(btcPrice.price ?? 0).toLocaleString("no-NO", {
              maximumFractionDigits: 0,
            })}{" "}
            kr
          </Badge>
        ) : (
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
        )}
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
