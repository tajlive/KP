"use client";

import { AuthProvider } from "@/components/auth/AuthContext";
import { ToastProvider } from "@/providers/ToastProvider";
import { ClientSideProviders } from "@/components/providers/ClientSideProviders";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { Analytics } from "@vercel/analytics/react";
import { SpeedInsights } from "@vercel/speed-insights/next";

export default function KontoLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ClientSideProviders>
      <ErrorBoundary>
        <AuthProvider>
          <ToastProvider>
            <div className="relative min-h-screen flex flex-col">
              <main className="flex-1 pt-16">{children}</main>
            </div>
            {process.env.VERCEL && (
              <>
                <Analytics />
                {process.env.NODE_ENV !== "production" && <SpeedInsights />}
              </>
            )}
          </ToastProvider>
        </AuthProvider>
      </ErrorBoundary>
    </ClientSideProviders>
  );
}
