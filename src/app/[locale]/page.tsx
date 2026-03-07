import ComparisonSection from "@/components/landing/ComparisonSection";
import FAQSection from "@/components/landing/FAQSection";
import FinalCTASection from "@/components/landing/FinalCTASection";
import GamifiedLeaderboard from "@/components/landing/GamifiedLeaderboard";
import HeroSection from "@/components/landing/HeroSection";
import { LivePriceTicker } from "@/components/landing/LivePriceTicker";
import { LottoCalculator } from "@/components/landing/LottoCalculator";
import PricingSection from "@/components/landing/PricingSection";
import SafeBacktestWidget from "@/components/landing/SafeBacktestWidget";
import SocialProofSection from "@/components/landing/SocialProofSection";
import { Metadata } from "next";
import { getTranslations } from "next-intl/server";

// ISR - oppdateres hver time
export const revalidate = 3600;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "metadata" });

  return {
    title: t("title"),
    description: t("description"),
    keywords:
      locale === "no"
        ? ["trading kurs", "lær trading", "paper trading", "trading utdanning", "crypto trading"]
        : ["trading course", "learn trading", "paper trading", "trading education", "crypto trading"],
    openGraph: {
      title: t("ogTitle"),
      description: t("ogDescription"),
      type: "website",
      url: "https://www.klarpakke.no",
      images: [{ url: "/og-image.png", width: 1200, height: 630, alt: "Klarpakke" }],
    },
    twitter: {
      card: "summary_large_image",
      title: t("ogTitle"),
      description: t("ogDescription"),
    },
  };
}

export default function HomePage() {
  return (
    <>
      <LivePriceTicker />
      <HeroSection />
      <LottoCalculator />
      <SocialProofSection />
      <GamifiedLeaderboard />
      <SafeBacktestWidget />
      <ComparisonSection />
      <PricingSection />
      <FAQSection />
      <FinalCTASection />
    </>
  );
}
