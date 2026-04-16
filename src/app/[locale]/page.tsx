import { Metadata } from "next";
import dynamic from "next/dynamic";
import { SURFACE } from "@/lib/design/tokens";
import SanityHeroSection from "@/features/landing/SanityHeroSection";
import { KLTTeaser } from "@/features/landing/KLTTeaser";
import { TrustStrip } from "@/features/landing/TrustStrip";
import { LiveProofStrip } from "@/features/landing/LiveProofStrip";
import { StickyCTA } from "@/features/landing/StickyCTA";
import { ScrollReveal } from "@/features/landing/ScrollReveal";
import {
  DemoWidgetSkeleton,
  CoursePreviewSkeleton,
  ThreeStepsSkeleton,
  LandingTransparencySkeleton,
  FinalCTASkeleton,
} from "@/features/landing/skeletons/BelowFoldSkeletons";

// Dynamic imports for below-fold components (Phase 3: Code Splitting)
// Keeps initial bundle small for better LCP
const DemoWidget = dynamic(
  () => import("@/features/landing/DemoWidget").then((mod) => mod.DemoWidget),
  {
    loading: () => <DemoWidgetSkeleton />,
    ssr: true,
  }
);

const CoursePreview = dynamic(
  () => import("@/features/landing/CoursePreview").then((mod) => mod.CoursePreview),
  {
    loading: () => <CoursePreviewSkeleton />,
    ssr: true,
  }
);

const ThreeSteps = dynamic(
  () => import("@/features/landing/ThreeSteps").then((mod) => mod.ThreeSteps),
  {
    loading: () => <ThreeStepsSkeleton />,
    ssr: true,
  }
);

const LandingTransparencySection = dynamic(
  () => import("@/features/landing/LandingTransparency").then((mod) => mod.LandingTransparencySection),
  {
    loading: () => <LandingTransparencySkeleton />,
    ssr: true,
  }
);

const FinalCTASection = dynamic(
  () => import("@/features/landing/FinalCTASection"),
  {
    loading: () => <FinalCTASkeleton />,
    ssr: true,
  }
);

const LeaderboardPreview = dynamic(
  () => import("@/features/landing/LeaderboardPreview").then((mod) => mod.LeaderboardPreview),
  {
    loading: () => <div className="h-96 bg-kp-bg-primary animate-pulse" />,
    ssr: true,
  }
);

const FeaturesBentoGrid = dynamic(
  () => import("@/features/landing/FeaturesBentoGrid").then((mod) => mod.FeaturesBentoGrid),
  {
    loading: () => <div className="h-96 bg-kp-bg-primary animate-pulse" />,
  }
);

const BacktestROICoupled = dynamic(
  () => import("@/features/landing/BacktestROICoupled").then((mod) => mod.BacktestROICoupled),
  {
    loading: () => <div className="h-[600px] bg-kp-bg-primary animate-pulse" />,
  }
);

// ISR: Revalidate page every hour for fresh content
export const revalidate = 3600;

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
        <LiveProofStrip />
        <TrustStrip locale={locale} />

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
          <BacktestROICoupled />
        </ScrollReveal>

        <ScrollReveal direction="up" delay={0.1}>
          <FeaturesBentoGrid />
        </ScrollReveal>
        
        <ScrollReveal direction="up" delay={0.1}>
          <LandingTransparencySection locale={locale} />
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
