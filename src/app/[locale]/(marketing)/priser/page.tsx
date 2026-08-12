import { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { BetaPricingPage } from "@/components/BetaPricingPage";

export const runtime = "nodejs";

/**
 * /priser — P0 kundevendt (2026-08-12): beta.
 * Betaling er ikke åpent. Siden viser informasjonskort om lekepenger,
 * ingen priser, ingen kortfelt, ingen checkout. CTA → /register.
 * Tidligere PriserBevis (3-tier, 399/799) er fjernet fra visning;
 * filen ligger urørt til betaling faktisk åpner.
 */
export default async function PriserPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  await params;
  return <BetaPricingPage />;
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "betaUi" });
  return {
    title: t("metaTitle"),
    description: t("metaDescription"),
    openGraph: {
      title: t("metaTitle"),
      description: t("metaDescription"),
    },
  };
}
