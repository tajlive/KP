
import { AuthProvider } from "@/lib/auth/new/AuthContext";
import { ToastProvider } from "@/providers/ToastProvider";
import { ClientSideProviders } from "@/shared/providers/ClientSideProviders";
import { ErrorBoundary } from "@/shared/error/ErrorBoundary";

export const runtime = 'nodejs';

export default function HandelshistorikkLayout({
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
          </ToastProvider>
        </AuthProvider>
      </ErrorBoundary>
    </ClientSideProviders>
  );
}
