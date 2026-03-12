import { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { Suspense } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";

// Deferred load for LiveTicker - not critical for LCP
import { DeferredLiveTicker } from "@/components/landing/DeferredLiveTicker";

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

// Course preview cards
function CoursePreview({ locale }: { locale: string }) {
  const isNorwegian = locale === 'no';
  
  const courses = [
    {
      title: isNorwegian ? "Hva er Bitcoin?" : "What is Bitcoin?",
      level: isNorwegian ? "Nybegynner" : "Beginner",
      time: "15 min",
      icon: "₿",
    },
    {
      title: isNorwegian ? "Slik leser du en chart" : "How to read charts",
      level: isNorwegian ? "Nybegynner" : "Beginner",
      time: "20 min",
      icon: "📊",
    },
    {
      title: isNorwegian ? "Din første papirhandel" : "Your first paper trade",
      level: isNorwegian ? "Nybegynner" : "Beginner",
      time: "10 min",
      icon: "🎯",
    },
  ];

  return (
    <section className="py-12 bg-slate-900/50">
      <div className="max-w-6xl mx-auto px-4">
        <div className="text-center mb-8">
          <h2 className="text-2xl md:text-3xl font-bold text-slate-100 mb-3">
            {isNorwegian ? "Start med disse kursene" : "Start with these courses"}
          </h2>
          <p className="text-slate-400">
            {isNorwegian ? "Gratis å starte — fullfør på din egen tid" : "Free to start — complete at your own pace"}
          </p>
        </div>
        
        <div className="grid md:grid-cols-3 gap-6">
          {courses.map((course, idx) => (
            <div 
              key={idx}
              className="bg-slate-800 rounded-xl p-6 border border-slate-700 hover:border-teal-500/50 transition-colors group cursor-pointer"
            >
              <div className="flex items-center justify-between mb-4">
                <span className="text-3xl">{course.icon}</span>
                <span className="text-xs font-medium text-teal-400 bg-teal-500/10 px-2 py-1 rounded">
                  {isNorwegian ? "Gratis" : "Free"}
                </span>
              </div>
              <h3 className="text-lg font-semibold text-slate-100 mb-2 group-hover:text-teal-400 transition-colors">
                {course.title}
              </h3>
              <div className="flex items-center gap-3 text-sm text-slate-500">
                <span>{course.level}</span>
                <span>·</span>
                <span>{course.time}</span>
              </div>
              <div className="mt-4 h-1 bg-slate-700 rounded-full overflow-hidden">
                <div className="h-full w-0 bg-teal-500 rounded-full" />
              </div>
            </div>
          ))}
        </div>
        
        <div className="text-center mt-8">
          <Link 
            href="/kurs"
            className="inline-flex items-center gap-2 text-teal-400 hover:text-teal-300 font-medium transition-colors"
          >
            {isNorwegian ? "Se alle kursene" : "Browse all courses"}
            <span>→</span>
          </Link>
        </div>
      </div>
    </section>
  );
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
                <>Lær å handle crypto<br /><span className="text-teal-400">trygt fra dag én.</span></>
              ) : (
                <>Learn to trade crypto<br /><span className="text-teal-400">safely from day one.</span></>
              )}
            </h1>
            <p className="font-lexend text-lg text-slate-400 mb-8 max-w-xl mx-auto lg:mx-0">
              {isNorwegian
                ? "Norges eneste plattform med kurs, papirhandel og autotrading. Start gratis med kr 10 000 i øvingspenger — ingen kredittkort."
                : "Norway's only platform with courses, paper trading and autotrading. Start free with kr 10,000 in virtual money — no credit card."
              }
            </p>
            
            {/* CTA Hierarchy */}
            <div className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start mb-6">
              <a
                href="/signup"
                className="bg-emerald-500 hover:bg-emerald-400 text-white font-lexend font-bold px-8 py-4 rounded-xl shadow-lg shadow-emerald-500/30 transition-all text-center"
              >
                {isNorwegian ? "Start gratis →" : "Start free →"}
              </a>
              <a
                href="/kurs"
                className="bg-white hover:bg-slate-100 text-slate-900 font-lexend font-medium px-8 py-4 rounded-xl transition-colors text-center"
              >
                {isNorwegian ? "Se hva du lærer" : "See what you'll learn"}
              </a>
            </div>
            
            {/* Trust line */}
            <p className="text-sm text-slate-500">
              {isNorwegian 
                ? "Ingen kredittkort · Norsk veiledning · BankID-sikker"
                : "No credit card · Norwegian guidance · BankID secured"
              }
            </p>
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
      {/* Hero Section - Critical for LCP */}
      <HeroSection locale={locale} />
      
      {/* Course Preview - Show what users will learn */}
      <CoursePreview locale={locale} />
      
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
      
      {/* Minimal Footer - Lazy loaded */}
      <Suspense fallback={<div className="h-32 bg-slate-950" />}>
        <MinimalFooter />
      </Suspense>
    </main>
  );
}
