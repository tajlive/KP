import { ToastProvider } from "@/providers/ToastProvider";
import ImpersonationBanner from "@/components/admin/support/ImpersonationBanner";

export const runtime = "nodejs";

/**
 * Layout for the trading cockpit.
 *
 * Provides the toast container used by realtime trade notifications.
 */
export default function HandelLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ToastProvider>
      <ImpersonationBanner />
      {children}
    </ToastProvider>
  );
}
