/**
 * MIDDLEWARE med i18n + Auth
 * 
 * 1. i18n routing (next-intl) - håndterer / → /no
 * 2. Route protection (kreve auth for /dashboard)
 */

import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";
import createIntlMiddleware from "next-intl/middleware";
import { routing } from "./i18n/routing.config";

// Opprett next-intl middleware
const handleI18n = createIntlMiddleware(routing);

// Routes som krever auth
const PROTECTED_ROUTES = [
  "/dashboard",
  "/profile",
  "/settings",
  "/admin",
];

// Auth routes (redirect til dashboard hvis allerede logget inn)
const AUTH_ROUTES = [
  "/auth/login",
  "/auth/register",
  "/auth/reset-password",
];

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // 1. Kjør i18n routing først (håndterer / → /no)
  const i18nResponse = handleI18n(request);
  
  // Hvis i18n gir redirect (f.eks. / → /no), returner den
  if (i18nResponse.status !== 200) {
    return i18nResponse;
  }

  // 2. Auth håndtering
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookieEncoding: "raw",
      cookies: {
        getAll: () => request.cookies.getAll(),
        setAll: (cookies) => {
          cookies.forEach(({ name, value }) => {
            request.cookies.set(name, value);
          });
        },
      },
    }
  );

  const { data: { user } } = await supabase.auth.getUser();

  // Hvis protected route og ikke logget inn -> redirect til login
  const isProtected = PROTECTED_ROUTES.some(route => 
    pathname === route || pathname.startsWith(`${route}/`)
  );
  
  if (isProtected && !user) {
    const loginUrl = new URL("/auth/login", request.url);
    loginUrl.searchParams.set("next", pathname);
    return NextResponse.redirect(loginUrl);
  }

  // Hvis auth route og allerede logget inn -> redirect til dashboard
  const isAuthRoute = AUTH_ROUTES.some(route => pathname.startsWith(route));
  
  if (isAuthRoute && user) {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  // Returner i18n response (med eventuelle cookie updates)
  return i18nResponse;
}

export const config = {
  matcher: [
    // Matcher alt unntatt statiske filer og API routes
    "/((?!_next/static|_next/image|favicon.ico|api/|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
