import { Metadata } from "next";
import dynamic from "next/dynamic";
import { SURFACE } from "@/lib/design/tokens";
import HeroSection from "@/components/landing/HeroSection";
import { TrustStrip } from "@/components/landing/TrustStrip";
import { StickyCTA } from "@/components/landing/StickyCTA";
import { ScrollReveal } from "@/components/landing/ScrollReveal";
import {
  DemoWidgetSkeleton,
  CoursePreviewSkeleton,
  ThreeStepsSkeleton,
  LandingTransparencySkeleton,
  FinalCTASkeleton,
} from "@/components/landing/skeletons/BelowFoldSkeletons";

// Dynamic imports for below-fold components (Phase 3: Code Splitting)
// Keeps initial bundle small for better LCP
const DemoWidget = dynamic(
  () => import("@/components/landing/DemoWidget").then((mod) => mod.DemoWidget),
  {
    loading: () => <DemoWidgetSkeleton />,
    ssr: true,
  }
);

const CoursePreview = dynamic(
  () => import("@/components/landing/CoursePreview").then((mod) => mod.CoursePreview),
  {
    loading: () => <CoursePreviewSkeleton />,
    ssr: true,
  }
);

const ThreeSteps = dynamic(
  () => import("@/components/landing/ThreeSteps").then((mod) => mod.ThreeSteps),
  {
    loading: () => <ThreeStepsSkeleton />,
    ssr: true,
  }
);

const LandingTransparencySection = dynamic(
  () => import("@/components/landing/LandingTransparency").then((mod) => mod.LandingTransparencySection),
  {
    loading: () => <LandingTransparencySkeleton />,
    ssr: true,
  }
);

const FinalCTASection = dynamic(
  () => import("@/components/landing/FinalCTASection"),
  {
    loading: () => <FinalCTASkeleton />,
    ssr: true,
  }
);

const ROISimulator = dynamic(
  () => import("@/components/landing/ROISimulator").then((mod) => mod.ROISimulator),
  {
    loading: () => <div className="h-96 bg-kp-bg-primary animate-pulse" />,
  }
);

const FeaturesBentoGrid = dynamic(
  () => import("@/components/landing/FeaturesBentoGrid").then((mod) => mod.FeaturesBentoGrid),
  {
    loading: () => <div className="h-96 bg-kp-bg-primary animate-pulse" />,
  }
);

// ISR: Revalidate page every hour for fresh content
export const revalidate = 3600;

export const metadata: Metadata = {
  title: "Klarpakke - Bygg din økonomiske fremtid",
  description:
    "Lær å handle på kryptobørs med Klarpakkets kurs. Forstå markeder, risiko og strategier for å bygge din økonomiske fremtid.",
};

interface HomePageProps {
  params: Promise<{ locale: string }>;
}

export default async function HomePage({ params }: HomePageProps) {
  const { locale } = await params;

  return (
    <>
      <main className={`min-h-screen ${SURFACE.BG_LIGHT}`}>
        {/* Above-fold: Synchronous for LCP */}
        <HeroSection locale={locale} />
        <TrustStrip locale={locale} />

        {/* Below-fold: Dynamic imports with skeleton fallbacks + ScrollReveal */}
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
          <ROISimulator />
        </ScrollReveal>
        
        <ScrollReveal direction="up" delay={0.1}>
          <LandingTransparencySection locale={locale} />
        </ScrollReveal>
        
        <ScrollReveal direction="up" delay={0.1}>
          <ROISimulator />
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
