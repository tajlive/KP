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
import { Fraunces, Lexend } from "next/font/google";
import "./globals.css";

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
