import { SURFACE } from "@/lib/design/tokens";
import SanityHeroSection from "@/features/landing/SanityHeroSection";
import SanityFAQSection from "@/features/landing/SanityFAQSection";
import { AboutKlarpakkeSection } from "@/features/landing/AboutKlarpakkeSection";
import { BelowFoldSections } from "@/features/landing/BelowFoldSections";

import { KLTTeaser } from "@/features/landing/KLTTeaser";
import { StickyCTA } from "@/features/landing/StickyCTA";
import { ScrollReveal } from "@/features/landing/ScrollReveal";
import {
  MarketingPageShell,
  generateMarketingMetadata,
} from "@/shared/ui/marketing";

export const runtime = "nodejs";

// ISR: Revalidate every 60s, Sanity webhook invalidates on content change
export const dynamic = "force-dynamic"; // Was: revalidate = 60 (ISR not supported on Cloudflare)

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

export default async function HomePage({ params }: HomePageProps) {
  const { locale } = await params;

  return (
    <MarketingPageShell className={SURFACE.BG_LIGHT}>
      {/* Above-fold: Synchronous for LCP */}
      <SanityHeroSection locale={locale} />
      <KLTTeaser locale={locale} />

      {/* About section: purpose + privacy/terms links for Google OAuth verification */}
      <AboutKlarpakkeSection locale={locale} />

      {/* Below-fold: Lazy-loaded client-side only (ssr: false) */}
      <BelowFoldSections />

      {/* FAQ: Server Component, lightweight — kept synchronous with ScrollReveal */}
      <ScrollReveal direction="up" delay={0.1}>
        <SanityFAQSection locale={locale} />
      </ScrollReveal>

      {/* Mobile sticky CTA - always visible on mobile */}
      <StickyCTA />
    </MarketingPageShell>
  );
}
