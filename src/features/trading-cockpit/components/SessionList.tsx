"use client";

import * as React from "react";
import { useTranslations, useLocale } from "next-intl";
import { useRouter } from "next/navigation";
import { format } from "date-fns";
import { nb, enUS } from "date-fns/locale";
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
import { Badge } from "@/shared/ui/badge";
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
  const router = useRouter();
  const dateLocale = locale === "no" ? nb : enUS;

  if (sessions.length === 0) {
    return (
      <div
        className={cn(
          "bg-kp-card border border-kp-light rounded-2xl p-8 text-center",
          className,
        )}
      >
        <p className="text-kp-text-primary font-medium">{t("cockpit.empty.sessionsTitle")}</p>
        <p className="text-sm text-kp-text-secondary mt-1">
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
      <div className="grid gap-3 sm:hidden" data-testid="session-cards">
        {sessions.map((session) => {
          const pnl = session.total_pnl ?? 0;
          const isProfit = pnl >= 0;
          const starting = session.starting_capital_nok ?? 0;
          const current = session.current_capital_nok ?? 0;
          const changePercent = starting > 0 ? ((current - starting) / starting) * 100 : 0;

          return (
            <button
              key={session.id}
              type="button"
              onClick={() => router.push(`/${locale}/dashboard/historikk`)}
              className="bg-kp-card border border-kp-light rounded-2xl p-4 text-left w-full transition-colors hover:bg-kp-bg-hover"
              aria-label={`${session.trading_pair} ${session.status}`}
              data-testid={`session-card-${session.id}`}
            >
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-kp-text-primary">{session.trading_pair}</span>
                  <Badge className={cn("rounded-full border text-xs", statusColor(session.status))}>
                    {t(`cockpit.sessions.status.${session.status}`)}
                  </Badge>
                </div>
                <span
                  className={cn(
                    "text-sm font-medium tabular-nums",
                    isProfit ? "text-kp-success" : "text-kp-danger",
                  )}
                >
                  {isProfit ? "+" : ""}
                  {formatMoney(pnl)}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-y-2 gap-x-4 text-sm">
                <div>
                  <p className="text-kp-text-muted text-xs">
                    {t("cockpit.sessions.columns.startingCapital")}
                  </p>
                  <p className="text-kp-text-primary tabular-nums">{formatMoney(session.starting_capital_nok)}</p>
                </div>
                <div>
                  <p className="text-kp-text-muted text-xs">
                    {t("cockpit.sessions.columns.currentCapital")}
                  </p>
                  <p className="text-kp-text-primary tabular-nums">{formatMoney(session.current_capital_nok)}</p>
                </div>
              </div>

              <div className="mt-3 pt-3 border-t border-kp-light flex items-center justify-between">
                <p className="text-xs text-kp-text-muted">{formatDate(session.updated_at)}</p>
                {starting > 0 && (
                  <p
                    className={cn(
                      "text-xs font-medium tabular-nums",
                      isProfit ? "text-kp-success" : "text-kp-danger",
                    )}
                  >
                    {changePercent >= 0 ? "+" : ""}
                    {changePercent.toFixed(2)}%
                  </p>
                )}
              </div>
            </button>
          );
        })}
      </div>

      {/* Desktop table view */}
      <div className="hidden sm:block overflow-x-auto rounded-2xl border border-kp-light bg-kp-card" data-testid="session-table">
        <div className="min-w-[700px]">
          <Table>
            <TableHeader className="sticky top-0 z-10 bg-kp-card">
              <TableRow className="border-kp-light hover:bg-transparent">
                <TableHead className="px-4 py-3 text-left text-xs font-semibold text-kp-text-secondary uppercase tracking-wider">{t("cockpit.sessions.columns.pair")}</TableHead>
                <TableHead className="px-4 py-3 text-left text-xs font-semibold text-kp-text-secondary uppercase tracking-wider">{t("cockpit.sessions.columns.status")}</TableHead>
                <TableHead className="px-4 py-3 text-left text-xs font-semibold text-kp-text-secondary uppercase tracking-wider text-right">
                  {t("cockpit.sessions.columns.startingCapital")}
                </TableHead>
                <TableHead className="px-4 py-3 text-left text-xs font-semibold text-kp-text-secondary uppercase tracking-wider text-right">
                  {t("cockpit.sessions.columns.currentCapital")}
                </TableHead>
                <TableHead className="px-4 py-3 text-left text-xs font-semibold text-kp-text-secondary uppercase tracking-wider text-right">
                  {t("cockpit.sessions.columns.pnl")}
                </TableHead>
                <TableHead className="px-4 py-3 text-left text-xs font-semibold text-kp-text-secondary uppercase tracking-wider text-right">
                  {t("cockpit.sessions.columns.updatedAt")}
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sessions.map((session) => {
                const pnl = session.total_pnl ?? 0;
                const isProfit = pnl >= 0;

                return (
                  <TableRow key={session.id} className="border-b border-kp-border hover:bg-kp-bg-hover/50 transition-colors duration-150">
                    <TableCell className="px-4 py-3 text-sm font-medium text-kp-text-primary">
                      {session.trading_pair}
                    </TableCell>
                    <TableCell className="px-4 py-3 text-sm">
                      <Badge className={cn("rounded-full border", statusColor(session.status))}>
                        {t(`cockpit.sessions.status.${session.status}`)}
                      </Badge>
                    </TableCell>
                    <TableCell className="px-4 py-3 text-sm tabular-nums text-right text-kp-text-primary">
                      {formatMoney(session.starting_capital_nok)}
                    </TableCell>
                    <TableCell className="px-4 py-3 text-sm tabular-nums text-right text-kp-text-primary">
                      {formatMoney(session.current_capital_nok)}
                    </TableCell>
                    <TableCell
                      className={cn(
                        "px-4 py-3 text-sm tabular-nums text-right font-medium",
                        isProfit ? "text-kp-success" : "text-kp-danger",
                      )}
                    >
                      {isProfit ? "+" : ""}
                      {formatMoney(pnl)}
                    </TableCell>
                    <TableCell className="px-4 py-3 text-sm tabular-nums text-right text-kp-text-muted">
                      {formatDate(session.updated_at)}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      </div>

      {hasMore && (
        <Button
          variant="secondary"
          className="w-full rounded-xl min-h-12"
          onClick={onLoadMore}
          disabled={isLoadingMore}
        >
          {isLoadingMore ? t("cockpit.sessions.loading") : t("cockpit.sessions.loadMore")}
        </Button>
      )}
    </div>
  );
}
