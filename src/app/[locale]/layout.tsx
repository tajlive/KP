import { Metadata } from "next";
import { headers } from "next/headers";
import { getMessages, setRequestLocale } from "next-intl/server";
import { NextIntlClientProvider } from "next-intl";
import { shouldShowVippsForRequest } from "@/lib/geo/vipps-region";
import { VippsMarketProvider } from "@/components/providers/VippsMarketProvider";
import { AuthProvider } from "@/components/auth/AuthContext";
import { SessionCleanup } from "@/components/SessionCleanup";
import { LocaleMarketingShell } from "@/components/layout/LocaleMarketingShell";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { OrganizationJsonLd } from "@/components/JsonLd";
import {
  getEarlyMetaDescription,
  isEarlyMetaDescriptionPath,
} from "@/lib/seo/earlyMetaDescription";
import { MarketingProviders } from "@/components/providers/MarketingProviders";
import { PlausibleScript } from "@/components/analytics/PlausibleScript";
import { Analytics } from "@vercel/analytics/react";
import { SpeedInsights } from "@vercel/speed-insights/next";
import { Inter } from "next/font/google";
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

const inter = Inter({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-inter",
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
    messages = await import(`../../../messages/en.json`).then((m) => m.default);
  }

  const hdrs = await headers();
  const strippedPath = hdrs.get("x-kp-stripped-path") ?? "/";
  const metaDescription = isEarlyMetaDescriptionPath(strippedPath)
    ? await getEarlyMetaDescription(locale, strippedPath)
    : null;
  const showVippsMarket = shouldShowVippsForRequest(hdrs);

  // Resource hints for external APIs (Task 5)
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseHost = supabaseUrl ? new URL(supabaseUrl).origin : null;

  return (
    <html lang={locale} className={inter.variable}>
      <head suppressHydrationWarning>
        {metaDescription != null ? (
          <meta name="description" content={metaDescription} />
        ) : null}
        {/* KRITISK: Rens korrupt Supabase auth-token FØR gotrue-js kjører */}
        <script
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
        <link rel="dns-prefetch" href="https://api.binance.com" />
        <link
          rel="preconnect"
          href="https://api.binance.com"
          crossOrigin="anonymous"
        />
        {supabaseHost && (
          <>
            <link rel="dns-prefetch" href={supabaseHost} />
            <link
              rel="preconnect"
              href={supabaseHost}
              crossOrigin="anonymous"
            />
          </>
        )}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          rel="preconnect"
          href="https://fonts.gstatic.com"
          crossOrigin="anonymous"
        />
        <OrganizationJsonLd />
      </head>
      <body
        className={`${inter.className} font-sans antialiased ${SURFACE.BG_LIGHT} text-[#1A1D26] min-h-screen`}
        suppressHydrationWarning
      >
        <SessionCleanup />
        <NextIntlClientProvider locale={locale} messages={messages}>
          <CdsProvider>
            <VippsMarketProvider showVippsMarket={showVippsMarket}>
              <MarketingProviders>
                <ErrorBoundary>
                  <AuthProvider>
                    <LocaleMarketingShell>{children}</LocaleMarketingShell>
                  </AuthProvider>
                </ErrorBoundary>
              </MarketingProviders>
            </VippsMarketProvider>
          </CdsProvider>
        </NextIntlClientProvider>
        <PlausibleScript />
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
