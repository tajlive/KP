"use client";

import Link from "next/link";
import { useMemo } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Button } from "@/shared/ui/button";
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
        <h1 className="text-3xl font-bold text-kp-text-primary">{t("marketTitle")}</h1>
        <p className="text-sm text-kp-text-secondary">{t("marketSubtitle")}</p>
      </header>

      <div className="rounded-2xl border border-kp-border bg-kp-bg-card p-5 shadow-sm">
        <h2 className="text-base font-semibold text-kp-text-primary">
          {t("topMovers")}
        </h2>
        <div className="mt-3 grid gap-2 md:grid-cols-5">
          {topMovers.map((row) => {
            const base = row.symbol.replace("USDT", "");
            const positive = row.change >= 0;
            return (
              <Link
                key={row.symbol}
                href={hrefWithLocale(locale, `/dashboard/asset/${base}`)}
                className="rounded-lg border border-kp-border bg-kp-bg-secondary px-3 py-2 hover:bg-kp-bg-hover"
              >
                <p className="text-sm font-semibold text-kp-text-primary">{base}</p>
                <p className="text-xs text-kp-text-secondary">
                  {row.price > 0
                    ? `${row.price.toLocaleString(numberLocale, {
                        maximumFractionDigits: row.price < 100 ? 2 : 0,
                      })} kr`
                    : "—"}
                </p>
                <p
                  className={`text-xs font-medium ${
                    positive ? "text-kp-success" : "text-kp-danger"
                  }`}
                >
                  {positive ? "+" : ""}
                  {row.change.toFixed(2)}%
                </p>
              </Link>
            );
          })}
        </div>
      </div>

      <div className="flex justify-center">
        <Button asChild className="bg-kp-brand hover:bg-kp-brand-hover text-white">
          <Link href={hrefWithLocale(locale, "/handel")}>
            {t("goToTrade")}
          </Link>
        </Button>
      </div>
    </div>
  );
}
