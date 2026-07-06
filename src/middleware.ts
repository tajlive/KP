import { chain } from "@/middleware/chain";
import { removedPagesMiddleware } from "@/middleware/removed-pages";
import { legacyRedirectsMiddleware } from "@/middleware/legacy-redirects";
import { i18nMiddleware } from "@/middleware/i18n";
import { authMiddleware } from "@/middleware/auth";
import { rateLimitMiddleware } from "@/middleware/rateLimit";
import { cspMiddleware } from "@/middleware/csp";
import { cacheControlMiddleware } from "@/middleware/cache-control";

/**
 * Next.js middleware chain — edge-layer for Klarpakke.
 *
 * Execution order (left → right):
 *   1. removedPages    — legacy route removal redirects (301/302)
 *   2. legacyRedirects — canonical alias redirects (308) for routes that used
 *                        to live as redirect-only pages under src/app/[locale]
 *   3. i18n            — locale routing, canonical redirects, duplicate-prefix fix
 *   4. auth            — session refresh, onboarding gates, tier gates
 *   5. rateLimit       — API rate limiting (Upstash Redis)
 *   6. csp             — Content-Security-Policy (no cache side-effects)
 *   7. cacheControl    — selective no-store for sensitive routes
 *
 * If any step returns a terminal response (redirect, 429, etc.), the chain
 * stops immediately.
 */
export default chain(
  removedPagesMiddleware,
  legacyRedirectsMiddleware,
  i18nMiddleware,
  authMiddleware,
  rateLimitMiddleware,
  cspMiddleware,
  cacheControlMiddleware,
);

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|manifest.json|sw.js|robots.txt|sitemap.xml|.*\\.png$|.*\\.jpg$|.*\\.svg$|.*\\.woff2$).*)",
  ],
};
