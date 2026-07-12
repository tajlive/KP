// Minimal middleware — redirect root til default locale
// Kreves fordi next-intl localePrefix: 'always' ikke har middleware aktiv.
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Redirect root til default locale (no)
  if (pathname === "/") {
    return NextResponse.redirect(new URL("/no", request.url), 308);
  }

  return NextResponse.next();
}

export const config = {
  matcher: "/",
};
