import { chain } from "@/middleware/chain";
import { i18nMiddleware } from "@/middleware/i18n";
import { authMiddleware } from "@/middleware/auth";
import { rateLimitMiddleware } from "@/middleware/rateLimit";
import { cspMiddleware } from "@/middleware/csp";

/**
 * Next.js middleware chain — edge-layer for Klarpakke.
 *
 * Execution order (left → right):
 *   1. i18n   — locale routing, canonical redirects, duplicate-prefix fix
 *   2. auth   — session refresh, onboarding gates, tier gates (NO auth redirects —
 *               pages handle auth rendering via Guard-as-Render pattern)
 *   3. rateLimit — API rate limiting (Upstash Redis)
 *   4. csp    — Content-Security-Policy + security headers
 *
 * If any step returns a terminal response (redirect, 429, etc.), the chain
 * stops immediately.
 */
export default chain(
  i18nMiddleware,
  authMiddleware,
  rateLimitMiddleware,
  cspMiddleware,
);

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.png$|.*\\.jpg$|.*\\.svg$|.*\\.woff2$).*)",
  ],
};
