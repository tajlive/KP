"use client";

import Link from "next/link";
import { useMemo } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Card } from "@coinbase/cds-web/cards";
import { Text } from "@coinbase/cds-web/typography";
import { Button } from "@coinbase/cds-web/buttons";
import { usePrices } from "@/hooks/usePrices";
import { hrefWithLocale } from "@/i18n/href-with-locale";
import { useDashboardNumberLocale } from "@/i18n/use-dashboard-number-locale";

const focusSymbols = [
  "BTCUSDT",
  "ETHUSDT",
  "SOLUSDT",
  "BNBUSDT",
  "DOGEUSDT",
] as const;

export function MarketView({ userId }: { userId: string }) {
  const locale = useLocale();
  const t = useTranslations("dashboard.coinbase");
  const numberLocale = useDashboardNumberLocale();
  const { prices } = usePrices();

  const topMovers = useMemo(() => {
    return focusSymbols
      .map((symbol) => {
        const p = prices[symbol];
        return {
          symbol,
          price: p?.price ?? 0,
          change: p?.price_change_percent_24h ?? 0,
        };
      })
      .sort((a, b) => b.change - a.change);
  }, [prices]);

  return (
    <div className="space-y-6 pb-16">
      <header className="space-y-3">
        <h1 className="text-3xl font-bold text-slate-900">{t("marketTitle")}</h1>
        <p className="text-sm text-slate-500">{t("marketSubtitle")}</p>
      </header>

      <Card className="border border-slate-200 bg-white p-5 shadow-sm">
        <Text as="h2" className="text-base font-semibold text-slate-900">
          {t("topMovers")}
        </Text>
        <div className="mt-3 grid gap-2 md:grid-cols-5">
          {topMovers.map((row) => {
            const base = row.symbol.replace("USDT", "");
            const positive = row.change >= 0;
            return (
              <Link
                key={row.symbol}
                href={hrefWithLocale(locale, `/dashboard/asset/${base}`)}
                className="rounded-lg border border-slate-200 bg-white px-3 py-2 hover:bg-slate-50"
              >
                <p className="text-sm font-semibold text-slate-900">{base}</p>
                <p className="text-xs text-slate-500">
                  {row.price.toLocaleString(numberLocale, {
                    maximumFractionDigits: 2,
                  })}
                </p>
                <p
                  className={`text-xs font-medium ${
                    positive ? "text-emerald-600" : "text-rose-600"
                  }`}
                >
                  {positive ? "+" : ""}
                  {row.change.toFixed(2)}%
                </p>
              </Link>
            );
          })}
        </div>
      </Card>

      <div className="flex justify-center">
        <Button as={Link} href={hrefWithLocale(locale, "/handel")} variant="primary">
          {t("goToTrade")}
        </Button>
      </div>
    </div>
  );
}
