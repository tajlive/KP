"use client";

import { AuthProvider } from "@/components/auth/AuthContext";

// KRITISK: Inline script som kjører FØR AuthProvider for å rense korrupte tokens
const CorruptTokenCleanup = () => (
  <script
    dangerouslySetInnerHTML={{
      __html: `(function(){try{var k=Object.keys(localStorage);for(var i=0;i<k.length;i++){if(k[i].indexOf('sb-')===0){var v=localStorage.getItem(k[i]);if(v!==null){try{new TextDecoder('utf-8',{fatal:true}).decode(new TextEncoder().encode(v))}catch(e){console.warn('[Klarpakke] Korrupt token slettet:',k[i]);localStorage.removeItem(k[i])}}}}}catch(e){}})();`,
    }}
  />
);
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { DashboardSidebar } from "@/components/dashboard/DashboardSidebar";
import { ScrollToTop } from "@/components/dashboard/ScrollToTop";
import { NotificationTray } from "@/components/layout/NotificationTray";
import { usePaperTradingInit } from "@/hooks/usePaperTradingInit";
import { OnboardingProvider } from "@/components/providers/OnboardingProvider";
import OnboardingFlow from "@/components/onboarding/OnboardingFlow";
import { ToastProvider } from "@/providers/ToastProvider";
import { TradingModeProvider } from "@/context/TradingModeContext";
import { ClientSideProviders } from "@/components/providers/ClientSideProviders";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { SentryInit } from "@/components/providers/SentryInit";
import { Analytics } from "@vercel/analytics/react";
import { SpeedInsights } from "@vercel/speed-insights/next";
import { useAuth } from "@/components/auth/AuthContext";

function DashboardContent({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  usePaperTradingInit(user?.id);

  return <>{children}</>;
}

export default function DashboardClientLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <CorruptTokenCleanup />
      <ClientSideProviders>
        <ErrorBoundary>
          <AuthProvider>
            <OnboardingProvider>
              <OnboardingFlow />
              <ToastProvider>
                <TradingModeProvider>
                  <ProtectedRoute>
                    <SentryInit />
                    <div className="min-h-screen bg-slate-950 flex">
                      <ScrollToTop />
                      <DashboardSidebar />
                      <div className="flex-1 flex flex-col min-w-0 overflow-hidden relative">
                        <header className="absolute top-0 right-0 p-4 lg:p-8 z-10 flex items-center justify-end pointer-events-none">
                          <div className="pointer-events-auto">
                            <NotificationTray />
                          </div>
                        </header>
                        <main className="flex-1 overflow-y-auto p-4 lg:p-8 pt-20 lg:pt-24">
                          <div className="max-w-6xl mx-auto">
                            <DashboardContent>{children}</DashboardContent>
                          </div>
                        </main>
                      </div>
                    </div>
                  </ProtectedRoute>
                  <Analytics />
                  <SpeedInsights />
                </TradingModeProvider>
              </ToastProvider>
            </OnboardingProvider>
          </AuthProvider>
        </ErrorBoundary>
      </ClientSideProviders>
    </>
  );
}
