import { Metadata } from "next";

import { SURFACE } from "@/lib/design/tokens";
import HeroSection from "@/components/landing/HeroSection";
import { TrustStrip } from "@/components/landing/TrustStrip";
import { StickyCTA } from "@/components/landing/StickyCTA";
import { DemoWidget } from "@/components/landing/DemoWidget";
import { ThreeSteps } from "@/components/landing/ThreeSteps";
import { CoursePreview } from "@/components/landing/CoursePreview";
import FinalCTASection from "@/components/landing/FinalCTASection";
import {
  LandingTransparencySection,
} from "@/components/landing/LandingTransparency";

// ISR: Regenerate page every hour
export const revalidate = 3600;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const isNorwegian = locale === "no";

  return {
    title: isNorwegian
      ? "Klarpakke — Lær crypto trygt fra dag én"
      : "Klarpakke — Learn crypto safely from day one",
    keywords: isNorwegian
      ? [
          "lær trading",
          "crypto kurs",
          "paper trading",
          "trading utdanning",
          "krypto skole",
        ]
      : [
          "learn trading",
          "crypto course",
          "paper trading",
          "trading education",
        ],
    openGraph: {
      title: isNorwegian
        ? "Klarpakke — Lær crypto trygt fra dag én"
        : "Klarpakke — Learn crypto safely from day one",
      description: isNorwegian
        ? "Norges eneste plattform med kurs, papirhandel og autotrading. Start gratis med kr 100 000 i øvingspenger."
        : "Norway's only platform with courses, paper trading and autotrading. Start free with kr 100,000 in virtual money.",
      type: "website",
      url: "https://www.klarpakke.no",
      images: [
        { url: "/og-image.png", width: 1200, height: 630, alt: "Klarpakke" },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title: isNorwegian
        ? "Klarpakke — Lær crypto trygt fra dag én"
        : "Klarpakke — Learn crypto safely from day one",
      description: isNorwegian
        ? "Kurs, papirhandel og auto-handel — i ett sted."
        : "Courses, paper trading and auto-trading in one place.",
    },
  };
}

export default async function HomePage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;

  return (
    <>
      <main className={`min-h-screen ${SURFACE.BG_LIGHT}`}>
        {/* Hero Section — Redesigned for mobile */}
        <HeroSection locale={locale} />

        {/* NEW: Trust Strip — Immediately after hero */}
        <TrustStrip />

        {/* Existing sections */}
        <DemoWidget />

        <CoursePreview />

        {/* Tre steg — anker #land-steg for støtte/dok */}
        <section id="land-steg" className="scroll-mt-24 max-w-6xl mx-auto px-4">
          <ThreeSteps />
        </section>

        <LandingTransparencySection locale={locale} />

        {/* Final CTA - sterk konvertering før footer */}
        <FinalCTASection />
      </main>

      {/* NEW: Sticky CTA — Mobile only */}
      <StickyCTA />
    </>
  );
}
