import { createServerClient } from "@supabase/ssr";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { createRefreshProtectedFetch } from "@/lib/auth/refresh-guard";

export const PROTECTED_PATHS = [
  "/dashboard",
  "/admin",
  "/profil",
  "/innstillinger",
  "/courses",
  "/betaling",
  "/paper-trading",
  "/auto-trading",
  "/auto-trading-ai",
  "/akademi",
  "/leaderboard",
  "/handelshistorikk",
  "/varsler",
  "/konto",
  "/live-trading",
  "/leagues",
  "/copy-trading",
  "/marketplace",
  "/profile",
  "/quiz",
  "/interessetest",
] as const;

export const PUBLIC_PATHS = [
  "/login",
  "/register",
  "/glemt-passord",
  "/callback",
  "/forgot-password",
  "/reset-password",
] as const;

export function getCookieDomain(request: NextRequest): string | undefined {
  const host = request.headers.get("host") || "";
  const isWWW = host.startsWith("www.");
  const rootDomain = isWWW ? host.replace("www.", "") : host;
  return rootDomain.includes(":") ? undefined : `.${rootDomain}`;
}

export function createSupabaseClient(
  request: NextRequest,
  response: NextResponse,
) {
  const cookieDomain = getCookieDomain(request);

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookieEncoding: "raw",
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            response.cookies.set(name, value, {
              ...options,
              sameSite: "none" as const,
              secure: true,
              domain: cookieDomain,
            });
          });
        },
      },
      global: {
        fetch: createRefreshProtectedFetch(globalThis.fetch, {
          source: "middleware",
          path: request.nextUrl.pathname,
        }),
      },
    },
  );
}

export function redirectWithCookies(
  url: URL,
  request: NextRequest,
  response: NextResponse,
): NextResponse {
  const redirectResponse = NextResponse.redirect(url);
  const cookieDomain = getCookieDomain(request);

  // Copy cookies from the next() response to the redirect response
  response.cookies.getAll().forEach((cookie) => {
    redirectResponse.cookies.set(cookie.name, cookie.value, {
      ...cookie,
      domain: cookieDomain,
      sameSite: "none" as const,
      secure: true,
    });
  });
  
  // Also copy all cookies from the original request to ensure chunked auth cookies are preserved
  // This is critical for Supabase SSR cookie chunking (.0, .1, .2)
  request.cookies.getAll().forEach((cookie) => {
    // Only copy auth-related cookies that might not be in response yet
    if (cookie.name.includes('sb-') || cookie.name.includes('auth-token')) {
      // Check if already set from response
      const existing = redirectResponse.cookies.get(cookie.name);
      if (!existing) {
        redirectResponse.cookies.set(cookie.name, cookie.value, {
          domain: cookieDomain,
          path: '/',
          sameSite: "none" as const,
          secure: true,
          httpOnly: false,
        });
      }
    }
  });
  
  return redirectResponse;
}

export async function handleAuthGuard(
  request: NextRequest,
): Promise<NextResponse | null> {
  const { pathname } = request.nextUrl;
  const response = NextResponse.next();

  const locale = pathname.split("/")[1] || "no";
  const pathWithoutLocale = pathname.replace(`/${locale}`, "") || "/";

  // Check if it's an auth callback
  if (pathname.includes("/callback")) {
    return response;
  }

  // Create supabase client
  const supabase = createSupabaseClient(request, response);
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Check path types
  const isProtectedPath = PROTECTED_PATHS.some(
    (p) => pathWithoutLocale === p || pathWithoutLocale.startsWith(`${p}/`),
  );
  const isProtected =
    isProtectedPath || pathWithoutLocale.startsWith("/onboarding");

  const isAuthPage = PUBLIC_PATHS.some(
    (p) => pathWithoutLocale === p || pathWithoutLocale.startsWith(`${p}/`),
  );

  // 1. Unauthenticated users trying to access protected paths
  if (isProtected && !user) {
    const loginUrl = new URL(`/${locale}/innlogging`, request.url);
    loginUrl.searchParams.set("next", pathname);
    return redirectWithCookies(loginUrl, request, response);
  }

  // 2. Authenticated users trying to access auth pages (login/signup)
  if (isAuthPage && user) {
    return redirectWithCookies(
      new URL(`/${locale}/dashboard`, request.url),
      request,
      response,
    );
  }

  return response;
}
