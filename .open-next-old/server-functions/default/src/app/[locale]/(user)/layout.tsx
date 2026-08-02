export const dynamic = "force-dynamic";

import { AppShell } from "@/shared/navigation/AppShell";

export const runtime = "nodejs";

/**
 * Shared layout for all authenticated user flows.
 *
 * Wraps every route under /[locale]/(user)/* in the canonical app shell
 * (TopNav + BottomTabs) so the four core flows — portfolio, market, trade
 * and account — share the same mobile-first navigation chrome.
 */
export default function UserLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <AppShell>{children}</AppShell>;
}
