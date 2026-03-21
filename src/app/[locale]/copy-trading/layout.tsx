"use client";

import { CopyTradingSubAppHeader } from "@/components/copy-trading/CopyTradingSubAppHeader";
import { AuthProvider } from "@/components/auth/AuthContext";
import { ToastProvider } from "@/providers/ToastProvider";
import { TradingModeProvider } from "@/context/TradingModeContext";
import { ClientSideProviders } from "@/components/providers/ClientSideProviders";
import { ErrorBoundary } from "@/components/ErrorBoundary";
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
              <div className="relative flex min-h-screen flex-col bg-slate-950">
                <CopyTradingSubAppHeader />
                <main className="flex-1">{children}</main>
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
