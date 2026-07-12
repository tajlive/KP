import { chain, authMiddleware, i18nMiddleware, rateLimitMiddleware, cspMiddleware, cacheControlMiddleware } from "@/middleware/exports";

export default chain(
  rateLimitMiddleware,
  i18nMiddleware,
  authMiddleware,
  cspMiddleware,
  cacheControlMiddleware,
);

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon\\.ico|icon\\.svg|manifest\\.json|sw\\.js|icons/.*|mobile-audit/.*).*)",
  ],
};
