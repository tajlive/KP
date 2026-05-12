import { Metadata } from "next";
import { SURFACE } from "@/lib/design/tokens";
import SanityHeroSection from "@/features/landing/SanityHeroSection";
import SanityFAQSection from "@/features/landing/SanityFAQSection";
import { BelowFoldSections } from "@/features/landing/BelowFoldSections";

import { KLTTeaser } from "@/features/landing/KLTTeaser";
import { StickyCTA } from "@/features/landing/StickyCTA";
import { ScrollReveal } from "@/features/landing/ScrollReveal";

export const runtime = 'edge';

// ISR: Revalidate every 60s, Sanity webhook invalidates on content change
export const dynamic = "force-dynamic"; // Was: revalidate = 60 (ISR not supported on Cloudflare)

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const isEn = locale === "en";

  return {
    title: isEn
      ? "Klarpakke - Build your financial future"
      : "Klarpakke - Bygg din økonomiske fremtid",
    description: isEn
      ? "Learn to trade on crypto exchanges with Klarpakke courses. Understand markets, risk, and strategies to build your financial future."
      : "Lær å handle på kryptobørs med Klarpakkets kurs. Forstå markeder, risiko og strategier for å bygge din økonomiske fremtid.",
  };
}

interface HomePageProps {
  params: Promise<{ locale: string }>;
}

export default async function HomePage({ params }: HomePageProps) {
  const { locale } = await params;

  return (
    <>
      <main className={`min-h-screen ${SURFACE.BG_LIGHT}`}>
        {/* Above-fold: Synchronous for LCP */}
        <SanityHeroSection locale={locale} />
        <KLTTeaser locale={locale} />

        {/* Below-fold: Lazy-loaded client-side only (ssr: false) */}
        <BelowFoldSections />

        {/* FAQ: Server Component, lightweight — kept synchronous with ScrollReveal */}
        <ScrollReveal direction="up" delay={0.1}>
          <SanityFAQSection locale={locale} />
        </ScrollReveal>
      </main>

      {/* Mobile sticky CTA - always visible on mobile */}
      <StickyCTA />
    </>
  );
}
