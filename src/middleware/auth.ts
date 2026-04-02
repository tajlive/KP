import { createServerClient } from "@supabase/ssr";
import { NextRequest, NextResponse } from "next/server";
import {
  isGuestAuthRoute,
  localizedPathname,
  parseLocalePath,
  sanitizePostAuthRedirect,
} from "./locale-path";
import { redirectWithCookies } from "./auth-guard";
import { handleOnboarding } from "./onboarding";
import { handleTierGate } from "./tier-gate";

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

  // If i18n already redirected, we still operate on the original request
  // but the response object may carry cookies from i18n.
  // If response is not a 200, auth stops the chain via isTerminal.
  // We intentionally continue auth processing for 200 responses.

  // Skip auth callback — route handler does its own PKCE exchange
  if (strippedPath.startsWith("/auth/callback")) {
    return response;
  }

  // 0. Pre-auth guard for protected paths
  const isProtectedEarly = PROTECTED_PATHS.some((p) =>
    strippedPath.startsWith(p),
  );
  if (isProtectedEarly) {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    if (supabaseUrl && supabaseAnonKey) {
      const earlySupabase = createServerClient(supabaseUrl, supabaseAnonKey, {
        cookieEncoding: "raw",
        cookies: {
          getAll: () => request.cookies.getAll(),
          setAll: () => {},
        },
      });
      const {
        data: { user },
      } = await earlySupabase.auth.getUser();
      if (!user) {
        const loginUrl = new URL(
          localizedPathname(parseLocalePath(pathname).locale, "/login"),
          request.url,
        );
        loginUrl.searchParams.set(
          "next",
          localizedPathname(parseLocalePath(pathname).locale, strippedPath),
        );
        return NextResponse.redirect(loginUrl);
      }
    }
  }

  // 1. Supabase session refresh (writes updated cookies to the passed response)
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!supabaseUrl || !supabaseAnonKey) {
    console.warn(
      "[middleware] NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY missing — skipping session refresh. Check .env.local and Vercel env vars.",
    );
    return response;
  }

  const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
    cookieEncoding: "raw",
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll: (cookiesToSet) => {
        cookiesToSet.forEach(({ name, value, options }) => {
          request.cookies.set(name, value);
          response.cookies.set(name, value, options);
        });
      },
    },
  });
  const {
    data: { user },
  } = await supabase.auth.getUser();

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
    return NextResponse.redirect(
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
