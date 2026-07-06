"use client";

import * as React from "react";
import { useTranslations, useLocale } from "next-intl";
import { format } from "date-fns";
import { nb, enUS } from "date-fns/locale";
import { cn } from "@/lib/utils";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/shared/ui/table";
import { Badge } from "@/shared/ui/badge";
import { Skeleton } from "@/shared/ui/skeleton";
import type { Trade } from "@/features/trading-cockpit/types";

interface TradeTableProps {
  trades: Trade[];
  isLoading?: boolean;
  error?: { message: string } | null;
  onRowClick?: (trade: Trade) => void;
  className?: string;
}

export function tradeStatusColor(status: string): string {
  switch (status) {
    case "filled":
      return "bg-emerald-500/10 text-emerald-400 border-emerald-500/30";
    case "partially_filled":
      return "bg-sky-500/10 text-sky-400 border-sky-500/30";
    case "pending":
      return "bg-amber-500/10 text-amber-400 border-amber-500/30";
    case "cancelled":
      return "bg-gray-500/10 text-gray-400 border-gray-500/30";
    case "failed":
      return "bg-rose-500/10 text-rose-400 border-rose-500/30";
    default:
      return "bg-gray-500/10 text-gray-400 border-gray-500/30";
  }
}

export function sideColor(side: string): string {
  return side === "buy"
    ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/30"
    : "bg-rose-500/10 text-rose-400 border-rose-500/30";
}

export function pnlColor(value: number | null): string {
  if (value === null || value === 0) return "text-kp-text-muted";
  return value > 0 ? "text-kp-success" : "text-kp-danger";
}

export function TradeTable({
  trades,
  isLoading = false,
  error = null,
  onRowClick,
  className,
}: TradeTableProps) {
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
      <div className={cn("hidden md:block space-y-2", className)} data-testid="trade-table-skeleton">
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} variant="text" className="h-10 w-full" />
        ))}
      </div>
    );
  }

  if (error && trades.length === 0) {
    return (
      <div
        className={cn(
          "hidden md:block bg-kp-card border border-kp-light rounded-2xl p-8 text-center",
          className,
        )}
        data-testid="trade-table-error"
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
          "hidden md:block bg-kp-card border border-kp-light rounded-2xl p-8 text-center",
          className,
        )}
        data-testid="trade-table-empty"
      >
        <p className="text-kp-text-primary font-medium">{t("cockpit.trades.noTradesTitle")}</p>
        <p className="text-sm text-kp-text-secondary mt-1">{t("cockpit.trades.noTradesDescription")}</p>
      </div>
    );
  }

  return (
    <div
      className={cn(
        "hidden md:block overflow-x-auto rounded-2xl border border-kp-light bg-kp-card",
        className,
      )}
      data-testid="trade-table"
    >
      <div className="min-w-[1000px]">
        <Table>
          <TableHeader className="sticky top-0 z-10 bg-kp-card">
            <TableRow className="border-kp-light hover:bg-transparent">
              <TableHead className="px-4 py-3 text-left text-xs font-semibold text-kp-text-secondary uppercase tracking-wider">{t("cockpit.trades.columns.pair")}</TableHead>
              <TableHead className="px-4 py-3 text-left text-xs font-semibold text-kp-text-secondary uppercase tracking-wider">{t("cockpit.trades.columns.side")}</TableHead>
              <TableHead className="px-4 py-3 text-left text-xs font-semibold text-kp-text-secondary uppercase tracking-wider">{t("cockpit.trades.columns.status")}</TableHead>
              <TableHead className="px-4 py-3 text-left text-xs font-semibold text-kp-text-secondary uppercase tracking-wider text-right">
                {t("cockpit.trades.columns.price")}
              </TableHead>
              <TableHead className="px-4 py-3 text-left text-xs font-semibold text-kp-text-secondary uppercase tracking-wider text-right">
                {t("cockpit.trades.columns.quantity")}
              </TableHead>
              <TableHead className="px-4 py-3 text-left text-xs font-semibold text-kp-text-secondary uppercase tracking-wider text-right">
                {t("cockpit.trades.columns.fee")}
              </TableHead>
              <TableHead className="px-4 py-3 text-left text-xs font-semibold text-kp-text-secondary uppercase tracking-wider text-right">
                {t("cockpit.trades.columns.totalValue")}
              </TableHead>
              <TableHead className="px-4 py-3 text-left text-xs font-semibold text-kp-text-secondary uppercase tracking-wider text-right">
                {t("cockpit.trades.columns.realizedPnl")}
              </TableHead>
              <TableHead className="px-4 py-3 text-left text-xs font-semibold text-kp-text-secondary uppercase tracking-wider text-right">
                {t("cockpit.trades.columns.effectivePnl")}
              </TableHead>
              <TableHead className="px-4 py-3 text-left text-xs font-semibold text-kp-text-secondary uppercase tracking-wider text-right">
                {t("cockpit.trades.columns.executedAt")}
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {trades.map((trade) => (
              <TableRow
                key={trade.id}
                className="border-b border-kp-border hover:bg-kp-bg-hover/50 transition-colors duration-150 cursor-pointer"
                onClick={() => onRowClick?.(trade)}
                data-testid={`trade-row-${trade.id}`}
              >
                <TableCell className="px-4 py-3 text-sm font-medium text-kp-text-primary">
                  {trade.trading_pair}
                </TableCell>
                <TableCell className="px-4 py-3 text-sm">
                  <Badge className={cn("rounded-full border", sideColor(trade.side))}>
                    {t(`cockpit.trades.side.${trade.side}`)}
                  </Badge>
                </TableCell>
                <TableCell className="px-4 py-3 text-sm">
                  <Badge className={cn("rounded-full border", tradeStatusColor(trade.status))}>
                    {t(`cockpit.trades.status.${trade.status}`)}
                  </Badge>
                </TableCell>
                <TableCell className="px-4 py-3 text-sm tabular-nums text-right text-kp-text-primary">
                  {formatMoney(trade.price)}
                </TableCell>
                <TableCell className="px-4 py-3 text-sm tabular-nums text-right text-kp-text-primary">
                  {formatNumber(trade.quantity)}
                </TableCell>
                <TableCell className="px-4 py-3 text-sm tabular-nums text-right text-kp-text-primary">
                  {formatMoney(trade.fee)}
                </TableCell>
                <TableCell className="px-4 py-3 text-sm tabular-nums text-right text-kp-text-primary">
                  {formatMoney(trade.total_value)}
                </TableCell>
                <TableCell className={cn("px-4 py-3 text-sm tabular-nums text-right", pnlColor(trade.realized_pnl))}>
                  {formatMoney(trade.realized_pnl)}
                </TableCell>
                <TableCell className={cn("px-4 py-3 text-sm tabular-nums text-right", pnlColor(trade.effective_pnl))}>
                  {formatMoney(trade.effective_pnl)}
                </TableCell>
                <TableCell className="px-4 py-3 text-sm tabular-nums text-right text-kp-text-primary">
                  {formatDate(trade.executed_at)}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
