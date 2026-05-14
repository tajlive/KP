"use client";

import { useEffect } from "react";
import { AuthProvider } from "@/lib/auth/new/AuthContext";
import { useProgress } from "@/hooks/useProgress";
import { OnboardingFlow } from "@/features/onboarding/OnboardingFlow";
import { TradeSuccessProvider } from "@/hooks/useTradeSuccess";

// KRITISK: Inline script som kjører FØR AuthProvider for å rense korrupte tokens
const CorruptTokenCleanup = () => (
  <script
    dangerouslySetInnerHTML={{
      __html: `(function(){try{var k=Object.keys(localStorage);for(var i=0;i<k.length;i++){if(k[i].indexOf('sb-')===0){var v=localStorage.getItem(k[i]);if(v!==null){try{new TextDecoder('utf-8',{fatal:true}).decode(new TextEncoder().encode(v))}catch(e){console.warn('[Klarpakke] Korrupt token slettet:',k[i]);localStorage.removeItem(k[i])}}}}}catch(e){console.warn('[Klarpakke] Cleanup error:',e);}})();`,
    }}
  />
);
import { ProtectedRoute } from "@/lib/auth/new/ProtectedRoute";
import { ScrollToTop } from "@/features/dashboard/ScrollToTop";
import { TopNav } from "@/shared/navigation/TopNav";
import { BottomTabs } from "@/shared/navigation/BottomTabs";
import { usePaperTradingInit } from "@/hooks/usePaperTradingInit";
import { createClient } from "@/lib/utils";
import { ToastProvider } from "@/providers/ToastProvider";
import { TradingModeProvider } from "@/context/TradingModeContext";
import { ClientSideProviders } from "@/shared/providers/ClientSideProviders";
import { ThemeProvider } from "@/shared/theme";
import { QueryProvider } from "@/shared/providers/query-provider";
import { ErrorBoundary } from "@/shared/error/ErrorBoundary";
import { SentryInit } from "@/shared/providers/SentryInit";
// Vercel Analytics/SpeedInsights removed — now on Fly.io
// import { Analytics } from "@vercel/analytics/react";
// import { SpeedInsights } from "@vercel/speed-insights/next";
import { useAuth } from "@/lib/auth/new/AuthContext";
import { SURFACE } from "@/lib/design/tokens";
import { AnnouncementsContainer } from "@/components/Announcements";

function DashboardContent({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  usePaperTradingInit(user?.id);
  
  // Aktiver progress sync for dashboard
  useProgress();

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
      <ThemeProvider
        attribute="class"
        defaultTheme="system"
        enableSystem
        disableTransitionOnChange={false}
      >
      <ClientSideProviders>
        <QueryProvider>
          <ErrorBoundary>
            <AuthProvider>
              <ToastProvider>
                <TradingModeProvider>
                  <TradeSuccessProvider>
                    <ProtectedRoute>
                      <OnboardingFlow />
                    <SentryInit />
                    <div
                      className={`min-h-screen ${SURFACE.BG_LIGHT} flex flex-col`}
                      data-testid="dashboard-root"
                    >
                      <ScrollToTop />
                      <TopNav />
                      <div className="px-3 sm:px-4 lg:px-8 pt-2">
                        <AnnouncementsContainer />
                      </div>
                      <main className="flex-1 px-3 pt-2 pb-[calc(5.75rem+env(safe-area-inset-bottom,0px))] sm:px-4 lg:px-8 lg:pt-3 md:pb-8 overflow-y-auto">
                        <div className="mx-auto w-full max-w-7xl">
                          <DashboardContent>{children}</DashboardContent>
                        </div>
                      </main>
                      <BottomTabs />
                    </div>
                    </ProtectedRoute>
                  </TradeSuccessProvider>
                  {/* Analytics/SpeedInsights disabled on Fly.io */}
                  {/* <Analytics /> */}
                  {/* <SpeedInsights /> */}
                </TradingModeProvider>
              </ToastProvider>
            </AuthProvider>
          </ErrorBoundary>
        </QueryProvider>
      </ClientSideProviders>
      </ThemeProvider>
    </>
  );
}
