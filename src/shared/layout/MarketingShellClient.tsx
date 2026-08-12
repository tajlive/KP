"use client";

import { ConditionalFooter } from "@/features/landing/ConditionalFooter";
import {
  isAppShellPath,
} from "@/lib/navigation/config";
import { isGuestAuthRoute, parseLocalePath } from "@/middleware/locale-path";
import { usePathname, useSearchParams } from "next/navigation";
import { type ReactNode } from "react";
import { BetaInfoBannerClient } from "@/components/BetaInfoBannerClient";

/**
 * Ruter med egen app-chrome (sidebar, fullskjerm trading, checkout, osv.)
 * skal ikke ha MarketingNavigation + ConditionalFooter — det ga dobbelt header
 * og «rot» (f.eks. /copy-trading under lys marketing-bar + mørk dashboard).
 */

/** `next` / `redirect` etter innlogging — kun path, støtter /en/... og full URL */
function strippedPathFromPostAuthTarget(raw: string | null): string | null {
  if (raw == null || raw.trim() === "") return null;
  let pathPart = raw.trim();
  try {
    if (pathPart.startsWith("http://") || pathPart.startsWith("https://")) {
      const u = new URL(pathPart);
      pathPart = u.pathname;
    }
  } catch {
    return null;
  }
  if (!pathPart.startsWith("/") || pathPart.startsWith("//")) return null;
  const q = pathPart.indexOf("?");
  const pathOnly = q >= 0 ? pathPart.slice(0, q) : pathPart;
  return parseLocalePath(pathOnly).strippedPath;
}

function MarketingShellLayout({
  hideMarketing,
  marketingNav,
  children,
}: {
  hideMarketing: boolean;
  marketingNav: ReactNode;
  children: ReactNode;
}) {
  if (hideMarketing) {
    // Ingen wrapper for app-ruter (dashboard, etc) - lar DashboardClientLayout håndtere layout
    return <>{children}</>;
  }

  return (
    <div className="relative flex min-h-screen flex-col">
      {marketingNav}
      {/* P0 kundevendt: beta-banner rett under header for innloggede */}
      <BetaInfoBannerClient />
      <main className="flex-1">{children}</main>
      <ConditionalFooter />
    </div>
  );
}

export function LocaleMarketingShellInner({
  marketingNav,
  children,
}: {
  marketingNav: ReactNode;
  children: ReactNode;
}) {
  const pathname = usePathname() ?? "/";
  const searchParams = useSearchParams();
  const { strippedPath } = parseLocalePath(pathname);

  let hideMarketing = isAppShellPath(strippedPath);

  if (!hideMarketing && isGuestAuthRoute(strippedPath)) {
    const targetRaw = searchParams.get("next") ?? searchParams.get("redirect");
    const targetStripped = strippedPathFromPostAuthTarget(targetRaw);
    if (targetStripped && isAppShellPath(targetStripped)) {
      hideMarketing = true;
    }
  }

  return (
    <MarketingShellLayout hideMarketing={hideMarketing} marketingNav={marketingNav}>
      {children}
    </MarketingShellLayout>
  );
}

/** Fallback uten searchParams (unngår hydration mismatch / static krav) */
export function LocaleMarketingShellFallback({
  marketingNav,
  children,
}: {
  marketingNav: ReactNode;
  children: ReactNode;
}) {
  const pathname = usePathname() ?? "/";
  const { strippedPath } = parseLocalePath(pathname);
  const hideMarketing = isAppShellPath(strippedPath);

  return (
    <MarketingShellLayout hideMarketing={hideMarketing} marketingNav={marketingNav}>
      {children}
    </MarketingShellLayout>
  );
}
