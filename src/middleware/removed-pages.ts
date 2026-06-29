import { NextRequest, NextResponse } from "next/server";
import type { MiddlewareFn } from "./types";

/**
 * Registry of pages that have been permanently removed from the app.
 * When a page is deleted, add an entry here so the middleware returns
 * a proper redirect instead of letting stale CDN cache serve 200 OK.
 *
 * NOTE: Cloudflare CDN caches HTML with s-maxage. When a page is deleted,
 * the prerendered HTML may still be cached at the edge. next.config.mjs
 * redirects run AFTER CDN cache lookup, so they don't help. Middleware
 * runs at the edge BEFORE routing, which is why this registry exists.
 */
export interface RemovedPage {
  /** The path that was removed (matched with endsWith) */
  from: string;
  /** Where users should be redirected */
  to: string;
  /** HTTP status code (301 = permanent, 302 = temporary) */
  status: 301 | 302;
}

export const REMOVED_PAGES: readonly RemovedPage[] = [
  {
    from: "/dashboard/ai",
    to: "/dashboard",
    status: 301,
  },
];

/**
 * Build a redirect URL preserving the locale prefix.
 */
function buildRedirectUrl(
  request: NextRequest,
  pathname: string,
  toPath: string,
): URL {
  const locale = pathname.startsWith("/en/")
    ? "en"
    : pathname.startsWith("/no/")
      ? "no"
      : "no";

  // If toPath already has locale prefix, use as-is
  if (toPath.startsWith(`/${locale}/`)) {
    return new URL(toPath, request.url);
  }

  // Otherwise prepend locale
  return new URL(`/${locale}${toPath}`, request.url);
}

/**
 * Middleware that intercepts requests to removed pages and returns
 * a redirect before Next.js routing or CDN cache lookup.
 */
export const removedPagesMiddleware: MiddlewareFn = (request: NextRequest) => {
  const { pathname } = request.nextUrl;

  for (const removed of REMOVED_PAGES) {
    if (pathname === removed.from || pathname.endsWith(removed.from)) {
      const redirectUrl = buildRedirectUrl(request, pathname, removed.to);
      const response = NextResponse.redirect(redirectUrl, removed.status);
      // Prevent caching of the redirect itself
      response.headers.set(
        "Cache-Control",
        "no-store, max-age=0, must-revalidate",
      );
      return response;
    }
  }

  return NextResponse.next();
};
