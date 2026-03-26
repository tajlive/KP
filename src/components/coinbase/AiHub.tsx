"use client";

import { useState } from "react";
import Link from "next/link";
import { Card } from "@coinbase/cds-web/cards";
import { Text } from "@coinbase/cds-web/typography";
import { Button } from "@coinbase/cds-web/buttons";
import { HStack } from "@coinbase/cds-web/layout";
import { Bot, Sparkles, TrendingUp } from "lucide-react";
import { hrefWithLocale } from "@/i18n/href-with-locale";

export function AiHub({ locale }: { locale: string }) {
  const [brief, setBrief] = useState<string>("");
  const [loading, setLoading] = useState(false);

  const loadBrief = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/ai/market-brief", { method: "POST" });
      const data = (await res.json()) as { brief?: string; summary?: string };
      setBrief(data.brief ?? data.summary ?? "");
    } catch {
      setBrief(
        locale === "no"
          ? "Kunne ikke hente brief nå."
          : "Could not load brief.",
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6 pb-16">
      <header>
        <Text as="h1" className="text-3xl font-bold text-slate-900">
          AI hub
        </Text>
        <Text as="p" className="mt-2 text-sm text-slate-600">
          {locale === "no"
            ? "Market brief, strategiforklaring og bot-styring på ett sted."
            : "Market brief, strategy explanations and bot control in one place."}
        </Text>
      </header>

      <div className="grid gap-4 md:grid-cols-3">
        <Card className="border border-slate-200 bg-white p-5">
          <HStack className="items-center gap-2">
            <TrendingUp className="h-4 w-4 text-[#0052FF]" />
            <Text as="h2" className="font-semibold text-slate-900">
              Market Brief
            </Text>
          </HStack>
          <Text as="p" className="mt-2 text-sm text-slate-600">
            {locale === "no"
              ? "Få en oppsummering av markedet i dag."
              : "Get a concise summary of today's market."}
          </Text>
          <Button onClick={loadBrief} className="mt-4" variant="primary" block>
            {loading
              ? locale === "no"
                ? "Laster..."
                : "Loading..."
              : locale === "no"
                ? "Hent brief"
                : "Get brief"}
          </Button>
        </Card>

        <Card className="border border-slate-200 bg-white p-5">
          <HStack className="items-center gap-2">
            <Sparkles className="h-4 w-4 text-[#0052FF]" />
            <Text as="h2" className="font-semibold text-slate-900">
              Strategy Advisor
            </Text>
          </HStack>
          <Text as="p" className="mt-2 text-sm text-slate-600">
            {locale === "no"
              ? "Forklar strategier før du starter bot."
              : "Explain strategy behavior before starting bots."}
          </Text>
          <Button
            as={Link}
            href={hrefWithLocale(locale, "/dashboard/trade")}
            className="mt-4"
            variant="secondary"
            block
          >
            {locale === "no" ? "Åpne trade" : "Open trade"}
          </Button>
        </Card>

        <Card className="border border-slate-200 bg-white p-5">
          <HStack className="items-center gap-2">
            <Bot className="h-4 w-4 text-[#0052FF]" />
            <Text as="h2" className="font-semibold text-slate-900">
              Auto-trade bot
            </Text>
          </HStack>
          <Text as="p" className="mt-2 text-sm text-slate-600">
            {locale === "no"
              ? "Start eller følg aktive bots."
              : "Start and monitor active bots."}
          </Text>
          <Button
            as={Link}
            href={hrefWithLocale(locale, "/dashboard/auto-trade")}
            className="mt-4"
            variant="secondary"
            block
          >
            {locale === "no" ? "Start bot" : "Start bot"}
          </Button>
        </Card>
      </div>

      {brief && (
        <Card className="border border-slate-200 bg-white p-6">
          <Text as="h3" className="text-lg font-semibold text-slate-900">
            {locale === "no" ? "Siste brief" : "Latest brief"}
          </Text>
          <Text
            as="p"
            className="mt-2 whitespace-pre-wrap text-sm text-slate-700"
          >
            {brief}
          </Text>
        </Card>
      )}
    </div>
  );
}
