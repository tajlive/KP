"use client";

import Link from "next/link";
import { useMemo } from "react";
import { useLocale, useTranslations } from "next-intl";
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
  paperBalance,
  trades,
}: {
  paperBalance: number;
  trades: TradeRow[];
}) {
  const locale = useLocale();
  const t = useTranslations("dashboard.coinbase");

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
      <PortfolioBalance totalNok={totals.total} deltaPercent={totals.pct} />

      <QuickActions />

      <PortfolioChart baseValue={Math.max(totals.total, 1)} />

      <div className="grid gap-6 lg:grid-cols-[1fr_280px]">
        <AssetList trades={trades} />
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
