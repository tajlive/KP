import { Metadata } from "next";
import dynamic from "next/dynamic";
import { Suspense } from "react";

// Deferred load for LiveTicker - not critical for LCP
import { SURFACE } from "@/lib/design/tokens";
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
      <div className="h-96 animate-pulse bg-slate-100 rounded-xl" />
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
      <div className="h-64 animate-pulse bg-slate-100 rounded-xl" />
    ),
  },
);

const CoursePreview = dynamic(
  () =>
    import("@/components/landing/CoursePreview").then((mod) => ({
      default: mod.CoursePreview,
    })),
  {
    loading: () => (
      <div className="h-96 animate-pulse bg-slate-100 rounded-xl" />
    ),
  },
);

const FinalCTASection = dynamic(
  () => import("@/components/landing/FinalCTASection"),
  {
    loading: () => (
      <div className="h-64 animate-pulse bg-slate-200 dark:bg-slate-800 rounded-xl" />
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
      ? "Norges eneste plattform med kurs, papirhandel og autotrading. Start gratis med kr 100 000 i øvingspenger — ingen kredittkort."
      : "Norway's only platform with courses, paper trading and autotrading. Start free with kr 100,000 in virtual money — no credit card.",
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
    <main className={`min-h-screen ${SURFACE.BG_LIGHT}`}>
      <HeroSection locale={locale} />

      {/* Live Price Ticker - right under hero, light mode */}
      <DeferredLiveTicker />

      <TrustBar locale={locale} />

      <Suspense
        fallback={
          <div className="h-96 animate-pulse bg-slate-100 rounded-xl" />
        }
      >
        <DemoWidget />
      </Suspense>

      <Suspense
        fallback={
          <div className="h-96 animate-pulse bg-slate-100 rounded-xl" />
        }
      >
        <CoursePreview />
      </Suspense>

      {/* Three Steps - Lazy loaded */}
      <section className="max-w-6xl mx-auto px-4">
        <Suspense
          fallback={
            <div className="h-64 animate-pulse bg-slate-100 rounded-xl" />
          }
        >
          <ThreeSteps />
        </Suspense>
      </section>

      {/* Final CTA - sterk konvertering før footer */}
      <Suspense
        fallback={
          <div className="h-64 animate-pulse bg-slate-200 dark:bg-slate-800 rounded-xl" />
        }
      >
        <FinalCTASection language={locale === "no" ? "no" : "en"} />
      </Suspense>
    </main>
  );
}
