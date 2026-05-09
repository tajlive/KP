import { Metadata } from "next";
import dynamicImport from "next/dynamic";
import { SURFACE } from "@/lib/design/tokens";
import SanityHeroSection from "@/features/landing/SanityHeroSection";
import SanityFAQSection from "@/features/landing/SanityFAQSection";

import { KLTTeaser } from "@/features/landing/KLTTeaser";
import { StickyCTA } from "@/features/landing/StickyCTA";
import { ScrollReveal } from "@/features/landing/ScrollReveal";
import {
  DemoWidgetSkeleton,
  CoursePreviewSkeleton,
  ThreeStepsSkeleton,
  FinalCTASkeleton,
} from "@/features/landing/skeletons/BelowFoldSkeletons";

const DemoWidget = dynamicImport(
  () => import("@/features/landing/DemoWidget").then((mod) => mod.DemoWidget),
  {
    loading: () => <DemoWidgetSkeleton />,
    ssr: true,
  }
);

const CoursePreview = dynamicImport(
  () => import("@/features/landing/CoursePreview").then((mod) => mod.CoursePreview),
  {
    loading: () => <CoursePreviewSkeleton />,
    ssr: true,
  }
);

const ThreeSteps = dynamicImport(
  () => import("@/features/landing/ThreeSteps").then((mod) => mod.ThreeSteps),
  {
    loading: () => <ThreeStepsSkeleton />,
    ssr: true,
  }
);

const FinalCTASection = dynamicImport(
  () => import("@/features/landing/FinalCTASection"),
  {
    loading: () => <FinalCTASkeleton />,
    ssr: true,
  }
);

const LeaderboardPreview = dynamicImport(
  () => import("@/features/landing/LeaderboardPreview").then((mod) => mod.LeaderboardPreview),
  {
    loading: () => <div className="h-96 bg-kp-bg-primary animate-pulse" />,
    ssr: true,
  }
);

const FeaturesBentoGrid = dynamicImport(
  () => import("@/features/landing/FeaturesBentoGrid").then((mod) => mod.FeaturesBentoGrid),
  {
    loading: () => <div className="h-96 bg-kp-bg-primary animate-pulse" />,
    ssr: true,
  }
);

// ISR: Revalidate every 60s, Sanity webhook invalidates on content change
export const revalidate = 60;

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
        {/* Below-fold: Dynamic imports with skeleton fallbacks + ScrollReveal */}
        <ScrollReveal direction="up" delay={0.1}>
          <LeaderboardPreview />
        </ScrollReveal>

        <ScrollReveal direction="up" delay={0.1}>
          <DemoWidget />
        </ScrollReveal>

        <ScrollReveal direction="up" delay={0.1}>
          <CoursePreview />
        </ScrollReveal>

        <ScrollReveal direction="up" delay={0.1}>
          <section id="land-steg" className="scroll-mt-24 max-w-6xl mx-auto px-4">
            <ThreeSteps />
          </section>
        </ScrollReveal>

        <ScrollReveal direction="up" delay={0.1}>
          <FeaturesBentoGrid />
        </ScrollReveal>

        <ScrollReveal direction="up" delay={0.1}>
          <SanityFAQSection locale={locale} />
        </ScrollReveal>

        <ScrollReveal direction="up" delay={0.1}>
          <FinalCTASection />
        </ScrollReveal>
      </main>

      {/* Mobile sticky CTA - always visible on mobile */}
      <StickyCTA />
    </>
  );
}
