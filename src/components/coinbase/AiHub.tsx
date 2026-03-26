"use client";

import { useState } from "react";
import Link from "next/link";
import { useLocale, useTranslations } from "next-intl";
import { Card } from "@coinbase/cds-web/cards";
import { Text } from "@coinbase/cds-web/typography";
import { Button } from "@coinbase/cds-web/buttons";
import { HStack } from "@coinbase/cds-web/layout";
import { Bot, Sparkles, TrendingUp } from "lucide-react";
import { hrefWithLocale } from "@/i18n/href-with-locale";

export function AiHub() {
  const locale = useLocale();
  const t = useTranslations("dashboard.coinbase");
  const [brief, setBrief] = useState<string>("");
  const [loading, setLoading] = useState(false);

  const loadBrief = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/ai/market-brief", { method: "POST" });
      const data = (await res.json()) as { brief?: string; summary?: string };
      setBrief(data.brief ?? data.summary ?? "");
    } catch {
      setBrief(t("briefLoadError"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6 pb-16">
      <header>
        <Text as="h1" className="text-3xl font-bold text-slate-900">
          {t("aiHubTitle")}
        </Text>
        <Text as="p" className="mt-2 text-sm text-slate-600">
          {t("aiHubSubtitle")}
        </Text>
      </header>

      <div className="grid gap-4 md:grid-cols-3">
        <Card className="border border-slate-200 bg-white p-5">
          <HStack className="items-center gap-2">
            <TrendingUp className="h-4 w-4 text-[#0052FF]" />
            <Text as="h2" className="font-semibold text-slate-900">
              {t("marketBrief")}
            </Text>
          </HStack>
          <Text as="p" className="mt-2 text-sm text-slate-600">
            {t("marketBriefDesc")}
          </Text>
          <Button onClick={loadBrief} className="mt-4" variant="primary" block>
            {loading ? t("loading") : t("getBrief")}
          </Button>
        </Card>

        <Card className="border border-slate-200 bg-white p-5">
          <HStack className="items-center gap-2">
            <Sparkles className="h-4 w-4 text-[#0052FF]" />
            <Text as="h2" className="font-semibold text-slate-900">
              {t("strategyAdvisor")}
            </Text>
          </HStack>
          <Text as="p" className="mt-2 text-sm text-slate-600">
            {t("strategyAdvisorDesc")}
          </Text>
          <Button
            as={Link}
            href={hrefWithLocale(locale, "/dashboard/trade")}
            className="mt-4"
            variant="secondary"
            block
          >
            {t("openTrade")}
          </Button>
        </Card>

        <Card className="border border-slate-200 bg-white p-5">
          <HStack className="items-center gap-2">
            <Bot className="h-4 w-4 text-[#0052FF]" />
            <Text as="h2" className="font-semibold text-slate-900">
              {t("autoTradeBot")}
            </Text>
          </HStack>
          <Text as="p" className="mt-2 text-sm text-slate-600">
            {t("autoTradeBotDesc")}
          </Text>
          <Button
            as={Link}
            href={hrefWithLocale(locale, "/dashboard/auto-trade")}
            className="mt-4"
            variant="secondary"
            block
          >
            {t("startBot")}
          </Button>
        </Card>
      </div>

      {brief ? (
        <Card className="border border-slate-200 bg-white p-6">
          <Text as="h3" className="text-lg font-semibold text-slate-900">
            {t("latestBrief")}
          </Text>
          <Text
            as="p"
            className="mt-2 whitespace-pre-wrap text-sm text-slate-700"
          >
            {brief}
          </Text>
        </Card>
      ) : null}
    </div>
  );
}
