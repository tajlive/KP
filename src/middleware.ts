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
    // Match alle pathname unntatt api, _next, _vercel og statiske filer
    "/((?!api|trpc|_next|_vercel|.*\\..*).*)",
  ],
};
