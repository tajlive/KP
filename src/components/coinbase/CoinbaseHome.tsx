"use client";

import Link from "next/link";
import { useMemo } from "react";
import { Card } from "@coinbase/cds-web/cards";
import { Text } from "@coinbase/cds-web/typography";
import { Button } from "@coinbase/cds-web/buttons";
import { hrefWithLocale } from "@/i18n/href-with-locale";
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

export function CoinbaseHome({
  locale,
  paperBalance,
  trades,
}: {
  locale: string;
  paperBalance: number;
  trades: TradeRow[];
}) {
  const totals = useMemo(() => {
    const totalPnl = trades.reduce(
      (sum, trade) => sum + Number(trade.realized_pnl ?? 0),
      0,
    );
    const total = paperBalance + totalPnl;
    const pct = paperBalance > 0 ? (totalPnl / paperBalance) * 100 : 0;
    return { total, pct };
  }, [paperBalance, trades]);

  return (
    <div className="space-y-6 pb-16">
      <PortfolioBalance
        totalNok={totals.total}
        deltaPercent={totals.pct}
        locale={locale}
      />

      <QuickActions locale={locale} />

      <PortfolioChart baseValue={Math.max(totals.total, 1)} locale={locale} />

      <div className="grid gap-6 lg:grid-cols-[1fr_280px]">
        <AssetList locale={locale} trades={trades} />
        <div className="space-y-6">
          <Card className="border border-slate-200 bg-white p-5 shadow-sm">
            <Text as="h3" className="text-base font-semibold text-slate-900">
              AI Market Brief
            </Text>
            <Text as="p" className="mt-2 text-sm text-slate-600">
              {locale === "no"
                ? "Få oppsummert markedsbildet og viktigste signaler på under 30 sekunder."
                : "Get a 30-second summary of the market and key signals."}
            </Text>
            <Button
              as={Link}
              href={hrefWithLocale(locale, "/dashboard/ai")}
              variant="primary"
              className="mt-4"
              block
            >
              {locale === "no" ? "Åpne AI-hub" : "Open AI hub"}
            </Button>
          </Card>
          <WatchlistCard locale={locale} />
        </div>
      </div>
    </div>
  );
}
