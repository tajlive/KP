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
import { DashboardSidebar } from "@/components/dashboard/DashboardSidebar";
import { DashboardTabs } from "@/components/dashboard/DashboardTabs";
import { ScrollToTop } from "@/components/dashboard/ScrollToTop";
import { NotificationTray } from "@/components/layout/NotificationTray";
import { usePaperTradingInit } from "@/hooks/usePaperTradingInit";
import { createClient } from "@/lib/utils";
import { ToastProvider } from "@/providers/ToastProvider";
import { TradingModeProvider } from "@/context/TradingModeContext";
import { ClientSideProviders } from "@/components/providers/ClientSideProviders";
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
      supabase.from("user_profiles").update({ onboarding_completed: true }).eq("id", user.id).then();
      document.cookie = "kp_onboarding_status=completed; path=/; max-age=31536000; SameSite=Lax";
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
        <ErrorBoundary>
          <AuthProvider>
              <ToastProvider>
                <TradingModeProvider>
                  <ProtectedRoute>
                    <SentryInit />
                    <div className={`min-h-screen ${SURFACE.BG_LIGHT} flex`}>
                      <ScrollToTop />
                      <DashboardSidebar />
                      <div className="flex-1 flex flex-col min-w-0 overflow-hidden relative">
                        <header className="absolute top-0 right-0 p-4 lg:p-8 z-10 flex items-center justify-end pointer-events-none">
                          <div className="pointer-events-auto">
                            <NotificationTray />
                          </div>
                        </header>
                        <main className="flex-1 overflow-y-auto p-4 lg:p-8 pt-20 lg:pt-24 pb-24 md:pb-8">
                          <div className="max-w-6xl mx-auto">
                            <DashboardContent>{children}</DashboardContent>
                          </div>
                        </main>
                      </div>
                      <DashboardTabs />
                    </div>
                  </ProtectedRoute>
                  <Analytics />
                  <SpeedInsights />
                </TradingModeProvider>
              </ToastProvider>
          </AuthProvider>
        </ErrorBoundary>
      </ClientSideProviders>
    </>
  );
}
