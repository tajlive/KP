/**
 * Next.js root middleware.
 *
 * Composes all sub-middlewares (i18n, auth, rate-limit, CSP, cache-control)
 * into a single chain.  Each step passes the accumulated response to the next;
 * a terminal response (redirect, 429, etc.) stops the chain immediately.
 *
 * Without this file, none of src/middleware/*.ts runs — auth guards, i18n routing,
 * rate limiting, CSP headers, and cache control are all skipped.
 */

import { chain } from "@/middleware/exports";
import { i18nMiddleware } from "@/middleware/exports";
import { authMiddleware } from "@/middleware/exports";
import { rateLimitMiddleware } from "@/middleware/exports";
import { cspMiddleware } from "@/middleware/exports";
import { cacheControlMiddleware } from "@/middleware/exports";
import { correlationIdMiddleware } from "@/middleware/exports";
import { legacyRedirectsMiddleware } from "@/middleware/legacy-redirects";

export const config = {
  matcher: [
    // Skip static files and internal Next.js paths
    "/((?!_next/static|_next/image|favicon.ico|logo.svg|sitemap.xml|robots.txt|llms.txt|.*\\.(?:svg|png|jpg|jpeg|gif|webp|woff2?|ico)).*)",
  ],
};

const composed = chain(
  correlationIdMiddleware,
  legacyRedirectsMiddleware,
  i18nMiddleware,
  authMiddleware,
  rateLimitMiddleware,
  cspMiddleware,
  cacheControlMiddleware,
);

export default composed;
