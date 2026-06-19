
import { CopyTradingSubAppHeader } from "@/features/copy-trading/CopyTradingSubAppHeader";
import { AuthProvider } from "@/lib/auth/new/AuthContext";
import { ToastProvider } from "@/providers/ToastProvider";
import { TradingModeProvider } from "@/context/TradingModeContext";
import { ClientSideProviders } from "@/shared/providers/ClientSideProviders";
import { ErrorBoundary } from "@/shared/error/ErrorBoundary";
// Vercel Analytics/SpeedInsights removed — now on Fly.io
// import { Analytics } from "@vercel/analytics/react";
// import { SpeedInsights } from "@vercel/speed-insights/next";
import { AmbientGlow } from "@/shared/ui/AmbientGlow";

export const runtime = 'nodejs';

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
                <AmbientGlow />
                <CopyTradingSubAppHeader />
                <main className="flex-1">{children}</main>
              </div>

            </TradingModeProvider>
          </ToastProvider>
        </AuthProvider>
      </ErrorBoundary>
    </ClientSideProviders>
  );
}
