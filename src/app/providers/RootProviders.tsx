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
import { AsyncFeatureFlagProvider } from "@/app/providers/AsyncFeatureFlagProvider";
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
  children: ReactNode;
}

export function RootProviders({
  locale,
  messages,
  showVippsMarket,
  navData,
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
                  <AsyncFeatureFlagProvider>
                    <LocaleMarketingShell navData={navData}>
                      <LazyMotion features={loadFeatures} strict={false}>
                        {children}
                      </LazyMotion>
                    </LocaleMarketingShell>
                  </AsyncFeatureFlagProvider>
                </AuthProvider>
              </ErrorBoundary>
            </MarketingProviders>
          </VippsMarketProvider>
        </CdsProvider>
      </NextIntlClientProvider>
    </ThemeProvider>
  );
}
