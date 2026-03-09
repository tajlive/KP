"use client";

import { AuthProvider } from "@/components/auth/AuthContext";
import { ToastProvider } from "@/providers/ToastProvider";
import { TradingModeProvider } from "@/context/TradingModeContext";
import { ClientSideProviders } from "@/components/providers/ClientSideProviders";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { Navigation } from "@/components/layout/Navigation";
import { ConditionalFooter } from "@/components/landing/ConditionalFooter";
import { Analytics } from "@vercel/analytics/react";
import { SpeedInsights } from "@vercel/speed-insights/next";

export default function CopyTradingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ClientSideProviders>
      <ErrorBoundary>
        <AuthProvider>
          <ToastProvider>
            <TradingModeProvider>
              <div className="relative min-h-screen flex flex-col">
                <Navigation />
                <main className="flex-1">{children}</main>
                <ConditionalFooter />
              </div>
              {process.env.VERCEL && (
                <>
                  <Analytics />
                  <SpeedInsights />
                </>
              )}
            </TradingModeProvider>
          </ToastProvider>
        </AuthProvider>
      </ErrorBoundary>
    </ClientSideProviders>
  );
}
