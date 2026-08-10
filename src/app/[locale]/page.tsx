import { setRequestLocale } from "next-intl/server";
import BevisHero from "@/components/landing/BevisHero";
import LofterSection from "@/components/landing/LofterSection";
import BacktestBevisSection from "@/components/landing/BacktestBevisSection";
import SlikVirkerDetSection from "@/components/landing/SlikVirkerDetSection";
import FounderSection from "@/components/landing/FounderSection";
import LandingFaq from "@/components/landing/LandingFaq";
import { generateMarketingMetadata } from "@/shared/ui/marketing";
import backtestBevis from "@/data/backtest-bevis.json";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  return generateMarketingMetadata({
    locale,
    namespace: "landing",
    titleKey: "metadata.title",
    descriptionKey: "metadata.description",
    pathname: "",
  });
}

interface HomePageProps {
  params: Promise<{ locale: string }>;
}

/**
 * Landing 2026-08-10 — Variant C «Beviset» (Tom-valgt av tre design-varianter).
 * Radikal åpenhet: løfter/aldri-løfter + backtest-bevis.
 *
 * Gamle seksjoner (HeroSection/FeaturesSection/TradingModesExplainer/CTASection/
 * LiveMarketTicker) er fjernet fra visningen, men filene ligger igjen urørt
 * i repoet frem til opprydding er godkjent.
 */
export default async function HomePage({ params }: HomePageProps) {
  const { locale } = await params;
  setRequestLocale(locale);

  return (
    <main>
      <BevisHero />
      <LofterSection />
      {/*
        Backtest-bevis med EKTE data (ukentlig GitHub Actions-cron regenererer
        src/data/backtest-bevis.json — build-time import, edge-safe).
        Vises uansett fortegn: «Beviset» viser også tap (metodekort m3).
      */}
      <BacktestBevisSection
        resultat={backtestBevis.resultat}
        holdBelop={backtestBevis.holdBelop}
      />
      <SlikVirkerDetSection />
      <FounderSection />
      <LandingFaq />
    </main>
  );
}
