"use client";

import Link from "next/link";
import { useLocale, useTranslations } from "next-intl";
import { Card } from "@coinbase/cds-web/cards";
import { Text } from "@coinbase/cds-web/typography";
import { Button } from "@coinbase/cds-web/buttons";
import { hrefWithLocale } from "@/i18n/href-with-locale";

const watchlist = ["BTC", "ETH", "SOL", "BNB"];

export function WatchlistCard() {
  const locale = useLocale();
  const t = useTranslations("dashboard.coinbase");

  return (
    <Card className="border border-slate-200 bg-white p-5 shadow-sm">
      <Text as="h3" className="text-base font-semibold text-slate-900">
        {t("watchlistTitle")}
      </Text>
      <ul className="mt-3 space-y-2">
        {watchlist.map((symbol) => (
          <li key={symbol} className="text-sm text-slate-700">
            {symbol}
          </li>
        ))}
      </ul>
      <Button
        as={Link}
        href={hrefWithLocale(locale, "/handel")}
        variant="secondary"
        className="mt-4"
        block
      >
        {t("viewMarket")}
      </Button>
    </Card>
  );
}
