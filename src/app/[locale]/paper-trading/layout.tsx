"use client";

import { AuthProvider } from "@/components/auth/AuthContext";
import { ToastProvider } from "@/providers/ToastProvider";
import { TradingModeProvider } from "@/context/TradingModeContext";
import { ClientSideProviders } from "@/components/providers/ClientSideProviders";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { Analytics } from "@vercel/analytics/react";
import { SpeedInsights } from "@vercel/speed-insights/next";

/**
 * Paper Trading Layout
 * 
 * Includes app-specific providers:
 * - AuthProvider (for user session)
 * - TradingModeProvider (for paper/live toggle)
 * - ToastProvider (for notifications)
 * - ClientSideProviders (chat, PWA, error handling)
 * 
 * These providers are NOT loaded on marketing landing pages.
 */

export default function PaperTradingLayout({
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
                <main className="flex-1 pt-16">{children}</main>
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
