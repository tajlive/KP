"use client";

import * as React from "react";
import { useTranslations } from "next-intl";
import { AlertTriangle, Loader2, Bell } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/shared/ui/button";
import { useCockpit } from "@/features/trading-cockpit/hooks/useCockpit";

import { TradeFilters } from "./TradeFilters";
import { TradeFiltersSheet } from "./TradeFiltersSheet";
import { TradeTable } from "./TradeTable";
import { TradeCards } from "./TradeCards";
import { TradePagination } from "./TradePagination";
import { TradeDetails } from "./TradeDetails";
import type { Trade } from "@/features/trading-cockpit/types";

interface TradesTabProps {
  pairs?: string[];
  className?: string;
}

export function TradesTab({ pairs = [], className }: TradesTabProps) {
  const t = useTranslations("trading");
  const {
    trades,
    filters,
    setFilters,
    resetFilters,
    isLoadingTrades,
    tradesError,
    hasMoreTrades,
    loadMoreTrades,
    unreadTradeCount,
    markTradesAsSeen,
  } = useCockpit();

  const [selectedTrade, setSelectedTrade] = React.useState<Trade | null>(null);
  const [detailsOpen, setDetailsOpen] = React.useState(false);

  const handleRowClick = React.useCallback((trade: Trade) => {
    setSelectedTrade(trade);
    setDetailsOpen(true);
  }, []);

  const handleDetailsOpenChange = React.useCallback((open: boolean) => {
    setDetailsOpen(open);
    if (!open) {
      setSelectedTrade(null);
    }
  }, []);

  if (tradesError && trades.length === 0) {
    return (
      <div className={cn("space-y-6", className)}>
        <header className="flex items-center justify-between">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-500">
            {t("cockpit.trades.title")}
          </h2>
        </header>

        <div
          className={cn(
            "bg-kp-bg-card border border-kp-border rounded-2xl p-8 flex flex-col items-center justify-center gap-3 text-center",
          )}
          data-testid="trade-error-state"
        >
          <AlertTriangle className="w-8 h-8 text-kp-warning" />
          <div>
            <p className="text-kp-text-primary font-medium">{t("cockpit.trades.error.title")}</p>
            <p className="text-sm text-kp-text-secondary mt-1">{tradesError.message}</p>
          </div>
          <Button
            variant="secondary"
            className="rounded-xl"
            onClick={() => window.location.reload()}
          >
            {t("cockpit.trades.error.retry")}
          </Button>
        </div>
      </div>
    );
  }

  const showEmptyState = trades.length === 0 && !isLoadingTrades;

  return (
    <div className={cn("space-y-6", className)} data-testid="trades-tab">
      <header className="flex items-center justify-between">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-500">
          {t("cockpit.trades.titleCount", { count: trades.length })}
        </h2>
        <div className="flex items-center gap-2">
          {unreadTradeCount > 0 && (
            <button
              type="button"
              onClick={markTradesAsSeen}
              className={cn(
                "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium",
                "bg-emerald-500/15 text-emerald-400 hover:bg-emerald-500/25 transition-colors",
              )}
              data-testid="trades-unread-badge"
            >
              <Bell className="w-3.5 h-3.5" />
              {t("cockpit.trades.unread", { count: unreadTradeCount })}
            </button>
          )}
          {isLoadingTrades && (
            <Loader2 className="w-4 h-4 animate-spin text-gray-500" data-testid="trades-loading-indicator" />
          )}
        </div>
      </header>

      <TradeFilters
        filters={filters}
        onChange={setFilters}
        onReset={resetFilters}
        pairs={pairs}
      />

      <TradeFiltersSheet
        filters={filters}
        onChange={setFilters}
        onReset={resetFilters}
        pairs={pairs}
      />

      {showEmptyState ? (
        <div
          className={cn(
            "bg-kp-bg-card border border-kp-border rounded-2xl p-8 text-center",
          )}
          data-testid="trade-empty-state"
        >
          <p className="text-kp-text-primary font-medium">{t("cockpit.trades.noTradesTitle")}</p>
          <p className="text-sm text-kp-text-secondary mt-1">{t("cockpit.trades.noTradesDescription")}</p>
        </div>
      ) : (
        <>
          <TradeTable
            trades={trades}
            isLoading={isLoadingTrades}
            onRowClick={handleRowClick}
          />
          <TradeCards
            trades={trades}
            isLoading={isLoadingTrades}
            onCardClick={handleRowClick}
          />
          <TradePagination
            hasMore={hasMoreTrades}
            isLoading={isLoadingTrades}
            onLoadMore={loadMoreTrades}
          />
        </>
      )}

      <TradeDetails
        trade={selectedTrade}
        open={detailsOpen}
        onOpenChange={handleDetailsOpenChange}
      />
    </div>
  );
}
