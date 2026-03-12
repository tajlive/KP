import { Metadata } from "next";
import { getMessages, setRequestLocale } from "next-intl/server";
import { NextIntlClientProvider } from "next-intl";
import { Suspense } from "react";
import dynamic from "next/dynamic";

// Critical path - eager load
import HeroSection from "@/components/landing/HeroSection";
import { DeferredLivePriceTicker } from "@/components/landing/DeferredLivePriceTicker";
import { MarketingNavigation } from "@/components/layout/MarketingNavigation";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { OrganizationJsonLd } from "@/components/JsonLd";
import { MarketingProviders } from "@/components/providers/MarketingProviders";
import { Analytics } from "@vercel/analytics/react";
import { SpeedInsights } from "@vercel/speed-insights/next";
import { Fraunces, Lexend } from "next/font/google";
import "./globals.css";

const fraunces = Fraunces({
  subsets: ["latin"],
  display: "optional",
  variable: "--font-fraunces",
  preload: false,
});

const lexend = Lexend({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-lexend",
  preload: true,
});

export const revalidate = 3600;

export const metadata: Metadata = {
  title: "Klarpakke — Lær krypto. Øv med lekepenger. Tjen når du er klar.",
  description: "Norges eneste plattform som kombinerer kurs, autotrading og papirhandel — alt på norsk.",
};

// Lazy load below-fold components
const LottoCalculator = dynamic(() => import("@/components/landing/LottoCalculator").then((m) => m.LottoCalculator));
const SocialProofSection = dynamic(() => import("@/components/landing/SocialProofSection").then((m) => m.default));
const GamifiedLeaderboard = dynamic(() => import("@/components/landing/GamifiedLeaderboard").then((m) => m.default));
const SafeBacktestWidget = dynamic(() => import("@/components/landing/SafeBacktestWidget").then((m) => m.default));
const ComparisonSection = dynamic(() => import("@/components/landing/ComparisonSection").then((m) => m.default));
const PricingSection = dynamic(() => import("@/components/landing/PricingSection").then((m) => m.default));
const FAQSection = dynamic(() => import("@/components/landing/FAQSection").then((m) => m.default));
const FinalCTASection = dynamic(() => import("@/components/landing/FinalCTASection").then((m) => m.default));
const ConditionalFooter = dynamic(() => import("@/components/landing/ConditionalFooter").then((m) => m.ConditionalFooter));

export default async function RootPage() {
  const locale = "no";
  setRequestLocale(locale);
  
  let messages;
  try {
    messages = await getMessages();
  } catch {
    messages = await import("../../messages/no.json").then((m) => m.default);
  }

  return (
    <html lang={locale} className={`${fraunces.variable} ${lexend.variable}`}>
      <head>
        <link rel="dns-prefetch" href="https://api.binance.com" />
        <OrganizationJsonLd />
      </head>
      <body className={`${lexend.className} font-sans antialiased bg-[#0A0B0D] text-white min-h-screen`}>
        <NextIntlClientProvider locale={locale} messages={messages}>
          <MarketingProviders>
            <ErrorBoundary>
              <div className="relative min-h-screen flex flex-col">
                <MarketingNavigation />
                <main className="flex-1">
                  <HeroSection />
                  <DeferredLivePriceTicker />
                  <Suspense fallback={<div className="h-96 animate-pulse bg-slate-900/30" />}>
                    <LottoCalculator />
                  </Suspense>
                  <Suspense fallback={<div className="h-64 animate-pulse bg-slate-900/30" />}>
                    <SocialProofSection />
                  </Suspense>
                  <Suspense fallback={<div className="h-96 animate-pulse bg-slate-900/30" />}>
                    <GamifiedLeaderboard />
                  </Suspense>
                  <Suspense fallback={<div className="h-80 animate-pulse bg-slate-900/30" />}>
                    <SafeBacktestWidget />
                  </Suspense>
                  <Suspense fallback={<div className="h-96 animate-pulse bg-slate-900/30" />}>
                    <ComparisonSection />
                  </Suspense>
                  <Suspense fallback={<div className="h-[600px] animate-pulse bg-slate-900/30" />}>
                    <PricingSection />
                  </Suspense>
                  <Suspense fallback={<div className="h-96 animate-pulse bg-slate-900/30" />}>
                    <FAQSection />
                  </Suspense>
                  <Suspense fallback={<div className="h-64 animate-pulse bg-slate-900/30" />}>
                    <FinalCTASection />
                  </Suspense>
                </main>
                <Suspense fallback={<div className="h-48 animate-pulse bg-slate-950" />}>
                  <ConditionalFooter />
                </Suspense>
              </div>
            </ErrorBoundary>
          </MarketingProviders>
        </NextIntlClientProvider>
        {process.env.VERCEL && <><Analytics /><SpeedInsights /></>}
      </body>
    </html>
  );
}
