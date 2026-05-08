import { NextRequest, NextResponse } from "next/server";
import {
  isGuestAuthRoute,
  localizedPathname,
  parseLocalePath,
  sanitizePostAuthRedirect,
} from "./locale-path";
import { redirectWithCookies } from "./auth-guard";
import { createServerClient } from "@/lib/supabase/server";
import { handleOnboarding } from "./onboarding";
import { handleTierGate } from "./tier-gate";

/** Redirect med Cache-Control: no-store — forhindrer at auth-redirects caches av CDN */
function redirectNoCache(url: string | URL, status?: number): NextResponse {
  const res = NextResponse.redirect(url, status);
  res.headers.set("Cache-Control", "no-store, max-age=0, must-revalidate");
  return res;
}

const PROTECTED_PATHS = [
  "/dashboard",
  "/innstillinger",
  "/settings",
  "/admin",
  "/onboarding",
  "/checkout",
  "/akademi",
  "/auto-trading",
  "/konto",
  "/handelshistorikk",
  "/varsler",
  "/leagues",
  "/copy-trading",
  "/marketplace",
  "/profile",
  "/quiz",
];

const AUTH_PATHS = [
  "/login",
  "/register",
  "/registrer",
  "/glemt-passord",
];

export async function authMiddleware(
  request: NextRequest,
  response?: NextResponse,
): Promise<NextResponse> {
  response = response ?? NextResponse.next();
  const pathname = request.nextUrl.pathname;
  const { strippedPath } = parseLocalePath(pathname);

  // DEBUG: Log all cookies on every request
  const allCookies = request.cookies.getAll();
  const authCookies = allCookies.filter(c => c.name.includes('auth') || c.name.includes('sb-'));
  console.error("🔥 MIDDLEWARE COOKIES:", {
    path: pathname,
    totalCookies: allCookies.length,
    authCookieCount: authCookies.length,
    authCookieNames: authCookies.map(c => c.name),
  });

  // If i18n already redirected, we still operate on the original request
  // but the response object may carry cookies from i18n.
  // If response is not a 200, auth stops the chain via isTerminal.
  // We intentionally continue auth processing for 200 responses.

  // Skip auth callback — route handler does its own PKCE exchange
  // But log for debugging OAuth issues
  if (strippedPath.startsWith("/callback")) {
    const code = request.nextUrl.searchParams.get("code");
    const error = request.nextUrl.searchParams.get("error");
    const locale = parseLocalePath(pathname).locale;
    
    // Log to Sentry in production if there's an error
    if (error && process.env.NODE_ENV === "production") {
      console.error(`[Auth Callback] OAuth error: ${error}`, {
        locale,
        path: strippedPath,
        referer: request.headers.get("referer"),
      });
    }
    
    return response;
  }

  // 1. Supabase session refresh (writes updated cookies to the passed response)
  // CRITICAL FIX: Use single Supabase client per request to avoid cookie/sync issues
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!supabaseUrl || !supabaseAnonKey) {
    console.warn(
      "[middleware] NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY missing — skipping session refresh. Check .env.local and Vercel env vars.",
    );
    return response;
  }

  const supabase = createServerClient(request, response);
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // 0. Pre-auth guard for protected paths - use the SAME supabase client
  const isProtectedEarly = PROTECTED_PATHS.some((p) =>
    strippedPath.startsWith(p),
  );
  if (isProtectedEarly && !user) {
    const loginUrl = new URL(
      localizedPathname(parseLocalePath(pathname).locale, "/login"),
      request.url,
    );
    loginUrl.searchParams.set(
      "next",
      localizedPathname(parseLocalePath(pathname).locale, strippedPath),
    );
    return redirectNoCache(loginUrl);
  }

  // Logged-in users should not see guest auth pages
  if (user && isGuestAuthRoute(strippedPath)) {
    const nextParam = request.nextUrl.searchParams.get("next");
    const target = sanitizePostAuthRedirect(
      nextParam,
      parseLocalePath(pathname).locale,
    );
    const dest = new URL(target, request.url);
    return redirectWithCookies(dest, request, response);
  }

  const isProtected = PROTECTED_PATHS.some((p) => strippedPath.startsWith(p));
  const isAuthPage = AUTH_PATHS.some(
    (p) => strippedPath === p || strippedPath.startsWith(`${p}/`),
  );

  // Authenticated users on auth pages -> dashboard
  if (user && isAuthPage) {
    return redirectNoCache(
      new URL(
        localizedPathname(parseLocalePath(pathname).locale, "/dashboard"),
        request.url,
      ),
      302,
    );
  }

  // Onboarding & tier gates for logged-in users on protected paths
  if (isProtected && user) {
    const onboardingResult = await handleOnboarding(request, response);
    if (onboardingResult) return onboardingResult;
  }

  if (user) {
    const tierResult = await handleTierGate(request, response, user.id);
    if (tierResult) return tierResult;
  }

  return response;
}
