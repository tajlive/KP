import { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import PriserBevis from "@/components/priser/PriserBevis";
import LiveMarketTicker from "@/components/landing/LiveMarketTicker";

export const runtime = "nodejs";

/**
 * /priser — Variant C «Beviset» (mega-plan Oppgave 1.3, 2026-08-10).
 *
 * 3-tier-struktur LÅST av Tom: Student gratis / Pro 399 / Pro+ 799.
 * Gamle 5-tier-checkout (ClientPricingPage/PricingGrid + bachelor…professor)
 * er fjernet fra visning — filene ligger urørt igjen til Stripe-migrering
 * er gjort i Hermes-sone. success/cancel-rutene er uberørt.
 */
export default async function PriserPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  await params;
  return <PriserBevis tickerSlot={<LiveMarketTicker />} />;
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "meta.pricing" });
  return {
    title: t("title"),
    description: t("description"),
    openGraph: {
      title: t("title"),
      description: t("description"),
    },
  };
}
