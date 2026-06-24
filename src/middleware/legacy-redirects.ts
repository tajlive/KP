import { NextRequest, NextResponse } from "next/server";
import type { MiddlewareFn } from "./types";
import { localizedPathname, parseLocalePath } from "./locale-path";

interface LegacyRedirect {
  /** Locale-independent path that should be redirected (matched exactly or as a prefix). */
  from: string;
  /** Canonical destination path (locale will be prepended). */
  to: string;
  /** Query parameters to set on the destination URL. */
  setQuery?: Record<string, string>;
}

/**
 * Permanent 308 redirects for legacy/alias routes that used to be implemented as
 * redirect-only pages. Keeping them in middleware guarantees they run before
 * Next.js routing and any CDN cache lookup, and avoids maintaining near-empty
 * page files.
 */
export const LEGACY_REDIRECTS: readonly LegacyRedirect[] = [
  { from: "/live-trading", to: "/handel", setQuery: { mode: "live" } },
  { from: "/paper-trading", to: "/handel", setQuery: { mode: "paper" } },
  { from: "/tradere", to: "/copy-trading" },
  { from: "/dashboard/auto-handel", to: "/dashboard/auto-trade" },
  { from: "/dashboard/autopilot/launch", to: "/dashboard/autopilot" },
];

/**
 * Middleware that intercepts requests to legacy alias routes and returns a
 * permanent redirect before Next.js routing or CDN cache lookup.
 */
export const legacyRedirectsMiddleware: MiddlewareFn = (request: NextRequest) => {
  const pathname = request.nextUrl.pathname;
  const { locale, strippedPath } = parseLocalePath(pathname);

  for (const redirect of LEGACY_REDIRECTS) {
    const matches =
      strippedPath === redirect.from ||
      strippedPath.startsWith(`${redirect.from}/`);

    if (!matches) continue;

    const url = request.nextUrl.clone();
    url.pathname = localizedPathname(locale, redirect.to);

    if (redirect.setQuery) {
      for (const [key, value] of Object.entries(redirect.setQuery)) {
        url.searchParams.set(key, value);
      }
    }

    return NextResponse.redirect(url, 308);
  }

  return NextResponse.next();
};
