"use client";

import * as React from "react";
import { useTranslations, useLocale } from "next-intl";
import { format } from "date-fns";
import { nb, enUS } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { Badge } from "@/shared/ui/badge";
import { Skeleton } from "@/shared/ui/skeleton";
import { tradeStatusColor, sideColor, pnlColor } from "./TradeTable";
import type { Trade } from "@/features/trading-cockpit/types";

interface TradeCardsProps {
  trades: Trade[];
  isLoading?: boolean;
  error?: { message: string } | null;
  onCardClick?: (trade: Trade) => void;
  className?: string;
}

export function TradeCards({
  trades,
  isLoading = false,
  error = null,
  onCardClick,
  className,
}: TradeCardsProps) {
  const t = useTranslations("trading");
  const locale = useLocale();
  const dateLocale = locale === "no" ? nb : enUS;

  const formatMoney = (value: number | null) =>
    value === null
      ? "—"
      : new Intl.NumberFormat(locale === "no" ? "nb-NO" : "en-US", {
          style: "currency",
          currency: "NOK",
          maximumFractionDigits: 2,
        }).format(value);

  const formatNumber = (value: number | null) =>
    value === null
      ? "—"
      : new Intl.NumberFormat(locale === "no" ? "nb-NO" : "en-US", {
          maximumFractionDigits: 8,
        }).format(value);

  const formatDate = (value: string | null) =>
    value
      ? format(new Date(value), "dd.MM.yyyy HH:mm", { locale: dateLocale })
      : "—";

  if (isLoading && trades.length === 0) {
    return (
      <div className={cn("grid gap-3 md:hidden", className)} data-testid="trade-cards-skeleton">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} variant="card" className="h-32 w-full" />
        ))}
      </div>
    );
  }

  if (error && trades.length === 0) {
    return (
      <div
        className={cn(
          "md:hidden bg-kp-card border border-kp-light rounded-2xl p-8 text-center",
          className,
        )}
        data-testid="trade-cards-error"
      >
        <p className="text-kp-text-primary font-medium">{t("cockpit.trades.error.title")}</p>
        <p className="text-sm text-kp-text-secondary mt-1">{error.message}</p>
      </div>
    );
  }

  if (trades.length === 0) {
    return (
      <div
        className={cn(
          "md:hidden bg-kp-card border border-kp-light rounded-2xl p-8 text-center",
          className,
        )}
        data-testid="trade-cards-empty"
      >
        <p className="text-kp-text-primary font-medium">{t("cockpit.trades.noTradesTitle")}</p>
        <p className="text-sm text-kp-text-secondary mt-1">{t("cockpit.trades.noTradesDescription")}</p>
      </div>
    );
  }

  return (
    <div className={cn("grid gap-3 md:hidden", className)} data-testid="trade-cards">
      {trades.map((trade) => (
        <button
          key={trade.id}
          type="button"
          onClick={() => onCardClick?.(trade)}
          className={cn(
            "bg-kp-card border border-kp-light rounded-2xl p-4 text-left w-full transition-colors hover:bg-kp-bg-hover",
          )}
          aria-label={`${trade.trading_pair} ${trade.side}`}
          data-testid={`trade-card-${trade.id}`}
        >
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <span className="font-semibold text-kp-text-primary">{trade.trading_pair}</span>
              <Badge className={cn("rounded-full border text-xs", sideColor(trade.side))}>
                {t(`cockpit.trades.side.${trade.side}`)}
              </Badge>
            </div>
            <Badge className={cn("rounded-full border text-xs", tradeStatusColor(trade.status))}>
              {t(`cockpit.trades.status.${trade.status}`)}
            </Badge>
          </div>

          <div className="grid grid-cols-2 gap-y-2 gap-x-4 text-sm">
            <div>
              <p className="text-kp-text-muted text-xs">{t("cockpit.trades.columns.price")}</p>
              <p className="text-kp-text-primary tabular-nums">{formatMoney(trade.price)}</p>
            </div>
            <div>
              <p className="text-kp-text-muted text-xs">{t("cockpit.trades.columns.quantity")}</p>
              <p className="text-kp-text-primary tabular-nums">{formatNumber(trade.quantity)}</p>
            </div>
            <div>
              <p className="text-kp-text-muted text-xs">{t("cockpit.trades.columns.totalValue")}</p>
              <p className="text-kp-text-primary tabular-nums">{formatMoney(trade.total_value)}</p>
            </div>
            <div>
              <p className="text-kp-text-muted text-xs">{t("cockpit.trades.columns.effectivePnl")}</p>
              <p className={cn("tabular-nums", pnlColor(trade.effective_pnl))}>
                {formatMoney(trade.effective_pnl)}
              </p>
            </div>
          </div>

          <div className="mt-3 pt-3 border-t border-kp-light">
            <p className="text-xs text-kp-text-muted">{formatDate(trade.executed_at)}</p>
          </div>
        </button>
      ))}
    </div>
  );
}
