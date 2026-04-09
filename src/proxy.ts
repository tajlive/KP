/**
 * proxy.ts - Next.js 16 Proxy Convention
 * 
 * Tidligere: middleware.ts (deprecated i Next.js 16)
 * Nå: proxy.ts (ny standard)
 * 
 * Kjøres før hver request for:
 * - i18n (språkhåndtering)
 * - Auth (autentisering)
 * - Rate limiting
 */

import type { NextRequest } from "next/server";
import { chain, i18nMiddleware, authMiddleware, rateLimitMiddleware } from "./middleware/index";

/**
 * Proxy function - erstatter middleware() i Next.js 16
 * Kjører på Edge Runtime
 */
export function proxy(request: NextRequest) {
  return chain(
    i18nMiddleware,
    authMiddleware,
    rateLimitMiddleware,
  )(request);
}

/**
 * Matcher config - hvilke ruter skal proxy kjøre på
 */
export const config = {
  matcher: [
    // Match alle pathname unntatt api, _next, _vercel og statiske filer
    "/((?!api|trpc|_next|_vercel|.*\\..*).*)",
  ],
};
