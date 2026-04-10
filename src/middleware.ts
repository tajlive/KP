/**
 * NY MIDDLEWARE - Forenklet
 * 
 * Kun to oppgaver:
 * 1. Route protection (kreve auth for /dashboard)
 * 2. i18n (språk)
 * 
 * Ingen komplekse auth-redirects her!
 */

import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";

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

  // Opprett Supabase client
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookieEncoding: "raw",
      cookies: {
        getAll: () => request.cookies.getAll(),
        setAll: (cookies) => {
          cookies.forEach(({ name, value, options }) => {
            request.cookies.set(name, value);
          });
        },
      },
    }
  );

  // Sjekk om bruker er logget inn
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

  // Alt OK, fortsett
  return NextResponse.next();
}

export const config = {
  matcher: [
    // Matcher alt unntatt statiske filer og API routes
    "/((?!_next/static|_next/image|favicon.ico|api/|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
