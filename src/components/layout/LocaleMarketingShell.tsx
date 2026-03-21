"use client";

import { ConditionalFooter } from "@/components/landing/ConditionalFooter";
import { MarketingNavigation } from "@/components/layout/MarketingNavigation";
import { parseLocalePath } from "@/middleware/locale-path";
import { usePathname } from "next/navigation";

/**
 * Ruter med egen app-chrome (sidebar, fullskjerm trading, checkout, osv.)
 * skal ikke ha MarketingNavigation + ConditionalFooter — det ga dobbelt header
 * og «rot» (f.eks. /copy-trading under lys marketing-bar + mørk dashboard).
 */
const STRIPPED_PATHS_HIDE_MARKETING: readonly string[] = [
  "/dashboard",
  "/copy-trading",
  "/marketplace",
  "/admin",
  "/checkout",
  "/onboarding",
  "/akademi",
  "/konto",
  "/handelshistorikk",
  "/varsler",
  "/leagues",
  "/profile",
  "/quiz",
  "/innstillinger",
];

function shouldHideMarketingShell(strippedPath: string): boolean {
  return STRIPPED_PATHS_HIDE_MARKETING.some(
    (p) => strippedPath === p || strippedPath.startsWith(`${p}/`),
  );
}

export function LocaleMarketingShell({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname() ?? "/";
  const { strippedPath } = parseLocalePath(pathname);
  const hideMarketing = shouldHideMarketingShell(strippedPath);

  if (hideMarketing) {
    return (
      <div className="relative flex min-h-screen flex-col">{children}</div>
    );
  }

  return (
    <div className="relative flex min-h-screen flex-col">
      <MarketingNavigation />
      <main className="flex-1">{children}</main>
      <ConditionalFooter />
    </div>
  );
}
