"use client";
import type { ReactNode } from "react";
import { ThemeProvider } from "@/shared/theme";
import { NextIntlClientProvider } from "next-intl";
import { CdsProvider } from "@/app/providers/CdsProvider";
import { VippsMarketProvider } from "@/shared/providers/VippsMarketProvider";
import { MarketingProviders } from "@/shared/providers/MarketingProviders";
import { ErrorBoundary } from "@/shared/error/ErrorBoundary";
import { AuthProvider } from "@/lib/auth/new/AuthContext";
import { AuthHashHandler } from "@/lib/auth/new/AuthHashHandler";
import { FeatureFlagProvider } from "@/lib/feature-flags";
import type { FeatureFlags } from "@/lib/flags";
import { LocaleMarketingShell } from "@/shared/layout/LocaleMarketingShell";
import { LazyMotion } from "framer-motion";

const loadFeatures = () => import("framer-motion").then((res) => res.domAnimation);

interface RootProvidersProps {
  locale: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  messages: any;
  showVippsMarket: boolean;
  marketingNav: ReactNode;
  flags: Partial<FeatureFlags>;
  isMarketing: boolean;
  children: ReactNode;
}

export function RootProviders({
  locale,
  messages,
  showVippsMarket,
  marketingNav,
  flags,
  isMarketing,
  children,
}: RootProvidersProps) {
  const marketingShell = (
    <LocaleMarketingShell marketingNav={marketingNav}>
      <LazyMotion features={loadFeatures} strict={false}>
        {children}
      </LazyMotion>
    </LocaleMarketingShell>
  );

  return (
    <ThemeProvider
      attribute="class"
      defaultTheme="system"
      enableSystem
      disableTransitionOnChange={false}
    >
      {/* <SessionCleanup /> */}
      <NextIntlClientProvider locale={locale} messages={messages}>
        <VippsMarketProvider showVippsMarket={showVippsMarket}>
          <MarketingProviders>
            <ErrorBoundary>
              <FeatureFlagProvider initialFlags={flags}>
                {isMarketing ? (
                  marketingShell
                ) : (
                  <CdsProvider>
                    <AuthProvider>
                      <AuthHashHandler />
                      {marketingShell}
                    </AuthProvider>
                  </CdsProvider>
                )}
              </FeatureFlagProvider>
            </ErrorBoundary>
          </MarketingProviders>
        </VippsMarketProvider>
      </NextIntlClientProvider>
    </ThemeProvider>
  );
}
