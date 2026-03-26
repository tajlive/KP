"use client";

import { useEffect } from "react";
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
import { ScrollToTop } from "@/components/dashboard/ScrollToTop";
import { TopNav } from "@/components/navigation/TopNav";
import { BottomTabs } from "@/components/navigation/BottomTabs";
import { usePaperTradingInit } from "@/hooks/usePaperTradingInit";
import { createClient } from "@/lib/utils";
import { ToastProvider } from "@/providers/ToastProvider";
import { TradingModeProvider } from "@/context/TradingModeContext";
import { ClientSideProviders } from "@/components/providers/ClientSideProviders";
import { QueryProvider } from "@/components/query-provider";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { SentryInit } from "@/components/providers/SentryInit";
import { Analytics } from "@vercel/analytics/react";
import { SpeedInsights } from "@vercel/speed-insights/next";
import { useAuth } from "@/components/auth/AuthContext";
import { SURFACE } from "@/lib/design/tokens";

function DashboardContent({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  usePaperTradingInit(user?.id);

  useEffect(() => {
    if (user?.id) {
      const supabase = createClient();
      supabase
        .from("user_profiles")
        .update({ onboarding_completed: true })
        .eq("id", user.id)
        .then();
      document.cookie =
        "kp_onboarding_status=completed; path=/; max-age=31536000; SameSite=Lax";
    }
  }, [user?.id]);

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
        <QueryProvider>
          <ErrorBoundary>
            <AuthProvider>
              <ToastProvider>
                <TradingModeProvider>
                  <ProtectedRoute>
                    <SentryInit />
                    <div
                      className={`min-h-screen min-h-dvh ${SURFACE.BG_LIGHT} flex flex-col overflow-x-hidden`}
                      data-testid="dashboard-root"
                    >
                      <ScrollToTop />
                      <TopNav />
                      <div className="flex min-h-0 flex-1 min-w-0 flex-col overflow-hidden">
                        <main className="h-full min-h-0 flex-1 overflow-x-hidden overflow-y-auto overscroll-y-contain px-3 pt-3 pb-[calc(5.75rem+env(safe-area-inset-bottom,0px))] sm:px-4 lg:px-8 lg:pt-4 md:pb-8">
                          <div className="mx-auto w-full max-w-7xl">
                            <DashboardContent>{children}</DashboardContent>
                          </div>
                        </main>
                      </div>
                      <BottomTabs />
                    </div>
                  </ProtectedRoute>
                  <Analytics />
                  <SpeedInsights />
                </TradingModeProvider>
              </ToastProvider>
            </AuthProvider>
          </ErrorBoundary>
        </QueryProvider>
      </ClientSideProviders>
    </>
  );
}
