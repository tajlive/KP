import { Metadata } from "next";
import { getMessages, setRequestLocale } from "next-intl/server";
import { NextIntlClientProvider } from "next-intl";
import HeroSection from "@/components/landing/HeroSection";
import { DeferredLivePriceTicker } from "@/components/landing/DeferredLivePriceTicker";
import { LottoCalculator } from "@/components/landing/LottoCalculator";
import SocialProofSection from "@/components/landing/SocialProofSection";
import GamifiedLeaderboard from "@/components/landing/GamifiedLeaderboard";
import SafeBacktestWidget from "@/components/landing/SafeBacktestWidget";
import ComparisonSection from "@/components/landing/ComparisonSection";
import PricingSection from "@/components/landing/PricingSection";
import FAQSection from "@/components/landing/FAQSection";
import FinalCTASection from "@/components/landing/FinalCTASection";
import { ConditionalFooter } from "@/components/landing/ConditionalFooter";
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
 * KEY OPTIMIZATIONS from previous version:
 * 
 * 1. REMOVED AuthProvider - No Supabase init on landing
 *    (moved to /dashboard, /paper-trading layouts)
 * 
 * 2. REMOVED OnboardingProvider + OnboardingFlow - Only for logged-in users
 *    (moved to dashboard layout)
 * 
 * 3. REMOVED TradingModeProvider - Only for trading features
 *    (moved to /paper-trading, /auto-trading layouts)
 * 
 * 4. REMOVED ToastProvider - Not critical for landing
 *    (available in app areas where needed)
 * 
 * 5. REPLACED Navigation with MarketingNavigation
 *    - No auth dependency
 *    - No TradingModeToggle
 *    - Smaller bundle
 * 
 * 6. REPLACED ClientSideProviders with MarketingProviders
 *    - No ChatWidget (deferred to dashboard)
 *    - No PWA loader (deferred)
 *    - Only error handling
 * 
 * EXPECTED IMPACT:
 * - Initial JS: ~1.2MB → ~600KB (-50%)
 * - Hydration time: ~3s → ~1s (-67%)
 * - LCP: 6.2s → <3.0s (target)
 */

const fraunces = Fraunces({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-fraunces",
});

const lexend = Lexend({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-lexend",
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

  return (
    <html lang={locale} className={`${fraunces.variable} ${lexend.variable}`}>
      <head>
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
                  <HeroSection />
                  <DeferredLivePriceTicker />
                  <LottoCalculator />
                  <SocialProofSection />
                  <GamifiedLeaderboard />
                  <SafeBacktestWidget />
                  <ComparisonSection />
                  <PricingSection />
                  <FAQSection />
                  <FinalCTASection />
                </main>
                <ConditionalFooter />
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
