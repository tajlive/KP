"use client";

import * as React from "react";
import { useTranslations, useLocale } from "next-intl";
import { format } from "date-fns";
import { nb, enUS } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { Badge } from "@/shared/ui/badge";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/shared/ui/sheet";
import { tradeStatusColor, sideColor, pnlColor } from "./TradeTable";
import type { Trade } from "@/features/trading-cockpit/types";

interface TradeDetailsProps {
  trade: Trade | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  className?: string;
}

export function TradeDetails({
  trade,
  open,
  onOpenChange,
  className,
}: TradeDetailsProps) {
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
      ? format(new Date(value), "dd.MM.yyyy HH:mm:ss", { locale: dateLocale })
      : "—";

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className={cn(
          "w-full sm:max-w-md border-white/[0.06] bg-[#0f1115] text-white",
          className,
        )}
      >
        <SheetHeader className="border-b border-white/[0.06] pb-4">
          <SheetTitle className="text-white">{t("cockpit.trades.details.title")}</SheetTitle>
          <SheetDescription className="text-gray-400">
            {t("cockpit.trades.details.description")}
          </SheetDescription>
        </SheetHeader>

        {trade && (
          <div className="space-y-6 py-6" data-testid="trade-details-content">
            <div className="flex items-center justify-between">
              <span className="text-2xl font-bold text-white">{trade.trading_pair}</span>
              <div className="flex gap-2">
                <Badge className={cn("rounded-full border", sideColor(trade.side))}>
                  {t(`cockpit.trades.side.${trade.side}`)}
                </Badge>
                <Badge className={cn("rounded-full border", tradeStatusColor(trade.status))}>
                  {t(`cockpit.trades.status.${trade.status}`)}
                </Badge>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <DetailItem label={t("cockpit.trades.columns.price")} value={formatMoney(trade.price)} />
              <DetailItem label={t("cockpit.trades.columns.quantity")} value={formatNumber(trade.quantity)} />
              <DetailItem label={t("cockpit.trades.columns.fee")} value={formatMoney(trade.fee)} />
              <DetailItem label={t("cockpit.trades.columns.totalValue")} value={formatMoney(trade.total_value)} />
              <DetailItem
                label={t("cockpit.trades.columns.realizedPnl")}
                value={formatMoney(trade.realized_pnl)}
                valueClassName={pnlColor(trade.realized_pnl)}
              />
              <DetailItem
                label={t("cockpit.trades.columns.effectivePnl")}
                value={formatMoney(trade.effective_pnl)}
                valueClassName={pnlColor(trade.effective_pnl)}
              />
            </div>

            <div className="space-y-3 pt-4 border-t border-white/[0.06]">
              <DetailRow label={t("cockpit.trades.details.id")} value={trade.id} />
              <DetailRow label={t("cockpit.trades.details.sessionId")} value={trade.session_id} />
              <DetailRow label={t("cockpit.trades.columns.executedAt")} value={formatDate(trade.executed_at)} />
              <DetailRow label={t("cockpit.trades.columns.createdAt")} value={formatDate(trade.created_at)} />
            </div>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}

function DetailItem({
  label,
  value,
  valueClassName,
}: {
  label: string;
  value: React.ReactNode;
  valueClassName?: string;
}) {
  return (
    <div className="bg-white/[0.03] rounded-xl p-3">
      <p className="text-xs text-gray-500 mb-1">{label}</p>
      <p className={cn("text-sm font-medium tabular-nums text-white", valueClassName)}>
        {value}
      </p>
    </div>
  );
}

function DetailRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex justify-between items-center text-sm">
      <span className="text-gray-500">{label}</span>
      <span className="text-white font-medium tabular-nums">{value}</span>
    </div>
  );
}
