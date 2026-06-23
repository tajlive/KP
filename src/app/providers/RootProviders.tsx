"use client";
import type { ReactNode } from "react";
import { ThemeProvider } from "@/shared/theme";
import { NextIntlClientProvider } from "next-intl";

// Build stamp to bust client bundle cache on deploy
// eslint-disable-next-line no-console
if (typeof window !== "undefined") console.log("[Klarpakke] Build:", "2026-05-14-i18n-fix");
import { CdsProvider } from "@/app/providers/CdsProvider";
import { VippsMarketProvider } from "@/shared/providers/VippsMarketProvider";
import { MarketingProviders } from "@/shared/providers/MarketingProviders";
import { ErrorBoundary } from "@/shared/error/ErrorBoundary";
import { AuthProvider } from "@/lib/auth/new/AuthContext";
import { AuthHashHandler } from "@/lib/auth/new/AuthHashHandler";
import { FeatureFlagProvider } from "@/lib/feature-flags";
import type { FeatureFlags } from "@/lib/flags";
import { LocaleMarketingShell } from "@/shared/layout/LocaleMarketingShell";
import type { NavigationData } from "@/shared/layout/NavigationServer";
import { LazyMotion } from "framer-motion";

const loadFeatures = () => import("framer-motion").then((res) => res.domAnimation);

interface RootProvidersProps {
  locale: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  messages: any;
  showVippsMarket: boolean;
  navData: NavigationData;
  flags: Partial<FeatureFlags>;
  children: ReactNode;
}

export function RootProviders({
  locale,
  messages,
  showVippsMarket,
  navData,
  flags,
  children,
}: RootProvidersProps) {
  return (
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
                  <FeatureFlagProvider initialFlags={flags}>
                    <LocaleMarketingShell navData={navData}>
                      <LazyMotion features={loadFeatures} strict={false}>
                        {children}
                      </LazyMotion>
                    </LocaleMarketingShell>
                  </FeatureFlagProvider>
                </AuthProvider>
              </ErrorBoundary>
            </MarketingProviders>
          </VippsMarketProvider>
        </CdsProvider>
      </NextIntlClientProvider>
    </ThemeProvider>
  );
}
