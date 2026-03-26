"use client";

import Link from "next/link";
import { useMemo } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Card } from "@coinbase/cds-web/cards";
import { Text } from "@coinbase/cds-web/typography";
import { usePrices } from "@/hooks/usePrices";
import { Sparkline } from "@/components/charts/Sparkline";
import { hrefWithLocale } from "@/i18n/href-with-locale";
import { useDashboardNumberLocale } from "@/i18n/use-dashboard-number-locale";

type TradeRow = {
  trading_pair: string;
  side: string;
  quantity: number | null;
};

const symbols = [
  "BTCUSDT",
  "ETHUSDT",
  "SOLUSDT",
  "BNBUSDT",
  "DOGEUSDT",
] as const;

function asSymbol(pair: string) {
  return pair.replace("/", "").toUpperCase();
}

export function AssetList({ trades }: { trades: TradeRow[] }) {
  const locale = useLocale();
  const t = useTranslations("dashboard.coinbase");
  const numberLocale = useDashboardNumberLocale();
  const { prices } = usePrices();

  const holdings = useMemo(() => {
    const m = new Map<string, number>();
    for (const trade of trades) {
      const symbol = asSymbol(trade.trading_pair || "");
      if (!symbol.endsWith("USDT")) continue;
      const qty = Number(trade.quantity ?? 0);
      if (!Number.isFinite(qty) || qty <= 0) continue;
      const signed = trade.side?.toLowerCase() === "sell" ? -qty : qty;
      m.set(symbol, (m.get(symbol) ?? 0) + signed);
    }
    return m;
  }, [trades]);

  return (
    <Card className="border border-slate-200 bg-white p-0 shadow-sm">
      <div className="border-b border-slate-100 px-5 py-4">
        <Text as="h2" className="text-lg font-semibold text-slate-900">
          {t("yourAssets")}
        </Text>
      </div>
      <div className="divide-y divide-slate-100">
        {symbols.map((symbol) => {
          const row = prices[symbol];
          const price = row?.price ?? 0;
          const change = row?.price_change_percent_24h ?? 0;
          const positive = change >= 0;
          const qty = holdings.get(symbol) ?? 0;
          const base = symbol.replace("USDT", "");
          const syntheticSpark = Array.from({ length: 16 }, (_, i) => {
            const seed = price || 1;
            const drift = (positive ? 1 : -1) * 0.002 * i;
            return seed * (1 + drift);
          });

          return (
            <Link
              key={symbol}
              href={hrefWithLocale(locale, `/dashboard/asset/${base}`)}
              className="grid grid-cols-[1fr_auto] items-center gap-3 px-5 py-4 transition-colors hover:bg-slate-50"
            >
              <div className="min-w-0">
                <Text as="p" className="text-sm font-semibold text-slate-900">
                  {base}
                </Text>
                <Text as="p" className="text-xs text-slate-500">
                  {qty > 0 ? `${qty.toFixed(5)} ${base}` : t("noHoldings")}
                </Text>
              </div>

              <div className="grid grid-cols-[80px_auto] items-center gap-3">
                <div className="h-10 w-20">
                  <Sparkline
                    data={syntheticSpark}
                    color={positive ? "green" : "red"}
                  />
                </div>
                <div className="text-right">
                  <Text as="p" className="text-sm font-semibold text-slate-900">
                    {price.toLocaleString(numberLocale, {
                      maximumFractionDigits: 2,
                    })}
                  </Text>
                  <Text
                    as="p"
                    className={`text-xs font-medium ${
                      positive ? "text-emerald-600" : "text-rose-600"
                    }`}
                  >
                    {positive ? "+" : ""}
                    {change.toFixed(2)}%
                  </Text>
                </div>
              </div>
            </Link>
          );
        })}
      </div>
    </Card>
  );
}
