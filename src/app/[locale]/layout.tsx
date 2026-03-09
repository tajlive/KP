import { Metadata } from "next";
import { getMessages, setRequestLocale } from "next-intl/server";
import { NextIntlClientProvider } from "next-intl";
import { MarketingNavigation } from "@/components/layout/MarketingNavigation";
import { ConditionalFooter } from "@/components/landing/ConditionalFooter";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { OrganizationJsonLd } from "@/components/JsonLd";
import { MarketingProviders } from "@/components/providers/MarketingProviders";
import { Analytics } from "@vercel/analytics/react";
import { SpeedInsights } from "@vercel/speed-insights/next";
import { Fraunces, Lexend } from "next/font/google";
import "../globals.css";

/**
 * MARKETING LAYOUT - Optimized for Performance
 * 
 * KEY OPTIMIZATIONS:
 * 
 * 1. REMOVED AuthProvider - No Supabase init on marketing pages
 *    (available in /dashboard, /paper-trading, /auto-trading layouts)
 * 
 * 2. REMOVED OnboardingProvider + OnboardingFlow - Only for logged-in users
 *    (available in /dashboard layout)
 * 
 * 3. REMOVED TradingModeProvider - Only for trading features
 *    (available in /paper-trading, /auto-trading layouts)
 * 
 * 4. REMOVED ToastProvider - Not critical for marketing
 *    (available in app areas)
 * 
 * 5. REPLACED Navigation with MarketingNavigation
 *    - No auth dependency
 *    - No TradingModeToggle
 *    - Smaller bundle, faster hydration
 * 
 * 6. REPLACED ClientSideProviders with MarketingProviders
 *    - No ChatWidget (deferred to dashboard)
 *    - No PWA loader (deferred)
 *    - Only essential error handling
 * 
 * APP ROUTES with full providers:
 * - /[locale]/dashboard/* - has AuthProvider, OnboardingProvider
 * - /[locale]/paper-trading/* - has AuthProvider, TradingModeProvider
 * - /[locale]/auto-trading/* - has AuthProvider, TradingModeProvider
 * - /[locale]/copy-trading/* - has AuthProvider, TradingModeProvider
 * - /[locale]/marketplace/* - has AuthProvider
 * - /[locale]/checkout/* - has AuthProvider
 * - /[locale]/onboarding/* - has OnboardingProvider
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
  preload: true,
});

const lexend = Lexend({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-lexend",
  preload: true,
});

export async function generateStaticParams() {
  // Generate static pages for ALL locales including default "no"
  // This ensures / (no), /en/, /th/, /zh/ are all pre-rendered at build time
  return [
    { locale: "no" },  // Default locale - critical for TTFB
    { locale: "en" },
    { locale: "th" },
    { locale: "zh" },
  ];
}

export const dynamicParams = false;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const isNo = locale === "no";

  return {
    title: {
      template: "%s | Klarpakke",
      default: isNo
        ? "Klarpakke — Lær krypto. Øv med lekepenger. Tjen når du er klar."
        : "Klarpakke — Learn crypto. Practice with play money. Earn when you're ready.",
    },
    description: isNo
      ? "Norges eneste plattform som kombinerer kurs, autotrading og papirhandel — alt på norsk. Start gratis, ingen kort nødvendig."
      : "Norway's only platform combining courses, autotrading and paper trading — in Norwegian. Free to start, no card needed.",
    keywords: ["crypto trading", "bitcoin", "kryptovaluta", "paper trading", "trading bot", "Norge"],
    openGraph: {
      images: [{ url: "/og-image.png", width: 1200, height: 630, alt: "Klarpakke" }],
    },
  };
}

interface LayoutProps {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}

export default async function LocaleLayout({ children, params }: LayoutProps) {
  const { locale } = await params;
  
  // Enable static rendering for locale - required by next-intl v4
  // https://next-intl.dev/docs/routing/setup#static-rendering
  setRequestLocale(locale);
  
  let messages;

  try {
    messages = await getMessages();
  } catch {
    messages = await import(`../../../messages/en.json`).then((m) => m.default);
  }

  return (
    <html
      lang={locale}
      className={`${fraunces.variable} ${lexend.variable}`}
    >
      <head>
        {/* Preconnect for critical domains - improves LCP */}
        <link rel="preconnect" href="https://vuxbjlykgmzskxbclquf.supabase.co" />
        <link rel="dns-prefetch" href="https://vuxbjlykgmzskxbclquf.supabase.co" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
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
                <main className="flex-1">{children}</main>
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
