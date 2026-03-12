import { createServerClient } from "@supabase/ssr";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

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
  "/beta",
  "/copy-trading",
  "/marketplace",
  "/profile",
  "/quiz",
  "/interessetest",
] as const;

export const PUBLIC_PATHS = [
  "/innlogging",
  "/registrer",
  "/glemt-passord",
  "/auth/callback",
  "/login",
  "/signup",
  "/forgot-password",
  "/reset-password",
] as const;

export function getCookieDomain(request: NextRequest): string | undefined {
  const host = request.headers.get("host") || "";
  const isWWW = host.startsWith("www.");
  const rootDomain = isWWW ? host.replace("www.", "") : host;
  return rootDomain.includes(":") ? undefined : `.${rootDomain}`;
}

export function createSupabaseClient(request: NextRequest, response: NextResponse) {
  const cookieDomain = getCookieDomain(request);

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            response.cookies.set(name, value, {
              ...options,
              sameSite: "lax" as const,
              secure: true,
              domain: cookieDomain,
            });
          });
        },
      },
    },
  );
}

export function redirectWithCookies(
  url: URL, 
  request: NextRequest, 
  response: NextResponse
): NextResponse {
  const redirectResponse = NextResponse.redirect(url);
  const cookieDomain = getCookieDomain(request);
  
  // Copy cookies from the next() response to the redirect response
  response.cookies.getAll().forEach((cookie) => {
    redirectResponse.cookies.set(cookie.name, cookie.value, {
      ...cookie,
      domain: cookieDomain,
      sameSite: "lax" as const,
      secure: true,
    });
  });
  return redirectResponse;
}

export async function handleAuthGuard(request: NextRequest): Promise<NextResponse | null> {
  const { pathname } = request.nextUrl;
  const response = NextResponse.next();

  const locale = pathname.split("/")[1] || "no";
  const pathWithoutLocale = pathname.replace(`/${locale}`, "") || "/";

  // Check if it's an auth callback
  if (pathname.includes("/auth/callback")) {
    return response;
  }

  // Create supabase client
  const supabase = createSupabaseClient(request, response);
  const { data: { user } } = await supabase.auth.getUser();

  // Check path types
  const isProtectedPath = PROTECTED_PATHS.some(
    (p) => pathWithoutLocale === p || pathWithoutLocale.startsWith(`${p}/`),
  );
  const isProtected = isProtectedPath || pathWithoutLocale.startsWith("/onboarding");

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
    return redirectWithCookies(new URL(`/${locale}/dashboard`, request.url), request, response);
  }

  return response;
}
