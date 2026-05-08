import { NextRequest, NextResponse } from "next/server";
import type { MiddlewareFn } from "./types";

/**
 * Redirect middleware for removed pages.
 * Runs before other middleware to handle deleted routes.
 */
export const removedPagesMiddleware: MiddlewareFn = (request: NextRequest) => {
  const { pathname } = request.nextUrl;

  // Redirect removed /dashboard/ai → /dashboard
  if (pathname === "/dashboard/ai" || pathname.endsWith("/dashboard/ai")) {
    const locale = pathname.startsWith("/no/")
      ? "no"
      : pathname.startsWith("/en/")
        ? "en"
        : "no";
    const redirectUrl = new URL(`/${locale}/dashboard`, request.url);
    const response = NextResponse.redirect(redirectUrl, 301);
    response.headers.set("Cache-Control", "no-store, max-age=0, must-revalidate");
    return response;
  }

  return NextResponse.next();
};
