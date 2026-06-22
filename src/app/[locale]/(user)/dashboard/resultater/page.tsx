import TradingResultsDashboard from "@/features/portfolio/TradingResultsDashboard";
import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";

export const runtime = 'nodejs';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "tradingResults" });
  return {
    title: t("meta.title"),
    description: t("meta.description"),
  };
}

export default function TradingResultsPage() {
  return <TradingResultsDashboard />;
}
