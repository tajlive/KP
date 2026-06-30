import { ToastProvider } from "@/providers/ToastProvider";

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
  return <ToastProvider>{children}</ToastProvider>;
}
