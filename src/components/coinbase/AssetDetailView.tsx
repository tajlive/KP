"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Area, AreaChart, XAxis, YAxis } from "recharts";
import { Card } from "@coinbase/cds-web/cards";
import { Text } from "@coinbase/cds-web/typography";
import { HStack } from "@coinbase/cds-web/layout";
import { Button } from "@coinbase/cds-web/buttons";
import { ChartWrapper } from "@/components/ui/chart-wrapper";
import { hrefWithLocale } from "@/i18n/href-with-locale";

type Ticker = {
  symbol: string;
  price: number;
  change24h: number;
};

export function AssetDetailView({
  locale,
  symbol,
}: {
  locale: string;
  symbol: string;
}) {
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
          ? locale === "no"
            ? "Ordre sendt i paper-modus."
            : "Order submitted in paper mode."
          : (data.error ??
              (locale === "no" ? "Handel feilet." : "Trade request failed.")),
      );
    } catch {
      setFeedback(locale === "no" ? "Nettverksfeil." : "Network error.");
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
              ? `${ticker.price.toLocaleString(
                  locale === "no" ? "nb-NO" : "en-US",
                  {
                    maximumFractionDigits: 2,
                  },
                )} USDT`
              : locale === "no"
                ? "Laster pris..."
                : "Loading price..."}
          </Text>
        </div>
        <Button
          as={Link}
          href={hrefWithLocale(locale, "/dashboard/trade")}
          variant="secondary"
        >
          {locale === "no" ? "Tilbake til trade" : "Back to trade"}
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
          {locale === "no" ? "Kjøp/Selg (paper)" : "Buy/Sell (paper)"}
        </Text>
        <Text as="p" className="mt-2 text-sm text-slate-600">
          {locale === "no"
            ? "Bruk paper-modus for å teste strategier uten risiko."
            : "Use paper mode to test strategies without risk."}
        </Text>
        <div className="mt-4">
          <label
            htmlFor="asset-amount-nok"
            className="mb-2 block text-sm font-medium text-slate-700"
          >
            {locale === "no" ? "Beløp i NOK" : "Amount in NOK"}
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
            {locale === "no" ? "Kjøp" : "Buy"}
          </Button>
          <Button
            onClick={() => execute("sell")}
            variant="secondary"
            disabled={busy}
          >
            {locale === "no" ? "Selg" : "Sell"}
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
