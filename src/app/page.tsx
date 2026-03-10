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

/**
 * MARKETING LANDING PAGE - Optimized for Performance
 * 
 * PHASE 3 OPTIMIZATIONS:
 * 
 * Below-fold components lazy-loaded with dynamic imports:
 * - LottoCalculator
 * - SocialProofSection
 * - GamifiedLeaderboard
 * - SafeBacktestWidget
 * - ComparisonSection
 * - PricingSection
 * - FAQSection
 * - FinalCTASection
 * - ConditionalFooter
 * 
 * Critical path (eager loaded):
 * - HeroSection (LCP element)
 * - DeferredLivePriceTicker (loads after hero)
 * - Navigation (required for UX)
 * 
 * FONT OPTIMIZATIONS (Task 2):
 * - Fraunces: display="optional", preload=false (display font, not critical)
 * - Lexend: display="swap", preload=true (body text, needs swap)
 * 
 * RESOURCE HINTS (Task 5):
 * - DNS prefetch + preconnect for Binance API (used by LivePriceTicker)
 * - DNS prefetch + preconnect for Supabase (conditional on env var)
 */

// Lazy load below-fold components
const LottoCalculator = dynamic(
  () => import("@/components/landing/LottoCalculator").then((m) => m.LottoCalculator),
  { loading: () => <div className="h-96 animate-pulse bg-slate-900/30" /> }
);

const SocialProofSection = dynamic(
  () => import("@/components/landing/SocialProofSection").then((m) => m.default),
  { loading: () => <div className="h-64 animate-pulse bg-slate-900/30" /> }
);

const GamifiedLeaderboard = dynamic(
  () => import("@/components/landing/GamifiedLeaderboard").then((m) => m.default),
  { loading: () => <div className="h-96 animate-pulse bg-slate-900/30" /> }
);

const SafeBacktestWidget = dynamic(
  () => import("@/components/landing/SafeBacktestWidget").then((m) => m.default),
  { loading: () => <div className="h-80 animate-pulse bg-slate-900/30" /> }
);

const ComparisonSection = dynamic(
  () => import("@/components/landing/ComparisonSection").then((m) => m.default),
  { loading: () => <div className="h-96 animate-pulse bg-slate-900/30" /> }
);

const PricingSection = dynamic(
  () => import("@/components/landing/PricingSection").then((m) => m.default),
  { loading: () => <div className="h-[600px] animate-pulse bg-slate-900/30" /> }
);

const FAQSection = dynamic(
  () => import("@/components/landing/FAQSection").then((m) => m.default),
  { loading: () => <div className="h-96 animate-pulse bg-slate-900/30" /> }
);

const FinalCTASection = dynamic(
  () => import("@/components/landing/FinalCTASection").then((m) => m.default),
  { loading: () => <div className="h-64 animate-pulse bg-slate-900/30" /> }
);

const ConditionalFooter = dynamic(
  () => import("@/components/landing/ConditionalFooter").then((m) => m.ConditionalFooter),
  { loading: () => <div className="h-48 animate-pulse bg-slate-950" /> }
);

// Fraunces: Display/heading font - NOT in critical path
// display="optional": If not loaded in ~100ms, use fallback for this page visit
// preload=false: Don't compete with LCP image/text for bandwidth
const fraunces = Fraunces({
  subsets: ["latin"],
  display: "optional",
  variable: "--font-fraunces",
  preload: false,
  adjustFontFallback: true,
  fallback: ["Georgia", "Times New Roman", "serif"],
});

// Lexend: Body text font - in critical path, needs swap for readability
const lexend = Lexend({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-lexend",
  preload: true,
  adjustFontFallback: true,
  fallback: ["system-ui", "-apple-system", "BlinkMacSystemFont", "Segoe UI", "Roboto", "sans-serif"],
});

// ISR: Regenerate every hour
export const revalidate = 3600;

export const metadata: Metadata = {
  title: "Klarpakke — Lær krypto. Øv med lekepenger. Tjen når du er klar.",
  description: "Norges eneste plattform som kombinerer kurs, autotrading og papirhandel — alt på norsk. Start gratis, ingen kort nødvendig.",
  keywords: ["krypto", "trading", "kurs", "norge", "bitcoin", "læring", "paper trading", "simulator"],
  authors: [{ name: "Klarpakke AS" }],
  creator: "Klarpakke AS",
  publisher: "Klarpakke AS",
  metadataBase: new URL("https://klarpakke.no"),
  alternates: {
    canonical: "/",
    languages: {
      no: "/",
      en: "/en/",
    },
  },
  manifest: "/manifest.json",
  openGraph: {
    type: "website",
    locale: "no_NO",
    url: "https://klarpakke.no",
    siteName: "Klarpakke",
    title: "Klarpakke — Lær krypto. Øv med lekepenger. Tjen når du er klar.",
    description: "Norges eneste plattform som kombinerer kurs, autotrading og papirhandel — alt på norsk.",
    images: [{ url: "/og-image.png", width: 1200, height: 630, alt: "Klarpakke — Norges krypto-utdanningsplattform" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Klarpakke — Lær krypto. Øv med lekepenger. Tjen når du er klar.",
    description: "Norges eneste plattform som kombinerer kurs, autotrading og papirhandel — alt på norsk.",
    images: ["/og-image.png"],
    creator: "@klarpakke",
  },
  robots: { index: true, follow: true },
};

export default async function RootPage() {
  const locale = "no";
  
  // Enable static rendering for default locale
  setRequestLocale(locale);
  
  let messages;

  try {
    messages = await getMessages();
  } catch {
    try {
      messages = await import("../../messages/no.json").then((m) => m.default);
    } catch {
      messages = await import("../../messages/en.json").then((m) => m.default);
    }
  }

  // Resource hints for external APIs (Task 5)
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseHost = supabaseUrl ? new URL(supabaseUrl).origin : null;

  return (
    <html lang={locale} className={`${fraunces.variable} ${lexend.variable}`}>
      <head>
        {/* Resource Hints for External APIs - Task 5 */}
        {/* Binance API - used by LivePriceTicker */}
        <link rel="dns-prefetch" href="https://api.binance.com" />
        <link rel="preconnect" href="https://api.binance.com" crossOrigin="anonymous" />
        
        {/* Supabase - conditional on env var */}
        {supabaseHost && (
          <>
            <link rel="dns-prefetch" href={supabaseHost} />
            <link rel="preconnect" href={supabaseHost} crossOrigin="anonymous" />
          </>
        )}
        
        <OrganizationJsonLd />
      </head>
      <body
        className={`${lexend.className} font-sans antialiased bg-[#0A0B0D] text-white min-h-screen`}
        suppressHydrationWarning
      >
        <NextIntlClientProvider locale={locale} messages={messages}>
          <MarketingProviders>
            <ErrorBoundary>
              <div className="relative min-h-screen flex flex-col">
                <MarketingNavigation />
                <main className="flex-1">
                  {/* Critical: Hero renders first */}
                  <HeroSection />
                  
                  {/* Deferred: Loads after hero */}
                  <DeferredLivePriceTicker />
                  
                  {/* Below-fold: Lazy loaded */}
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
        {process.env.VERCEL && (
          <>
            <Analytics />
            <SpeedInsights />
          </>
        )}
      </body>
    </html>
  );
}
