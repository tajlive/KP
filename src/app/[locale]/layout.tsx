import { ErrorBoundary } from "@/components/ErrorBoundary";
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
import { DM_Sans, Instrument_Serif } from "next/font/google";
import "../globals.css";

// Konfigurer fonter med next/font/google (module scope påkrevd)
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

export async function generateStaticParams() {
  return [
    { locale: "no" },
    { locale: "en" },
    { locale: "th" },
    { locale: "zh" },
  ];
}

// Allow dynamic rendering for auth to work properly
export const dynamicParams = true;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const isNo = locale === "no";

  return {
    title: {
      template: isNo ? "%s | Klarpakke" : "%s | Klarpakke",
      default: isNo
        ? "Klarpakke Universitet - Norges første crypto-universitet"
        : "Klarpakke University - Norway's first crypto university",
    },
    description: isNo
      ? "Lær crypto trading fra A til Å med paper trading, AI-coaching og auto-trading bot. Gratis å starte, 1M kr virtuell kapital."
      : "Learn crypto trading from A to Z with paper trading, AI coaching, and auto-trading bot. Free to start, 1M NOK virtual capital.",
    keywords: [
      "crypto trading",
      "bitcoin",
      "kryptovaluta",
      "paper trading",
      "trading bot",
      "Norge",
    ],
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
      className={`${dmSans.variable} ${instrumentSerif.variable}`}
    >
      <head>
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
        className={`${dmSans.className} font-sans antialiased bg-[#0A0B0D] text-white min-h-screen`}
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
