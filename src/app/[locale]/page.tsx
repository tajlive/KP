import { setRequestLocale } from "next-intl/server";
import { SURFACE } from "@/lib/design/tokens";
import { LandingHero } from "@/features/landing/LandingHero";
import { InteractiveDemo } from "@/features/landing/InteractiveDemo";
import { SocialProofBanner } from "@/features/landing/SocialProofBanner";
import { SafetySection } from "@/features/landing/SafetySection";
import { TrustStrip } from "@/features/landing/TrustStrip";
import { FeaturesBentoGrid } from "@/features/landing/FeaturesBentoGrid";
import { ThreeSteps } from "@/features/landing/ThreeSteps";
import SanityFAQSection from "@/features/landing/SanityFAQSection";
import { StickyCTA } from "@/features/landing/StickyCTA";
import SanityTestimonials from "@/features/landing/SanityTestimonials";
import { AboutKlarpakkeSection } from "@/features/landing/AboutKlarpakkeSection";

import {
  MarketingPageShell,
  generateMarketingMetadata,
} from "@/shared/ui/marketing";

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

export default async function HomePage({ params }: HomePageProps) {
  const { locale } = await params;
  setRequestLocale(locale);

  return (
    <MarketingPageShell className={SURFACE.BG}>
      <LandingHero />
      <SocialProofBanner />
      <SafetySection />
      <TrustStrip />
      <FeaturesBentoGrid />
      <ThreeSteps />
      <SanityTestimonials />
      <SanityFAQSection />
      <AboutKlarpakkeSection locale={locale} />
      <StickyCTA />
    </MarketingPageShell>
  );
}
