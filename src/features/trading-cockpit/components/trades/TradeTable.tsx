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
import { TABLE } from "@/lib/design/tokens";
import type { Trade } from "@/features/trading-cockpit/types";

interface TradeTableProps {
  trades: Trade[];
  isLoading?: boolean;
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
  if (value === null || value === 0) return "text-gray-400";
  return value > 0 ? "text-emerald-400" : "text-rose-400";
}

export function TradeTable({
  trades,
  isLoading = false,
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
      <div className={cn("space-y-2", className)} data-testid="trade-table-skeleton">
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} variant="text" className="h-10 w-full" />
        ))}
      </div>
    );
  }

  return (
    <div
      className={cn(
        "hidden md:block overflow-hidden rounded-2xl border border-white/[0.06]",
        className,
      )}
    >
      <Table>
        <TableHeader>
          <TableRow className="border-white/[0.06] hover:bg-transparent">
            <TableHead className={TABLE.header}>{t("cockpit.trades.columns.pair")}</TableHead>
            <TableHead className={TABLE.header}>{t("cockpit.trades.columns.side")}</TableHead>
            <TableHead className={TABLE.header}>{t("cockpit.trades.columns.status")}</TableHead>
            <TableHead className={cn(TABLE.header, "text-right")}>
              {t("cockpit.trades.columns.price")}
            </TableHead>
            <TableHead className={cn(TABLE.header, "text-right")}>
              {t("cockpit.trades.columns.quantity")}
            </TableHead>
            <TableHead className={cn(TABLE.header, "text-right")}>
              {t("cockpit.trades.columns.fee")}
            </TableHead>
            <TableHead className={cn(TABLE.header, "text-right")}>
              {t("cockpit.trades.columns.totalValue")}
            </TableHead>
            <TableHead className={cn(TABLE.header, "text-right")}>
              {t("cockpit.trades.columns.realizedPnl")}
            </TableHead>
            <TableHead className={cn(TABLE.header, "text-right")}>
              {t("cockpit.trades.columns.effectivePnl")}
            </TableHead>
            <TableHead className={cn(TABLE.header, "text-right")}>
              {t("cockpit.trades.columns.executedAt")}
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {trades.map((trade) => (
            <TableRow
              key={trade.id}
              className={cn(TABLE.row, "cursor-pointer")}
              onClick={() => onRowClick?.(trade)}
              data-testid={`trade-row-${trade.id}`}
            >
              <TableCell className={cn(TABLE.cell, "font-medium text-white")}>
                {trade.trading_pair}
              </TableCell>
              <TableCell className={TABLE.cell}>
                <Badge className={cn("rounded-full border", sideColor(trade.side))}>
                  {t(`cockpit.trades.side.${trade.side}`)}
                </Badge>
              </TableCell>
              <TableCell className={TABLE.cell}>
                <Badge className={cn("rounded-full border", tradeStatusColor(trade.status))}>
                  {t(`cockpit.trades.status.${trade.status}`)}
                </Badge>
              </TableCell>
              <TableCell className={cn(TABLE.cellNumeric, "text-white")}>
                {formatMoney(trade.price)}
              </TableCell>
              <TableCell className={cn(TABLE.cellNumeric, "text-white")}>
                {formatNumber(trade.quantity)}
              </TableCell>
              <TableCell className={cn(TABLE.cellNumeric, "text-white")}>
                {formatMoney(trade.fee)}
              </TableCell>
              <TableCell className={cn(TABLE.cellNumeric, "text-white")}>
                {formatMoney(trade.total_value)}
              </TableCell>
              <TableCell className={cn(TABLE.cellNumeric, pnlColor(trade.realized_pnl))}>
                {formatMoney(trade.realized_pnl)}
              </TableCell>
              <TableCell className={cn(TABLE.cellNumeric, pnlColor(trade.effective_pnl))}>
                {formatMoney(trade.effective_pnl)}
              </TableCell>
              <TableCell className={cn(TABLE.cellNumeric, "text-white")}>
                {formatDate(trade.executed_at)}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
