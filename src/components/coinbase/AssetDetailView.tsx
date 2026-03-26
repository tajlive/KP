"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useLocale, useTranslations } from "next-intl";
import { Area, AreaChart, XAxis, YAxis } from "recharts";
import { Card } from "@coinbase/cds-web/cards";
import { Text } from "@coinbase/cds-web/typography";
import { HStack } from "@coinbase/cds-web/layout";
import { Button } from "@coinbase/cds-web/buttons";
import { ChartWrapper } from "@/components/ui/chart-wrapper";
import { hrefWithLocale } from "@/i18n/href-with-locale";
import { useDashboardNumberLocale } from "@/i18n/use-dashboard-number-locale";

type Ticker = {
  symbol: string;
  price: number;
  change24h: number;
};

export function AssetDetailView({ symbol }: { symbol: string }) {
  const locale = useLocale();
  const t = useTranslations("dashboard.coinbase");
  const numberLocale = useDashboardNumberLocale();
  const pair = `${symbol.toUpperCase()}USDT`;
  const [ticker, setTicker] = useState<Ticker | null>(null);
  const [amountNok, setAmountNok] = useState("5000");
  const [busy, setBusy] = useState(false);
  const [feedback, setFeedback] = useState<string>("");

  useEffect(() => {
    const load = async () => {
      try {
        const res = await fetch(`/api/market/binance-24hr?symbols=${pair}`);
        const data = (await res.json()) as { prices?: Ticker[] };
        setTicker(data.prices?.[0] ?? null);
      } catch {
        setTicker(null);
      }
    };
    void load();
  }, [pair]);

  const chartData = useMemo(() => {
    const seed = ticker?.price ?? 1;
    return Array.from({ length: 36 }, (_, i) => {
      const drift = Math.sin(i / 4) * 0.004 + (Math.random() - 0.5) * 0.006;
      return { i, value: seed * (1 + drift) };
    });
  }, [ticker?.price]);

  const execute = async (side: "buy" | "sell") => {
    setBusy(true);
    setFeedback("");
    try {
      const res = await fetch("/api/paper-trading/execute", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          pair,
          side,
          amount_nok: Number(amountNok),
        }),
      });
      const data = (await res.json()) as {
        success?: boolean;
        error?: string;
      };
      setFeedback(
        data.success
          ? t("orderSubmittedPaper")
          : (data.error ?? t("tradeFailed")),
      );
    } catch {
      setFeedback(t("networkError"));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-6 pb-16">
      <div className="flex items-center justify-between">
        <div>
          <Text as="h1" className="text-3xl font-bold text-slate-900">
            {symbol.toUpperCase()}
          </Text>
          <Text as="p" className="mt-1 text-sm text-slate-600">
            {ticker
              ? `${ticker.price.toLocaleString(numberLocale, {
                  maximumFractionDigits: 2,
                })} USDT`
              : t("loadingPrice")}
          </Text>
        </div>
        <Button
          as={Link}
          href={hrefWithLocale(locale, "/dashboard/trade")}
          variant="secondary"
        >
          {t("backToTrade")}
        </Button>
      </div>

      <Card className="border border-slate-200 bg-white p-6 shadow-sm">
        <div className="h-72">
          <ChartWrapper height={288}>
            <AreaChart
              data={chartData}
              margin={{ left: 0, right: 0, top: 8, bottom: 8 }}
            >
              <defs>
                <linearGradient
                  id="assetDetailFill"
                  x1="0"
                  y1="0"
                  x2="0"
                  y2="1"
                >
                  <stop offset="5%" stopColor="#0052FF" stopOpacity={0.22} />
                  <stop offset="95%" stopColor="#0052FF" stopOpacity={0.02} />
                </linearGradient>
              </defs>
              <XAxis hide dataKey="i" />
              <YAxis hide domain={["auto", "auto"]} />
              <Area
                type="monotone"
                dataKey="value"
                stroke="#0052FF"
                fill="url(#assetDetailFill)"
                strokeWidth={2}
                isAnimationActive={false}
              />
            </AreaChart>
          </ChartWrapper>
        </div>
      </Card>

      <Card className="border border-slate-200 bg-white p-6 shadow-sm">
        <Text as="h2" className="text-lg font-semibold text-slate-900">
          {t("buySellPaper")}
        </Text>
        <Text as="p" className="mt-2 text-sm text-slate-600">
          {t("buySellPaperDesc")}
        </Text>
        <div className="mt-4">
          <label
            htmlFor="asset-amount-nok"
            className="mb-2 block text-sm font-medium text-slate-700"
          >
            {t("amountNok")}
          </label>
          <input
            id="asset-amount-nok"
            value={amountNok}
            onChange={(e) => setAmountNok(e.target.value)}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none ring-[#0052FF] focus:ring-2"
            inputMode="decimal"
          />
        </div>
        <HStack className="mt-4 gap-2">
          <Button onClick={() => execute("buy")} disabled={busy}>
            {t("buy")}
          </Button>
          <Button
            onClick={() => execute("sell")}
            variant="secondary"
            disabled={busy}
          >
            {t("sell")}
          </Button>
        </HStack>
        {feedback ? (
          <Text as="p" className="mt-3 text-sm text-slate-700">
            {feedback}
          </Text>
        ) : null}
      </Card>
    </div>
  );
}
