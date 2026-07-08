"use client";

import * as React from "react";
import { useTranslations, useLocale } from "next-intl";
import { format } from "date-fns";
import { nb, enUS } from "date-fns/locale";
import { useIsMobile } from "@/hooks/use-mobile";
import { cn } from "@/lib/utils";
import { Badge } from "@/shared/ui/badge";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/shared/ui/sheet";
import { MobileBottomSheet } from "@/shared/ui/mobile-bottom-sheet";
import { tradeStatusColor, sidePill, pnlClass } from "./TradeTable";
import {
  buildTradeExplanation,
  getLearnMoreTitle,
  getPaperModeNotice,
} from "@/lib/trading/explanations";
import type {
  TradeForExplanation,
  AiDecision,
  Locale,
} from "@/lib/trading/explanations";
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
  const isMobile = useIsMobile();

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

  const explanationLocale: Locale = locale === "en" ? "en" : "no";

  const tradeForExplanation: TradeForExplanation | null =
    trade && (trade.side === "buy" || trade.side === "sell")
      ? {
          side: trade.side,
          mode: trade.mode === "live" ? "live" : "paper",
          realized_pnl: trade.realized_pnl ?? null,
          exit_reason: trade.reason_code ?? null,
          strategy_signal: trade.strategy_signal ?? null,
          price: trade.price,
          total_value: trade.total_value,
        }
      : null;

  const aiDecision: AiDecision | null =
    trade?.strategy_signal && typeof trade.strategy_signal === "object"
      ? {
          decision_type:
            typeof trade.strategy_signal.decision_type === "string"
              ? trade.strategy_signal.decision_type
              : undefined,
          sentiment_confidence:
            typeof trade.strategy_signal.confidence === "number"
              ? trade.strategy_signal.confidence
              : null,
        }
      : null;

  const explanation = tradeForExplanation
    ? buildTradeExplanation(tradeForExplanation, aiDecision, explanationLocale)
    : null;

  const hasExplanationSignal = Boolean(trade?.strategy_signal) || Boolean(trade?.reason_code);

  const content = trade && (
    <div className="space-y-6 py-6" data-testid="trade-details-content">
      <div className="flex items-center justify-between">
        <span className="text-2xl font-bold text-kp-text-primary">{trade.trading_pair}</span>
        <div className="flex gap-2">
          <Badge className={cn("rounded-full border", trade.side === "buy" ? "bg-blue-400/10 text-blue-400" : "bg-rose-400/10 text-rose-400")}>
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
          valueClassName={pnlClass(trade.realized_pnl)}
        />
        <DetailItem
          label={t("cockpit.trades.columns.effectivePnl")}
          value={formatMoney(trade.effective_pnl)}
          valueClassName={pnlClass(trade.effective_pnl)}
        />
      </div>

      <div className="space-y-3 pt-4 border-t border-kp-light">
        <h3 className="text-sm font-medium text-kp-text-primary">
          {t("cockpit.trades.details.reason")}
        </h3>
        {hasExplanationSignal && explanation ? (
          <div className="space-y-3">
            <p className="text-sm text-kp-text-secondary leading-relaxed">
              {trade.side === "buy" ? explanation.whyBuy : explanation.whySell}
            </p>
            {explanation.learnMoreUrl && (
              <a
                href={explanation.learnMoreUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center text-sm font-medium text-kp-blue hover:underline"
              >
                {t("cockpit.trades.details.readMore")}{" "}
                {getLearnMoreTitle(explanation.learnMoreKey, explanationLocale)}
              </a>
            )}
            {trade.mode === "paper" && (
              <p className="text-xs text-kp-text-muted italic">
                {getPaperModeNotice(explanationLocale)}
              </p>
            )}
          </div>
        ) : (
          <p className="text-sm text-kp-text-secondary leading-relaxed">
            {t("cockpit.trades.details.noSignal")}
          </p>
        )}
      </div>

      <div className="space-y-3 pt-4 border-t border-kp-light">
        <DetailRow label={t("cockpit.trades.details.id")} value={trade.id} />
        <DetailRow label={t("cockpit.trades.details.sessionId")} value={trade.session_id} />
        <DetailRow label={t("cockpit.trades.columns.executedAt")} value={formatDate(trade.executed_at)} />
        <DetailRow label={t("cockpit.trades.columns.createdAt")} value={formatDate(trade.created_at)} />
      </div>
    </div>
  );

  if (!isMobile) {
    return (
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent
          side="right"
          className={cn(
            "w-full sm:max-w-md border-kp-light bg-kp-card text-kp-text-primary",
            className,
          )}
        >
          <SheetHeader className="border-b border-kp-light pb-4">
            <SheetTitle className="text-kp-text-primary">{t("cockpit.trades.details.title")}</SheetTitle>
            <SheetDescription className="text-kp-text-secondary">
              {t("cockpit.trades.details.description")}
            </SheetDescription>
          </SheetHeader>

          {content}
        </SheetContent>
      </Sheet>
    );
  }

  return (
    <MobileBottomSheet
      open={open}
      onOpenChange={onOpenChange}
      title={t("cockpit.trades.details.title")}
      description={t("cockpit.trades.details.description")}
      height="lg"
      className={cn("bg-kp-card", className)}
    >
      {content}
    </MobileBottomSheet>
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
    <div className="bg-kp-tertiary rounded-xl p-3">
      <p className="text-xs text-kp-text-muted mb-1">{label}</p>
      <p className={cn("text-sm font-medium tabular-nums text-kp-text-primary", valueClassName)}>
        {value}
      </p>
    </div>
  );
}

function DetailRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex justify-between items-center text-sm">
      <span className="text-kp-text-muted">{label}</span>
      <span className="text-kp-text-primary font-medium tabular-nums">{value}</span>
    </div>
  );
}
