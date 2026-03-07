import { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { LiveTicker } from "@/components/landing/LiveTicker";
import { DashboardPreview } from "@/components/landing/DashboardPreview";
import { LottoComparison } from "@/components/landing/LottoComparison";
import { ThreeSteps } from "@/components/landing/ThreeSteps";
import { MinimalFooter } from "@/components/landing/MinimalFooter";

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

function HeroSection({ locale }: { locale: string }) {
  const isNorwegian = locale === 'no';
  
  return (
    <section className="relative py-16 md:py-24 lg:py-32 overflow-hidden">
      <div className="max-w-6xl mx-auto px-4">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          {/* Left: Text */}
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

          {/* Right: Dashboard Preview */}
          <div className="relative">
            <div className="absolute inset-0 bg-teal-500/20 blur-3xl rounded-full" />
            <DashboardPreview />
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
      {/* Live Price Ticker */}
      <LiveTicker />
      
      {/* Hero Section */}
      <HeroSection locale={locale} />
      
      {/* Lotto Comparison Calculator */}
      <section id="lottocalc" className="py-16 md:py-24">
        <div className="max-w-4xl mx-auto px-4">
          <LottoComparison />
        </div>
      </section>
      
      {/* Three Steps */}
      <section className="max-w-6xl mx-auto px-4">
        <ThreeSteps />
      </section>
      
      {/* Minimal Footer */}
      <MinimalFooter />
    </main>
  );
}
