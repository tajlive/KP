import { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { Suspense } from "react";
import dynamic from "next/dynamic";

// Eager load kritisk komponent
import { LiveTicker } from "@/components/landing/LiveTicker";

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

const MinimalFooter = dynamic(
  () => import("@/components/landing/MinimalFooter").then((mod) => ({ default: mod.MinimalFooter })),
  {
    loading: () => <div className="h-32 bg-slate-950" />,
  }
);

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
      ? "Klarpakke — Norges krypto-skole"
      : "Klarpakke — Norway's Crypto School",
    description: isNorwegian
      ? "Lær krypto. Øv med lekepenger. Tjen når du er klar. Norges eneste plattform med kurs, autotrading og papirhandel."
      : "Learn crypto. Practice with play money. Earn when you're ready. Norway's only platform with courses, autotrading, and paper trading.",
    keywords: isNorwegian
      ? ["trading kurs", "lær trading", "paper trading", "trading utdanning", "crypto trading", "krypto skole"]
      : ["trading course", "learn trading", "paper trading", "trading education", "crypto trading"],
    openGraph: {
      title: isNorwegian ? "Klarpakke — Norges krypto-skole" : "Klarpakke — Norway's Crypto School",
      description: isNorwegian
        ? "Lær krypto. Øv med lekepenger. Tjen når du er klar."
        : "Learn crypto. Practice with play money. Earn when you're ready.",
      type: "website",
      url: "https://www.klarpakke.no",
      images: [{ url: "/og-image.png", width: 1200, height: 630, alt: "Klarpakke" }],
    },
    twitter: {
      card: "summary_large_image",
      title: isNorwegian ? "Klarpakke — Norges krypto-skole" : "Klarpakke — Norway's Crypto School",
      description: isNorwegian
        ? "Lær krypto. Øv med lekepenger. Tjen når du er klar."
        : "Learn crypto. Practice with play money. Earn when you're ready.",
    },
  };
}

// HeroSection - Critical for LCP, keep inline
function HeroSection({ locale }: { locale: string }) {
  const isNorwegian = locale === 'no';
  
  return (
    <section className="relative py-16 md:py-24 lg:py-32 overflow-hidden">
      <div className="max-w-6xl mx-auto px-4">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          {/* Left: Text - CRITICAL LCP CONTENT */}
          <div className="text-center lg:text-left">
            <h1 className="font-fraunces text-4xl md:text-5xl lg:text-6xl font-bold text-slate-100 leading-tight mb-6">
              {isNorwegian ? (
                <>Lær krypto.<br />Øv med <span className="text-teal-400">lekepenger</span>.<br />Tjen når du er klar.</>
              ) : (
                <>Learn crypto.<br />Practice with <span className="text-teal-400">play money</span>.<br />Earn when ready.</>
              )}
            </h1>
            <p className="font-lexend text-lg text-slate-400 mb-8 max-w-xl mx-auto lg:mx-0">
              {isNorwegian
                ? "Norges eneste plattform med kurs, autotrading og papirhandel. Start gratis — ingen kredittkort nødvendig."
                : "Norway's only platform with courses, autotrading, and paper trading. Start free — no credit card required."
              }
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start">
              <a
                href="/innlogging"
                className="bg-teal-500 hover:bg-teal-600 text-white font-lexend font-medium px-8 py-4 rounded-xl transition-colors text-center"
              >
                {isNorwegian ? "Start gratis" : "Start free"}
              </a>
              <a
                href="#lottocalc"
                className="bg-slate-800 hover:bg-slate-700 text-slate-200 font-lexend font-medium px-8 py-4 rounded-xl transition-colors text-center"
              >
                {isNorwegian ? "Se kalkulator" : "See calculator"}
              </a>
            </div>
          </div>

          {/* Right: Dashboard Preview - LAZY LOADED */}
          <div className="relative">
            <div className="absolute inset-0 bg-teal-500/20 blur-3xl rounded-full" />
            <Suspense fallback={
              <div className="bg-slate-900 rounded-2xl border border-slate-700 h-64 animate-pulse" />
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
      {/* Live Price Ticker - Critical */}
      <LiveTicker />
      
      {/* Hero Section - Critical for LCP */}
      <HeroSection locale={locale} />
      
      {/* Lotto Comparison Calculator - Lazy loaded */}
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
      
      {/* Minimal Footer - Lazy loaded */}
      <Suspense fallback={<div className="h-32 bg-slate-950" />}>
        <MinimalFooter />
      </Suspense>
    </main>
  );
}
