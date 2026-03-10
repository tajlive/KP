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
 * 7. FONT OPTIMIZATIONS (Task 2):
 *    - Fraunces: display="optional", preload=false (display font, not critical)
 *    - Lexend: display="swap", preload=true (body text, needs swap)
 *    - adjustFontFallback: true for both (metric optimization)
 * 
 * 8. RESOURCE HINTS (Task 5):
 *    - DNS prefetch + preconnect for Binance API
 *    - DNS prefetch + preconnect for Supabase (conditional)
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
 * - Font loading: No FOUT for Fraunces (optional), minimal FOUT for Lexend
 */

// Fraunces: Display/heading font - NOT in critical path
// display="optional": If not loaded in ~100ms, use fallback for this page visit
// preload=false: Don't compete with LCP image/text for bandwidth
// adjustFontFallback: Automatic metric adjustment for reduced CLS
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

  // Resource hints for external APIs (Task 5)
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseHost = supabaseUrl ? new URL(supabaseUrl).origin : null;

  return (
    <html
      lang={locale}
      className={`${fraunces.variable} ${lexend.variable}`}
    >
      <head suppressHydrationWarning>
        {/* HOTFIX: Rens korrupt Supabase auth-token FØR gotrue-js initialiseres.
            Må være inline script i <head> — useEffect er for sent. */}
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                try {
                  var keys = Object.keys(localStorage);
                  for (var i = 0; i < keys.length; i++) {
                    if (keys[i].indexOf('sb-') === 0) {
                      var val = localStorage.getItem(keys[i]);
                      if (val !== null) {
                        try {
                          var enc = new TextEncoder().encode(val);
                          new TextDecoder('utf-8', { fatal: true }).decode(enc);
                        } catch(e) {
                          console.warn('[Klarpakke] Sletter korrupt auth-token:', keys[i]);
                          localStorage.removeItem(keys[i]);
                        }
                      }
                    }
                  }
                } catch(e) {
                  // localStorage ikke tilgjengelig (SSR/privat modus) — ignorer
                }
              })();
            `,
          }}
        />
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
        
        {/* Preconnect for critical domains - improves LCP */}
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
