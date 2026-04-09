/**
 * Middleware - Next.js Auth & i18n
 * 
 * Kjører på Edge Runtime før hver request.
 * Håndterer: i18n, Auth, Rate limiting
 */

import type { NextRequest } from "next/server";
import { chain, i18nMiddleware, authMiddleware, rateLimitMiddleware } from "./middleware/index";

export function middleware(request: NextRequest) {
  return chain(
    i18nMiddleware,
    authMiddleware,
    rateLimitMiddleware,
  )(request);
}

export const config = {
  matcher: [
    "/((?!api|trpc|_next|_vercel|.*\\..*).*)",
  ],
};
