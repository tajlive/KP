import { Metadata } from "next";
import { preconnect, prefetchDNS } from "react-dom";
import { headers } from "next/headers";
import { getMessages, setRequestLocale } from "next-intl/server";
import { NextIntlClientProvider } from "next-intl";
import { shouldShowVippsForRequest } from "@/lib/geo/vipps-region";
import { VippsMarketProvider } from "@/shared/providers/VippsMarketProvider";
import { AuthProvider } from "@/lib/auth/new/AuthContext";
import { AuthHashHandler } from "@/lib/auth/new/AuthHashHandler";
import { getSanityTokensCSS, DEFAULT_TOKENS_CSS } from "@/lib/sanity/tokens";
import { client } from "@/lib/sanity/client";
import { navigationQuery } from "@/lib/sanity/queries";
import type { NavigationData } from "@/shared/layout/NavigationServer";
// import { SessionCleanup } from "@/features/auth/SessionCleanup";
import { LocaleMarketingShell } from "@/shared/layout/LocaleMarketingShell";
import { ErrorBoundary } from "@/shared/error/ErrorBoundary";
import { OrganizationJsonLd } from "@/shared/seo/JsonLd";
import {
  getEarlyMetaDescription,
  isEarlyMetaDescriptionPath,
} from "@/lib/seo/earlyMetaDescription";
import { MarketingProviders } from "@/shared/providers/MarketingProviders";
import { ThemeProvider } from "@/shared/theme";
import { PlausibleScript } from "@/shared/analytics/PlausibleScript";
import { Analytics } from "@vercel/analytics/react";
import { SpeedInsights } from "@vercel/speed-insights/next";
import { SanityLive } from "@/sanity/lib/live";
import { FeatureFlagProvider } from "@/lib/feature-flags";
import { getFlagsAsync } from "@/lib/flags";
import Script from "next/script";
import { Outfit, Geist } from "next/font/google";
import { SURFACE } from "@/lib/design/tokens";
import { CdsProvider } from "@/app/providers/CdsProvider";
import "../globals.css";

/**
 * MARKETING LAYOUT - Optimized for Performance
 *
 * KEY OPTIMIZATIONS:
 *
 * 1. AuthProvider in root - needed so MarketingNavigation can show Min side / Logg ut when logged in
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
 * 5. MarketingNavigation + ConditionalFooter via LocaleMarketingShell
 *    - Skjules på app-ruter (/dashboard, /copy-trading, …) for å unngå dobbelt chrome
 *
 * 6. REPLACED ClientSideProviders with MarketingProviders
 *    - No ChatWidget (deferred to dashboard)
 *    - No PWA loader (deferred)
 *    - Only essential error handling
 *
 * 7. FONT OPTIMIZATIONS (Task 2):
 *    - Inter: display="swap", preload=true (body text, needs swap)
 *    - adjustFontFallback: true (metric optimization)
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
 * - Font loading: Minimal FOUT for Inter (swap)
 */

const outfit = Outfit({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-inter", // Keep variable name to avoid refactoring CSS
  preload: true,
  adjustFontFallback: true,
  fallback: [
    "system-ui",
    "-apple-system",
    "BlinkMacSystemFont",
    "Segoe UI",
    "Roboto",
    "sans-serif",
  ],
});

const geist = Geist({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-geist",
  preload: true,
});

export async function generateStaticParams() {
  // Generate static pages for ALL locales including default "no"
  // This ensures / (no), /en/, /th/, /zh/ are all pre-rendered at build time
  return [
    { locale: "no" }, // Default locale - critical for TTFB
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
        ? "Klarpakke — Krypto trading bot"
        : "Klarpakke — Crypto Trading Bot",
    },
    keywords: [
      "crypto trading",
      "bitcoin",
      "kryptovaluta",
      "paper trading",
      "trading bot",
      "Norge",
    ],
    openGraph: {
      images: [
        { url: "/og-image.png", width: 1200, height: 630, alt: "Klarpakke" },
      ],
    },
  };
}

const VALID_LOCALES = ["no", "en", "th", "zh"] as const;
type ValidLocale = (typeof VALID_LOCALES)[number];

function resolveLocale(raw: string | undefined): ValidLocale {
  if (raw === "no" || raw === "en" || raw === "th" || raw === "zh") return raw;
  return "no";
}

interface LayoutProps {
  children: React.ReactNode;
  params: Promise<{ locale?: string }>;
}

export default async function LocaleLayout({ children, params }: LayoutProps) {
  const resolvedParams = await params;
  const locale = resolveLocale(resolvedParams?.locale);

  // Enable static rendering for locale - required by next-intl v4
  setRequestLocale(locale);

  let messages;
  try {
    messages = await getMessages();
  } catch {
    // Fallback: last kritiske namespaces for å unngå blank side
    // Bruker Promise.all for å laste parallelt og redusere TTFB ved feil
    // Oppdatert etter i18n konsolidering (base+navigation → common)
    const [common, landing, auth] = await Promise.all([
      import('../../../messages/en/common.json').then((m) => m.default).catch(() => ({})),
      import('../../../messages/en/landing.json').then((m) => m.default).catch(() => ({})),
      import('../../../messages/en/auth.json').then((m) => m.default).catch(() => ({})),
    ]);
    messages = { common, landing, auth };
  }

  const hdrs = await headers();
  const strippedPath = hdrs.get("x-kp-stripped-path") ?? "/";
  const metaDescription = isEarlyMetaDescriptionPath(strippedPath)
    ? await getEarlyMetaDescription(locale, strippedPath)
    : null;
  const showVippsMarket = shouldShowVippsForRequest(hdrs);

  // Vi fjerner await her oppe slik at html og head strømmes til nettleseren umiddelbart!
  // Flaggene hentes asynkront i AsyncFeatureFlagProvider i body i stedet.

  // Get CSP nonce from middleware header for inline scripts
  const cspNonce = hdrs.get("x-csp-nonce") ?? undefined;

  // Fetch design tokens server-side to eliminate FOUC
  const tokensCss = await getSanityTokensCSS().catch(() => DEFAULT_TOKENS_CSS);

  // Fetch navigation from Sanity (with fallback)
  let navData: NavigationData = {
    loggedOutLinks: [
      { label: 'Lær', path: '/kurs', order: 0 },
      { label: 'Trade', path: '/paper-trading', order: 1 },
      { label: 'Bots', path: '/auto-trading', order: 2 },
      { label: 'Priser', path: '/priser', order: 3 },
    ],
    loggedInLinks: [
      { label: 'Dashboard', path: '/dashboard', order: 0 },
      { label: 'Portefølje', path: '/dashboard/portfolio', order: 1 },
      { label: 'Trade', path: '/dashboard/trade', order: 2 },
      { label: 'Bots', path: '/dashboard/auto-trade', order: 3 },
      { label: 'Lær', path: '/kurs', order: 4 },
      { label: 'Priser', path: '/priser', order: 5 },
    ],
  };
  try {
    const result = await client.fetch(
      navigationQuery,
      {},
      { next: { tags: ['sanity:navigation'] } }
    );
    if (result) {
      navData = {
        loggedOutLinks: result.loggedOutLinks || navData.loggedOutLinks,
        loggedInLinks: result.loggedInLinks || navData.loggedInLinks,
      };
    }
  } catch {
    // Bruk fallback
  }

  // Resource hints for external APIs (Task 5)
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseHost = supabaseUrl ? new URL(supabaseUrl).origin : null;

  // Modern React 19 preconnects (flyttet til toppen av streaming-buffer)
  preconnect("https://api.binance.com", { crossOrigin: "anonymous" });
  prefetchDNS("https://api.binance.com");
  if (supabaseHost) {
    preconnect(supabaseHost, { crossOrigin: "anonymous" });
    prefetchDNS(supabaseHost);
  }
  preconnect("https://fonts.googleapis.com");
  preconnect("https://fonts.gstatic.com", { crossOrigin: "anonymous" });

  return (
    <html lang={locale} className={`${outfit.variable} ${geist.variable}`} suppressHydrationWarning>
      <head suppressHydrationWarning>
        {metaDescription != null ? (
          <meta name="description" content={metaDescription} />
        ) : null}
        {/* Google Search Console Verification */}
        {process.env.NEXT_PUBLIC_GSC_VERIFICATION ? (
          <meta name="google-site-verification" content={process.env.NEXT_PUBLIC_GSC_VERIFICATION} />
        ) : null}
        {/* KRITISK: Rens korrupt Supabase auth-token FØR gotrue-js kjører */}
        <Script
          id="supabase-auth-cleaner"
          strategy="beforeInteractive"
          nonce={cspNonce}
          dangerouslySetInnerHTML={{
            __html: `(function(){
  try {
    var PROJECT = 'vuxbjlykgmzskxbclquf';
    var keys = Object.keys(localStorage);
    var toDelete = [];
    for (var i = 0; i < keys.length; i++) {
      var k = keys[i];
      if (k.indexOf('sb-') === 0) {
        var v = localStorage.getItem(k);
        if (v === null) continue;
        var corrupt = false;
        try {
          new TextDecoder('utf-8',{fatal:true}).decode(
            new TextEncoder().encode(v)
          );
        } catch(e) { corrupt = true; }
        if (!corrupt && v.charAt(0) === '{') {
          try { JSON.parse(v); } catch(e) { corrupt = true; }
        }
        if (corrupt) {
          toDelete.push(k);
          console.warn('[Klarpakke] Sletter korrupt token:', k);
        }
      }
    }
    var legacyKeys = [
      'sb-' + PROJECT + '-auth-token',
      'sb-' + PROJECT + '-auth-token-code-verifier',
      'sb-' + PROJECT + '-auth-token-provider-token',
    ];
    for (var j = 0; j < legacyKeys.length; j++) {
      if (toDelete.indexOf(legacyKeys[j]) === -1) {
        var lv = localStorage.getItem(legacyKeys[j]);
        if (lv !== null) {
          var lc = false;
          try {
            new TextDecoder('utf-8',{fatal:true}).decode(
              new TextEncoder().encode(lv)
            );
          } catch(e) { lc = true; }
          if (lc) toDelete.push(legacyKeys[j]);
        }
      }
    }
    for (var d = 0; d < toDelete.length; d++) {
      localStorage.removeItem(toDelete[d]);
    }
    if (toDelete.length > 0) {
      console.warn('[Klarpakke] Rensede', toDelete.length, 'korrupte tokens');
    }
  } catch(e) {}
})();`,
          }}
        />
        {/* Resource Hints for External APIs */}
        {/* Preload critical above-fold assets */}
        <link rel="preload" href="/logo.svg" as="image" type="image/svg+xml" />
        <OrganizationJsonLd />
        {/* Server-side injected Sanity design tokens — eliminates FOUC */}
        <style
          id="sanity-design-tokens"
          dangerouslySetInnerHTML={{ __html: tokensCss }}
        />
      </head>
      <body
        className={`${outfit.className} font-sans antialiased bg-kp-bg-primary text-kp-text-primary min-h-screen`}
        suppressHydrationWarning
      >
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange={false}
        >
        {/* <SessionCleanup /> */}
        <NextIntlClientProvider locale={locale} messages={messages}>
          <CdsProvider>
            <VippsMarketProvider showVippsMarket={showVippsMarket}>
              <MarketingProviders>
                <ErrorBoundary>
                  <AuthProvider>
                    <AuthHashHandler />
                    <AsyncFeatureFlagProvider>
                      <LocaleMarketingShell navData={navData}>{children}</LocaleMarketingShell>
                    </AsyncFeatureFlagProvider>
                  </AuthProvider>
                </ErrorBoundary>
              </MarketingProviders>
            </VippsMarketProvider>
          </CdsProvider>
        </NextIntlClientProvider>
        </ThemeProvider>
        <PlausibleScript />
        <Analytics />
        <SpeedInsights />
        <SanityLive />
      </body>
    </html>
  );
}

async function AsyncFeatureFlagProvider({ children }: { children: React.ReactNode }) {
  const flags = await getFlagsAsync();
  return (
    <FeatureFlagProvider initialFlags={flags}>
      {children}
    </FeatureFlagProvider>
  );
}
