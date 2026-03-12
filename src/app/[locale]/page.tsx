import { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { Suspense } from "react";
import dynamic from "next/dynamic";

// Deferred load for LiveTicker - not critical for LCP
import { DeferredLiveTicker } from "@/components/landing/DeferredLiveTicker";
import { TrustBar } from "@/components/landing/TrustBar";

// Lazy load ikke-kritiske komponenter for bedre LCP
const DashboardPreview = dynamic(
  () => import("@/components/landing/DashboardPreview").then((mod) => ({ default: mod.DashboardPreview })),
  {
    loading: () => (
      <div className="bg-slate-900 rounded-2xl border border-slate-700 h-64 animate-pulse" />
    ),
  }
);

const LottoComparison = dynamic(
  () => import("@/components/landing/LottoComparison").then((mod) => ({ default: mod.LottoComparison })),
  {
    loading: () => <div className="h-96 animate-pulse bg-slate-900/50 rounded-xl" />,
  }
);

const ThreeSteps = dynamic(
  () => import("@/components/landing/ThreeSteps").then((mod) => ({ default: mod.ThreeSteps })),
  {
    loading: () => <div className="h-64 animate-pulse bg-slate-900/50 rounded-xl" />,
  }
);

const CoursePreview = dynamic(
  () => import("@/components/landing/CoursePreview").then((mod) => ({ default: mod.CoursePreview })),
  {
    loading: () => <div className="h-96 animate-pulse bg-slate-900/50 rounded-xl" />,
  }
);

// ISR: Regenerate page every hour
export const revalidate = 3600;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const isNorwegian = locale === 'no';

  return {
    title: isNorwegian 
      ? "Klarpakke — Lær crypto trygt fra dag én"
      : "Klarpakke — Learn crypto safely from day one",
    description: isNorwegian
      ? "Norges eneste plattform med kurs, papirhandel og autotrading. Start gratis med kr 10 000 i øvingspenger — ingen kredittkort."
      : "Norway's only platform with courses, paper trading and autotrading. Start free with kr 10,000 in virtual money — no credit card.",
    keywords: isNorwegian
      ? ["lær trading", "crypto kurs", "paper trading", "trading utdanning", "krypto skole"]
      : ["learn trading", "crypto course", "paper trading", "trading education"],
    openGraph: {
      title: isNorwegian ? "Klarpakke — Lær crypto trygt fra dag én" : "Klarpakke — Learn crypto safely from day one",
      description: isNorwegian
        ? "Norges eneste plattform med kurs, papirhandel og autotrading. Start gratis med kr 10 000 i øvingspenger."
        : "Norway's only platform with courses, paper trading and autotrading. Start free with kr 10,000 in virtual money.",
      type: "website",
      url: "https://www.klarpakke.no",
      images: [{ url: "/og-image.png", width: 1200, height: 630, alt: "Klarpakke" }],
    },
    twitter: {
      card: "summary_large_image",
      title: isNorwegian ? "Klarpakke — Lær crypto trygt fra dag én" : "Klarpakke — Learn crypto safely from day one",
      description: isNorwegian
        ? "Norges eneste plattform med kurs, papirhandel og autotrading."
        : "Norway's only platform with courses, paper trading and autotrading.",
    },
  };
}

// HeroSection - Critical for LCP, keep inline
async function HeroSection({ locale }: { locale: string }) {
  const t = await getTranslations('hero');
  
  return (
    <section className="relative py-16 md:py-24 lg:py-32 overflow-hidden">
      <div className="max-w-6xl mx-auto px-4">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          {/* Left: Text - CRITICAL LCP CONTENT */}
          <div className="text-center lg:text-left">
            <h1 className="font-fraunces text-4xl md:text-5xl lg:text-6xl font-bold text-slate-100 leading-tight mb-6">
              {t('headline')}<br /><span className="text-teal-400">{t('headlineHighlight')}</span>
            </h1>
            <p className="font-lexend text-lg text-slate-400 mb-8 max-w-xl mx-auto lg:mx-0">
              {t('description')}
            </p>
            
            {/* CTA Hierarchy */}
            <div className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start mb-6">
              <a
                href={`/${locale}/signup`}
                className="bg-teal-500 hover:bg-teal-400 text-white font-lexend font-bold px-8 py-4 rounded-xl shadow-lg shadow-teal-500/30 transition-all text-center"
              >
                {t('ctaPrimary')} →
              </a>
              <a
                href={`/${locale}/kurs`}
                className="bg-transparent border-2 border-slate-600 hover:border-slate-400 text-slate-200 font-lexend font-medium px-8 py-4 rounded-xl transition-colors text-center"
              >
                {t('ctaSecondary')}
              </a>
            </div>
            
            {/* Trust line */}
            <p className="text-sm text-slate-500">
              {t('trust')}
            </p>
          </div>

          {/* Right: Dashboard Preview - LAZY LOADED */}
          <div className="relative w-full">
            <div className="absolute inset-0 bg-teal-500/20 blur-3xl rounded-full" />
            <Suspense fallback={
              <div className="bg-slate-900 rounded-2xl border border-slate-700 h-64 animate-pulse max-w-lg mx-auto" />
            }>
              <DashboardPreview />
            </Suspense>
          </div>
        </div>
      </div>
    </section>
  );
}

export default async function HomePage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;

  return (
    <main className="min-h-screen bg-slate-950">
      {/* Hero Section - Critical for LCP */}
      <HeroSection locale={locale} />
      
      {/* Trust Bar - Social proof */}
      <TrustBar />
      
      {/* Course Preview - Show what users will learn */}
      <Suspense fallback={<div className="h-96 animate-pulse bg-slate-900/50 rounded-xl" />}>
        <CoursePreview />
      </Suspense>
      
      {/* Live Price Ticker - Deferred, loads after hero */}
      <DeferredLiveTicker />
      
      {/* Lotto Comparison Calculator - Shows what users can achieve */}
      <section id="lottocalc" className="py-16 md:py-24">
        <div className="max-w-4xl mx-auto px-4">
          <Suspense fallback={<div className="h-96 animate-pulse bg-slate-900/50 rounded-xl" />}>
            <LottoComparison />
          </Suspense>
        </div>
      </section>
      
      {/* Three Steps - Lazy loaded */}
      <section className="max-w-6xl mx-auto px-4">
        <Suspense fallback={<div className="h-64 animate-pulse bg-slate-900/50 rounded-xl" />}>
          <ThreeSteps />
        </Suspense>
      </section>
      

    </main>
  );
}
