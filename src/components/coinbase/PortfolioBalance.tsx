"use client";

import { Card } from "@coinbase/cds-web/cards";
import { Text } from "@coinbase/cds-web/typography";

export function PortfolioBalance({
  totalNok,
  deltaPercent,
  locale,
}: {
  totalNok: number;
  deltaPercent: number;
  locale: string;
}) {
  const positive = deltaPercent >= 0;
  return (
    <Card className="border border-slate-200 bg-white p-6 shadow-sm">
      <Text as="p" className="text-sm text-slate-500">
        {locale === "no" ? "Total porteføljeverdi" : "Total portfolio value"}
      </Text>
      <Text as="h1" className="mt-2 text-4xl font-bold text-slate-900">
        {totalNok.toLocaleString(locale === "no" ? "nb-NO" : "en-US")} kr
      </Text>
      <Text
        as="p"
        className={`mt-2 text-sm font-medium ${
          positive ? "text-emerald-600" : "text-rose-600"
        }`}
      >
        {positive ? "+" : ""}
        {deltaPercent.toFixed(2)}%
      </Text>
    </Card>
  );
}
