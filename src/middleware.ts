import { chain } from "@/middleware/chain";
import { removedPagesMiddleware } from "@/middleware/removed-pages";
import { i18nMiddleware } from "@/middleware/i18n";
import { authMiddleware } from "@/middleware/auth";
import { rateLimitMiddleware } from "@/middleware/rateLimit";
import { cspMiddleware } from "@/middleware/csp";
import { cacheControlMiddleware } from "@/middleware/cache-control";

/**
 * Next.js middleware chain — edge-layer for Klarpakke.
 *
 * Execution order (left → right):
 *   1. removedPages — legacy route removal redirects
 *   2. i18n         — locale routing, canonical redirects, duplicate-prefix fix
 *   3. auth         — session refresh, onboarding gates, tier gates
 *   4. rateLimit    — API rate limiting (Upstash Redis)
 *   5. csp          — Content-Security-Policy (no cache side-effects)
 *   6. cacheControl — selective no-store for sensitive routes
 *
 * If any step returns a terminal response (redirect, 429, etc.), the chain
 * stops immediately.
 */
export default chain(
  removedPagesMiddleware,
  i18nMiddleware,
  authMiddleware,
  rateLimitMiddleware,
  cspMiddleware,
  cacheControlMiddleware,
);

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|manifest.json|robots.txt|sitemap.xml|.*\\.png$|.*\\.jpg$|.*\\.svg$|.*\\.woff2$).*)",
  ],
};
