"use client";

import { ConditionalFooter } from "@/features/landing/ConditionalFooter";
import { MarketingNavigation } from "@/shared/layout/MarketingNavigation";
import { isGuestAuthRoute, parseLocalePath } from "@/middleware/locale-path";
import { usePathname, useSearchParams } from "next/navigation";
import { Suspense, type ReactNode } from "react";

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
  children,
}: {
  hideMarketing: boolean;
  children: ReactNode;
}) {
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

function LocaleMarketingShellInner({ children }: { children: ReactNode }) {
  const pathname = usePathname() ?? "/";
  const searchParams = useSearchParams();
  const { strippedPath } = parseLocalePath(pathname);

  let hideMarketing = shouldHideMarketingShell(strippedPath);

  if (!hideMarketing && isGuestAuthRoute(strippedPath)) {
    const targetRaw = searchParams.get("next") ?? searchParams.get("redirect");
    const targetStripped = strippedPathFromPostAuthTarget(targetRaw);
    if (targetStripped && shouldHideMarketingShell(targetStripped)) {
      hideMarketing = true;
    }
  }

  return (
    <MarketingShellLayout hideMarketing={hideMarketing}>
      {children}
    </MarketingShellLayout>
  );
}

/** Fallback uten searchParams (unngår hydration mismatch / static krav) */
function LocaleMarketingShellFallback({ children }: { children: ReactNode }) {
  const pathname = usePathname() ?? "/";
  const { strippedPath } = parseLocalePath(pathname);
  const hideMarketing = shouldHideMarketingShell(strippedPath);

  return (
    <MarketingShellLayout hideMarketing={hideMarketing}>
      {children}
    </MarketingShellLayout>
  );
}

export function LocaleMarketingShell({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <Suspense
      fallback={
        <LocaleMarketingShellFallback>{children}</LocaleMarketingShellFallback>
      }
    >
      <LocaleMarketingShellInner>{children}</LocaleMarketingShellInner>
    </Suspense>
  );
}
