"use client";

import Link from "next/link";
import { Card } from "@coinbase/cds-web/cards";
import { Text } from "@coinbase/cds-web/typography";
import { Button } from "@coinbase/cds-web/buttons";
import { hrefWithLocale } from "@/i18n/href-with-locale";

const watchlist = ["BTC", "ETH", "SOL", "BNB"];

export function WatchlistCard({ locale }: { locale: string }) {
  return (
    <Card className="border border-slate-200 bg-white p-5 shadow-sm">
      <Text as="h3" className="text-base font-semibold text-slate-900">
        {locale === "no" ? "Watchlist" : "Watchlist"}
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
        href={hrefWithLocale(locale, "/dashboard/trade")}
        variant="secondary"
        className="mt-4"
        block
      >
        {locale === "no" ? "Se marked" : "View market"}
      </Button>
    </Card>
  );
}
