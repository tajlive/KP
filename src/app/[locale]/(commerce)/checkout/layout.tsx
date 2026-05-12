
import { AuthProvider } from "@/lib/auth/new/AuthContext";
import { ToastProvider } from "@/providers/ToastProvider";
import { ClientSideProviders } from "@/shared/providers/ClientSideProviders";
import { ErrorBoundary } from "@/shared/error/ErrorBoundary";
import { Analytics } from "@vercel/analytics/react";
import { SpeedInsights } from "@vercel/speed-insights/next";

export const runtime = 'edge';

export default function CheckoutLayout({
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
                <SpeedInsights />
              </>
            )}
          </ToastProvider>
        </AuthProvider>
      </ErrorBoundary>
    </ClientSideProviders>
  );
}
