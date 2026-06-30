"use client";

import * as React from "react";
import { useTranslations } from "next-intl";
import { format } from "date-fns";
import { nb, enUS } from "date-fns/locale";
import { useLocale } from "next-intl";
import { cn } from "@/lib/utils";
import { Button } from "@/shared/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/shared/ui/table";
import { MobileTradingCard } from "@/shared/ui/mobile-trading-card";
import { Badge } from "@/shared/ui/badge";
import { SEMANTIC_COLORS, SURFACE, TABLE } from "@/lib/design/tokens";
import type { TradingSessionSummary } from "@/features/trading-cockpit/types";

interface SessionListProps {
  sessions: TradingSessionSummary[];
  statusCounts?: Record<string, number>;
  hasMore?: boolean;
  isLoadingMore?: boolean;
  onLoadMore?: () => void;
  className?: string;
}

function statusColor(status: string): string {
  switch (status) {
    case "active":
      return "bg-emerald-500/10 text-emerald-400 border-emerald-500/30";
    case "paused":
      return "bg-amber-500/10 text-amber-400 border-amber-500/30";
    case "stopped":
      return "bg-gray-500/10 text-gray-400 border-gray-500/30";
    case "crashed":
      return "bg-rose-500/10 text-rose-400 border-rose-500/30";
    default:
      return "bg-gray-500/10 text-gray-400 border-gray-500/30";
  }
}

export function SessionList({
  sessions,
  hasMore = false,
  isLoadingMore = false,
  onLoadMore,
  className,
}: SessionListProps) {
  const t = useTranslations("trading");
  const locale = useLocale();
  const dateLocale = locale === "no" ? nb : enUS;

  if (sessions.length === 0) {
    return (
      <div
        className={cn(
          SURFACE.BG_CARD,
          "border-white/[0.06] rounded-2xl p-8 text-center",
          className,
        )}
      >
        <p className="text-white font-medium">{t("cockpit.empty.sessionsTitle")}</p>
        <p className="text-sm text-gray-400 mt-1">
          {t("cockpit.empty.sessionsDescription")}
        </p>
      </div>
    );
  }

  const formatMoney = (value: number | null) =>
    value === null
      ? "—"
      : new Intl.NumberFormat(locale === "no" ? "nb-NO" : "en-US", {
          style: "currency",
          currency: "NOK",
          maximumFractionDigits: 0,
        }).format(value);

  const formatDate = (value: string | null) =>
    value ? format(new Date(value), "dd.MM.yyyy HH:mm", { locale: dateLocale }) : "—";

  return (
    <div className={cn("space-y-3", className)}>
      {/* Mobile card view */}
      <div className="grid gap-3 sm:hidden">
        {sessions.map((session) => {
          const starting = session.starting_capital_nok ?? 0;
          const current = session.current_capital_nok ?? 0;
          const changePercent = starting > 0 ? ((current - starting) / starting) * 100 : 0;

          return (
            <MobileTradingCard
              key={session.id}
              symbol={session.trading_pair}
              name={t(`cockpit.sessions.status.${session.status}`)}
              quantity={1}
              avgPrice={starting}
              currentPrice={current}
              currency="NOK"
              changePercent={changePercent}
              onPress={() => window.alert(`Session ${session.id}`)}
            />
          );
        })}
      </div>

      {/* Desktop table view */}
      <div className="hidden sm:block overflow-hidden rounded-2xl border border-white/[0.06]">
        <Table>
          <TableHeader>
            <TableRow className="border-white/[0.06] hover:bg-transparent">
              <TableHead className={TABLE.header}>{t("cockpit.sessions.columns.pair")}</TableHead>
              <TableHead className={TABLE.header}>{t("cockpit.sessions.columns.status")}</TableHead>
              <TableHead className={cn(TABLE.header, "text-right")}>
                {t("cockpit.sessions.columns.startingCapital")}
              </TableHead>
              <TableHead className={cn(TABLE.header, "text-right")}>
                {t("cockpit.sessions.columns.currentCapital")}
              </TableHead>
              <TableHead className={cn(TABLE.header, "text-right")}>
                {t("cockpit.sessions.columns.pnl")}
              </TableHead>
              <TableHead className={cn(TABLE.header, "text-right")}>
                {t("cockpit.sessions.columns.updatedAt")}
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sessions.map((session) => {
              const pnl = session.total_pnl ?? 0;
              const isProfit = pnl >= 0;

              return (
                <TableRow key={session.id} className={TABLE.row}>
                  <TableCell className={cn(TABLE.cell, "font-medium text-white")}>
                    {session.trading_pair}
                  </TableCell>
                  <TableCell className={TABLE.cell}>
                    <Badge className={cn("rounded-full border", statusColor(session.status))}>
                      {t(`cockpit.sessions.status.${session.status}`)}
                    </Badge>
                  </TableCell>
                  <TableCell className={cn(TABLE.cellNumeric, "text-white")}>
                    {formatMoney(session.starting_capital_nok)}
                  </TableCell>
                  <TableCell className={cn(TABLE.cellNumeric, "text-white")}>
                    {formatMoney(session.current_capital_nok)}
                  </TableCell>
                  <TableCell
                    className={cn(
                      TABLE.cellNumeric,
                      "font-medium",
                      isProfit ? "text-emerald-400" : "text-rose-400",
                    )}
                  >
                    {isProfit ? "+" : ""}
                    {formatMoney(pnl)}
                  </TableCell>
                  <TableCell className={cn(TABLE.cellNumeric, "text-gray-400")}>
                    {formatDate(session.updated_at)}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>

      {hasMore && (
        <Button
          variant="secondary"
          className="w-full rounded-xl"
          onClick={onLoadMore}
          disabled={isLoadingMore}
        >
          {isLoadingMore ? t("cockpit.sessions.loading") : t("cockpit.sessions.loadMore")}
        </Button>
      )}
    </div>
  );
}
