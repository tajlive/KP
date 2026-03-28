"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { RefreshCw } from "lucide-react";
import { Card } from "@coinbase/cds-web/cards";
import { Text } from "@coinbase/cds-web/typography";
import { Button } from "@coinbase/cds-web/buttons";
import { HStack } from "@coinbase/cds-web/layout";
import { hrefWithLocale } from "@/i18n/href-with-locale";
import { useAuth } from "@/components/auth/AuthContext";
import { useDashboardTradingIntegritySync } from "@/lib/hooks/useDashboardTradingIntegritySync";
import { reportTradingIntegrityManualSync } from "@/lib/sentry";
import type { Trade } from "@/lib/trading-api";
import { PortfolioBalance } from "@/components/coinbase/PortfolioBalance";
import { PortfolioChart } from "@/components/coinbase/PortfolioChart";
import { QuickActions } from "@/components/coinbase/QuickActions";
import { AssetList } from "@/components/coinbase/AssetList";
import { WatchlistCard } from "@/components/coinbase/WatchlistCard";

type TradeRow = {
  trading_pair: string;
  side: string;
  quantity: number | null;
  realized_pnl: number | null;
};

type ServerTradeRow = {
  trading_pair: string;
  side: string;
  quantity: number | null;
  realized_pnl: number | null;
};

type ActiveSession = {
  id: string;
  mode: string;
  status: string;
  strategy_id: string | null;
  current_capital_nok: number;
  starting_capital_nok: number;
  total_pnl: number | null;
  total_trades: number | null;
  winning_trades: number | null;
  created_at: string | null;
  updated_at: string | null;
} | null;

function serverRowToRow(row: ServerTradeRow): TradeRow {
  return {
    trading_pair: row.trading_pair,
    side: row.side,
    quantity: row.quantity,
    realized_pnl: row.realized_pnl ?? null,
  };
}

function apiTradeToRow(t: Trade): TradeRow {
  return {
    trading_pair: t.symbol,
    side: t.side,
    quantity: t.quantity,
    realized_pnl: t.realized_pnl,
  };
}

export function CoinbaseHome({
  paperBalance,
  trades,
  activeSession = null,
}: {
  paperBalance: number;
  trades: ServerTradeRow[];
  activeSession?: ActiveSession;
}) {
  const locale = useLocale();
  const t = useTranslations("dashboard.coinbase");
  const tDash = useTranslations("dashboard");
  const { user } = useAuth();
  const userId = user?.id ?? "";

  const [liveTrades, setLiveTrades] = useState<TradeRow[]>(() =>
    trades.map(serverRowToRow),
  );

  useEffect(() => {
    setLiveTrades(trades.map(serverRowToRow));
  }, [trades]);

  const applyTradesSnapshot = useCallback((rows: Trade[]) => {
    setLiveTrades(rows.map(apiTradeToRow));
  }, []);

  const { refreshTradesNow, refreshServerProps, tradesPollFailed } =
    useDashboardTradingIntegritySync({
      userId,
      enabled: Boolean(userId),
      onTradesSnapshot: applyTradesSnapshot,
    });

  const [manualIntegritySync, setManualIntegritySync] = useState(false);
  const runManualIntegritySync = async () => {
    reportTradingIntegrityManualSync();
    setManualIntegritySync(true);
    try {
      await refreshTradesNow();
      refreshServerProps();
    } finally {
      setManualIntegritySync(false);
    }
  };

  const totals = useMemo(() => {
    const totalPnl = liveTrades.reduce(
      (sum, trade) => sum + Number(trade.realized_pnl ?? 0),
      0,
    );
    const total = paperBalance + totalPnl;
    const pct = paperBalance > 0 ? (totalPnl / paperBalance) * 100 : 0;
    return { total, pct };
  }, [paperBalance, liveTrades]);

  return (
    <div className="space-y-6 pb-2 md:pb-8">
      {tradesPollFailed ? (
        <p
          className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900"
          role="status"
          data-testid="dashboard-integrity-poll-warning"
        >
          {tDash("marketDesk.integrityPollWarning")}
        </p>
      ) : null}

      <Card
        className="border border-slate-200 bg-white p-4 shadow-sm"
        data-testid="dashboard-home-overview"
      >
        <HStack className="items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <Text as="p" className="text-sm font-semibold text-slate-900">
              {tDash("homeOverview.title")}
            </Text>
            <Text as="p" className="mt-1 text-xs text-slate-600">
              {tDash("homeOverview.subtitle")}
            </Text>
          </div>
          <Button
            type="button"
            variant="secondary"
            data-testid="dashboard-integrity-sync"
            onClick={() => void runManualIntegritySync()}
            disabled={manualIntegritySync || !userId}
            aria-label={tDash("marketDesk.integritySyncAria")}
            title={tDash("marketDesk.integritySyncAria")}
            className="h-11 w-11 shrink-0 p-0 touch-manipulation"
          >
            <RefreshCw
              className={`h-4 w-4 ${manualIntegritySync ? "animate-spin" : ""}`}
              aria-hidden
            />
          </Button>
        </HStack>
      </Card>

      <PortfolioBalance totalNok={totals.total} deltaPercent={totals.pct} />

      {activeSession && (
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">
            Aktiv sesjon
          </p>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <p className="text-xs text-slate-500">Kapital</p>
              <p className="text-sm font-semibold text-slate-900">
                {activeSession.current_capital_nok.toLocaleString('nb-NO')} NOK
              </p>
            </div>
            <div>
              <p className="text-xs text-slate-500">P&L</p>
              <p className={`text-sm font-semibold ${
                (activeSession.total_pnl ?? 0) >= 0
                  ? 'text-green-600'
                  : 'text-red-600'
              }`}>
                {((activeSession.total_pnl ?? 0) >= 0 ? '+' : '')}
                {(activeSession.total_pnl ?? 0).toLocaleString('nb-NO')} NOK
              </p>
            </div>
            <div>
              <p className="text-xs text-slate-500">Handler</p>
              <p className="text-sm font-semibold text-slate-900">
                {activeSession.total_trades ?? 0}
              </p>
            </div>
          </div>
        </div>
      )}

      <QuickActions />

      <PortfolioChart baseValue={Math.max(totals.total, 1)} />

      <div className="grid gap-6 lg:grid-cols-[1fr_280px]">
        <AssetList trades={liveTrades} />
        <div className="space-y-6">
          <Card className="border border-slate-200 bg-white p-5 shadow-sm">
            <Text as="h3" className="text-base font-semibold text-slate-900">
              {t("aiMarketBriefTitle")}
            </Text>
            <Text as="p" className="mt-2 text-sm text-slate-600">
              {t("aiMarketBriefDescription")}
            </Text>
            <Button
              as={Link}
              href={hrefWithLocale(locale, "/dashboard/ai")}
              variant="primary"
              className="mt-4"
              block
            >
              {t("openAiHub")}
            </Button>
          </Card>
          <WatchlistCard />
        </div>
      </div>
    </div>
  );
}
