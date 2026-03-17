import { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import dynamic from "next/dynamic";
import { Suspense } from "react";

// Deferred load for LiveTicker - not critical for LCP
import { DeferredLiveTicker } from "@/components/landing/DeferredLiveTicker";
import HeroSection from "@/components/landing/HeroSection";
import { TrustBar } from "@/components/landing/TrustBar";

const DemoWidget = dynamic(
  () =>
    import("@/components/landing/DemoWidget").then((mod) => ({
      default: mod.DemoWidget,
    })),
  {
    loading: () => (
      <div className="h-96 animate-pulse bg-slate-900/50 rounded-xl" />
    ),
  },
);

const EmailCapture = dynamic(
  () =>
    import("@/components/landing/EmailCapture").then((mod) => ({
      default: mod.EmailCapture,
    })),
  {
    loading: () => (
      <div className="h-48 animate-pulse bg-slate-900/50 rounded-xl" />
    ),
  },
);

// Lazy load ikke-kritiske komponenter for bedre LCP
const LottoComparison = dynamic(
  () =>
    import("@/components/landing/LottoComparison").then((mod) => ({
      default: mod.LottoComparison,
    })),
  {
    loading: () => (
      <div className="h-96 animate-pulse bg-slate-900/50 rounded-xl" />
    ),
  },
);

const ThreeSteps = dynamic(
  () =>
    import("@/components/landing/ThreeSteps").then((mod) => ({
      default: mod.ThreeSteps,
    })),
  {
    loading: () => (
      <div className="h-64 animate-pulse bg-slate-900/50 rounded-xl" />
    ),
  },
);

const Testimonials = dynamic(
  () =>
    import("@/components/landing/Testimonials").then((mod) => ({
      default: mod.Testimonials,
    })),
  { ssr: true },
);

const CoursePreview = dynamic(
  () =>
    import("@/components/landing/CoursePreview").then((mod) => ({
      default: mod.CoursePreview,
    })),
  {
    loading: () => (
      <div className="h-96 animate-pulse bg-slate-900/50 rounded-xl" />
    ),
  },
);

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
    description: isNorwegian
      ? "Norges eneste plattform med kurs, papirhandel og autotrading. Start gratis med kr 10 000 i øvingspenger — ingen kredittkort."
      : "Norway's only platform with courses, paper trading and autotrading. Start free with kr 10,000 in virtual money — no credit card.",
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
        ? "Norges eneste plattform med kurs, papirhandel og autotrading. Start gratis med kr 10 000 i øvingspenger."
        : "Norway's only platform with courses, paper trading and autotrading. Start free with kr 10,000 in virtual money.",
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
        ? "Norges eneste plattform med kurs, papirhandel og autotrading."
        : "Norway's only platform with courses, paper trading and autotrading.",
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
    <main className="min-h-screen bg-slate-950">
      {/* Hero Section - 2026 copy, locale-aware links */}
      <HeroSection locale={locale} />

      {/* Trust Bar - Social proof */}
      <TrustBar />

      {/* Interactive Demo Widget - Paper trading teaser */}
      <Suspense
        fallback={
          <div className="h-96 animate-pulse bg-slate-900/50 rounded-xl" />
        }
      >
        <DemoWidget />
      </Suspense>

      {/* Course Preview - Show what users will learn */}
      <Suspense
        fallback={
          <div className="h-96 animate-pulse bg-slate-900/50 rounded-xl" />
        }
      >
        <CoursePreview />
      </Suspense>

      {/* Live Price Ticker - Deferred, loads after hero */}
      <DeferredLiveTicker />

      {/* Lotto Comparison Calculator - Shows what users can achieve */}
      <section id="lottocalc" className="py-16 md:py-24">
        <div className="max-w-4xl mx-auto px-4">
          <Suspense
            fallback={
              <div className="h-96 animate-pulse bg-slate-900/50 rounded-xl" />
            }
          >
            <LottoComparison />
          </Suspense>
        </div>
      </section>

      {/* Three Steps - Lazy loaded */}
      <section className="max-w-6xl mx-auto px-4">
        <Suspense
          fallback={
            <div className="h-64 animate-pulse bg-slate-900/50 rounded-xl" />
          }
        >
          <ThreeSteps />
        </Suspense>
      </section>

      {/* Testimonials - Social proof for signup */}
      <Suspense
        fallback={
          <div className="h-96 animate-pulse bg-slate-900/50 rounded-xl" />
        }
      >
        <Testimonials language={locale === "no" ? "no" : "en"} />
      </Suspense>

      {/* Email Lead Capture - Above footer */}
      <Suspense
        fallback={
          <div className="h-48 animate-pulse bg-slate-900/50 rounded-xl" />
        }
      >
        <EmailCapture />
      </Suspense>
    </main>
  );
}
