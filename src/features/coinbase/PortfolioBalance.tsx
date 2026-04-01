"use client";

import { Card } from "@coinbase/cds-web/cards";
import { Text } from "@coinbase/cds-web/typography";
import { useTranslations } from "next-intl";
import { useDashboardNumberLocale } from "@/i18n/use-dashboard-number-locale";

export function PortfolioBalance({
  totalNok,
  deltaPercent,
}: {
  totalNok: number;
  deltaPercent: number;
}) {
  const t = useTranslations("dashboard.coinbase");
  const numberLocale = useDashboardNumberLocale();
  const positive = deltaPercent >= 0;

  return (
    <Card className="border border-slate-200 bg-white p-6 shadow-sm">
      <Text as="p" className="text-sm text-slate-500">
        {t("totalPortfolioValue")}
      </Text>
      <Text
        as="h1"
        className="mt-2 break-words text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl"
      >
        {totalNok.toLocaleString(numberLocale)} kr
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
