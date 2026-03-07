import { Metadata } from "next";
import { getMessages } from "next-intl/server";
import { NextIntlClientProvider } from "next-intl";
import HeroSection from "@/components/landing/HeroSection";
import { LivePriceTicker } from "@/components/landing/LivePriceTicker";
import { LottoCalculator } from "@/components/landing/LottoCalculator";
import SocialProofSection from "@/components/landing/SocialProofSection";
import GamifiedLeaderboard from "@/components/landing/GamifiedLeaderboard";
import SafeBacktestWidget from "@/components/landing/SafeBacktestWidget";
import ComparisonSection from "@/components/landing/ComparisonSection";
import PricingSection from "@/components/landing/PricingSection";
import FAQSection from "@/components/landing/FAQSection";
import FinalCTASection from "@/components/landing/FinalCTASection";
import { AuthProvider } from "@/components/auth/AuthContext";
import { ClientSideProviders } from "@/components/providers/ClientSideProviders";
import { ToastProvider } from "@/providers/ToastProvider";
import { TradingModeProvider } from "@/context/TradingModeContext";
import { OnboardingProvider } from "@/components/providers/OnboardingProvider";
import OnboardingFlow from "@/components/onboarding/OnboardingFlow";
import { ConditionalFooter } from "@/components/landing/ConditionalFooter";
import { Navigation } from "@/components/layout/Navigation";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { OrganizationJsonLd } from "@/components/JsonLd";
import { Analytics } from "@vercel/analytics/react";
import { SpeedInsights } from "@vercel/speed-insights/next";
import { DM_Sans, Instrument_Serif } from "next/font/google";
import "./globals.css";

const dmSans = DM_Sans({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-dm-sans",
});

const instrumentSerif = Instrument_Serif({
  subsets: ["latin"],
  weight: "400",
  style: ["normal", "italic"],
  display: "swap",
  variable: "--font-instrument-serif",
});

export const metadata: Metadata = {
  title: "Klarpakke Universitet - Norges første krypto-universitet",
  description: "Lær crypto trading fra A til Å med paper trading, AI-coaching og auto-trading bot. Gratis å starte, 1M kr virtuell kapital.",
  keywords: ["krypto", "trading", "kurs", "norge", "bitcoin", "læring", "paper trading", "simulator"],
  authors: [{ name: "Klarpakke AS" }],
  creator: "Klarpakke AS",
  publisher: "Klarpakke AS",
  metadataBase: new URL("https://klarpakke.no"),
  alternates: {
    canonical: "/",
    languages: {
      "no": "/",
      "en": "/en/",
    },
  },
  manifest: "/manifest.json",
  openGraph: {
    type: "website",
    locale: "no_NO",
    url: "https://klarpakke.no",
    siteName: "Klarpakke Universitet",
    title: "Klarpakke Universitet - Norges første krypto-universitet",
    description: "Lær crypto trading fra A til Å. Fra Student til Master Trader på 4 uker. Paper trading med 1M kr virtuell kapital.",
    images: [{ url: "/logo.svg", width: 1200, height: 682, alt: "Klarpakke Universitet Logo" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Klarpakke Universitet - Norges første krypto-universitet",
    description: "Lær crypto trading fra A til Å. Fra Student til Master Trader på 4 uker.",
    images: ["/logo.svg"],
    creator: "@klarpakke",
  },
  robots: { index: true, follow: true },
};

export default async function RootPage() {
  const locale = "no";
  let messages;

  try {
    messages = await getMessages();
  } catch {
    messages = await import("../../messages/en.json").then((m) => m.default);
  }

  return (
    <html lang={locale} className={`${dmSans.variable} ${instrumentSerif.variable}`}>
      <head>
        <OrganizationJsonLd />
      </head>
      <body className={`${dmSans.className} font-sans antialiased bg-[#0A0B0D] text-white min-h-screen`} suppressHydrationWarning>
        <NextIntlClientProvider locale={locale} messages={messages}>
          <ClientSideProviders>
            <ErrorBoundary>
              <AuthProvider>
                <OnboardingProvider>
                  <OnboardingFlow />
                  <ToastProvider>
                    <TradingModeProvider>
                      <div className="relative min-h-screen flex flex-col">
                        <Navigation />
                        <main className="flex-1">
                          <LivePriceTicker />
                          <HeroSection />
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
                    </TradingModeProvider>
                  </ToastProvider>
                  {process.env.VERCEL && (
                    <>
                      <Analytics />
                      <SpeedInsights />
                    </>
                  )}
                </OnboardingProvider>
              </AuthProvider>
            </ErrorBoundary>
          </ClientSideProviders>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
