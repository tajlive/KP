import { ErrorBoundary } from "@/components/ErrorBoundary";
import { LocaleRedirect } from "@/components/i18n/LocaleRedirect";
import { OrganizationJsonLd } from "@/components/JsonLd";
import { AuthProvider } from "@/components/auth/AuthContext";
import { ConditionalFooter } from "@/components/landing/ConditionalFooter";
import { Navigation } from "@/components/layout/Navigation";
import OnboardingFlow from "@/components/onboarding/OnboardingFlow";
import { ClientSideProviders } from "@/components/providers/ClientSideProviders";
import { OnboardingProvider } from "@/components/providers/OnboardingProvider";
import { TradingModeProvider } from "@/context/TradingModeContext";
import { ToastProvider } from "@/providers/ToastProvider";
import { Analytics } from "@vercel/analytics/react";
import { SpeedInsights } from "@vercel/speed-insights/next";
import { Metadata } from "next";
import { NextIntlClientProvider } from "next-intl";
import { getMessages } from "next-intl/server";
import { Fraunces, Lexend } from "next/font/google";
import "../globals.css";

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
  // NOTE: Norwegian (no) is the default locale with localePrefix: 'as-needed'
  // It does NOT have a prefix in the URL, so we don't generate /no/* paths.
  // Middleware handles /no/* -> /* redirects for legacy URLs.
  // Only generate explicit locale paths for non-default locales.
  return [
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
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                if (typeof navigator !== 'undefined' && navigator.serviceWorker) {
                  navigator.serviceWorker.getRegistrations().then(function(registrations) {
                    registrations.forEach(function(registration) {
                      registration.unregister();
                    });
                  });
                  if (window.caches) {
                    caches.keys().then(function(cacheNames) {
                      cacheNames.forEach(function(cacheName) {
                        caches.delete(cacheName);
                      });
                    });
                  }
                }
              })();
            `,
          }}
        />
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
                        <LocaleRedirect />
                        <Navigation />
                        <main className="flex-1">{children}</main>
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
