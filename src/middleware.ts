import createMiddleware from "next-intl/middleware";
import { type NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { routing } from "./i18n/routing";
import { handleOnboarding } from "./middleware/onboarding";
import { handleTierGate } from "./middleware/tier-gate";
import { redirectWithCookies } from "./middleware/auth-guard";
import {
  isGuestAuthRoute,
  localizedPathname,
  parseLocalePath,
  sanitizePostAuthRedirect,
} from "./middleware/locale-path";

const handleI18nRouting = createMiddleware(routing);

const PROTECTED_PATHS = [
  "/dashboard",
  "/innstillinger",
  "/admin",
  "/onboarding",
  "/checkout",
  "/akademi",
  // '/paper-trading' — ubeskyttet så besøkende ser tilbudet; innlogget bruker får liste
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

// Sider som kun gjelder uinnloggede — innloggede omdirigeres til dashboard
const AUTH_PATHS = [
  "/innlogging",
  "/signup",
  "/registrer",
  "/login",
  "/glemt-passord",
];

export async function middleware(request: NextRequest) {
  const host = request.headers.get("host") || "";

  if (host.endsWith(".vercel.app") && process.env.NEXT_PUBLIC_APP_URL) {
    const canonical = new URL(process.env.NEXT_PUBLIC_APP_URL);
    const url = request.nextUrl.clone();
    url.hostname = canonical.hostname;
    url.port = "";
    url.protocol = canonical.protocol;
    return NextResponse.redirect(url, { status: 308 });
  }

  const pathname = request.nextUrl.pathname;
  const { locale, strippedPath } = parseLocalePath(pathname);

  // Beta fjernes: omdiriger alle /beta-henvisninger til ordinær flyt
  if (strippedPath === "/beta" || strippedPath.startsWith("/beta/")) {
    const url = request.nextUrl.clone();
    if (strippedPath.includes("live-trading")) {
      url.pathname = localizedPathname(locale, "/paper-trading");
      url.searchParams.set("mode", "live");
    } else if (strippedPath.includes("auto-trade")) {
      url.pathname = localizedPathname(locale, "/dashboard/auto-trade");
    } else if (strippedPath.includes("connect-exchange")) {
      url.pathname = localizedPathname(locale, "/dashboard");
    } else {
      url.pathname = localizedPathname(locale, "/dashboard");
    }
    return NextResponse.redirect(url, 308);
  }

  // Engelsk alias /settings → innstillinger (før next-intl; unngår redirect-kø mot prod)
  if (strippedPath === "/settings" || strippedPath.startsWith("/settings/")) {
    const tail =
      strippedPath === "/settings"
        ? ""
        : strippedPath.slice("/settings".length);
    const target = `/innstillinger${tail}`;
    return NextResponse.redirect(
      new URL(localizedPathname(locale, target), request.url),
      308,
    );
  }

  // Kanoniske redirects: alias/dødslenker → én side (sletter unødvendige page-filer)
  const CANONICAL_REDIRECTS: Record<string, string> = {
    "/dashboard/activity": "/handelshistorikk",
    "/dashboard/trading": "/paper-trading",
    "/dashboard/innstillinger": "/dashboard/settings",
    "/trade": "/paper-trading",
    "/auto-trading": "/dashboard/auto-trade",
    "/auto-trading-ai": "/dashboard/auto-trade",
    "/login": "/innlogging",
    "/registrer": "/signup",
  };
  for (const [from, to] of Object.entries(CANONICAL_REDIRECTS)) {
    if (strippedPath === from || strippedPath.startsWith(from + "/")) {
      const dest = to.startsWith("/") ? to : `/${to}`;
      return NextResponse.redirect(
        new URL(localizedPathname(locale, dest), request.url),
        308,
      );
    }
  }

  // Do NOT redirect / to /no — next-intl with localePrefix: 'as-needed' serves
  // default locale at / and would redirect /no back to /, causing ERR_TOO_MANY_REDIRECTS.

  // 1. i18n routing
  const response = handleI18nRouting(request);

  if (response.status !== 200) {
    return response;
  }

  // Skip Supabase processing for auth callback — the route handler does its own PKCE exchange
  if (strippedPath.startsWith("/auth/callback")) {
    return response;
  }

  // 2. Supabase session refresh (writes updated cookies to response)
  // Guard: Edge Runtime may not have access to env vars in some contexts (fresh dev start, CI)
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

  // Innloggede skal ikke se logg inn / registrer (unntak: admin-login e.l.)
  if (user && isGuestAuthRoute(strippedPath)) {
    const nextParam = request.nextUrl.searchParams.get("next");
    const target = sanitizePostAuthRedirect(nextParam, locale);
    const dest = new URL(target, request.url);
    return redirectWithCookies(dest, request, response);
  }

  // 3. Auth-guard
  const isProtected = PROTECTED_PATHS.some((p) => strippedPath.startsWith(p));
  const isAuthPage = AUTH_PATHS.some(
    (p) => strippedPath === p || strippedPath.startsWith(`${p}/`),
  );

  // Innloggede brukere som går til innlogging/registrering → dashboard (ikke vise login/registrer)
  if (user && isAuthPage) {
    return NextResponse.redirect(
      new URL(localizedPathname(locale, "/dashboard"), request.url),
      302,
    );
  }

  if (isProtected && !user) {
    const loginUrl = new URL(
      localizedPathname(locale, "/innlogging"),
      request.url,
    );
    loginUrl.searchParams.set("next", pathname);
    return NextResponse.redirect(loginUrl);
  }

  if (isProtected && user) {
    const onboardingResult = await handleOnboarding(request, response);
    if (onboardingResult) return onboardingResult;
  }

  // Tier-gate for alle innloggede (f.eks. /paper-trading?mode=live er ikke i PROTECTED_PATHS)
  if (user) {
    const tierResult = await handleTierGate(request, response, user.id);
    if (tierResult) return tierResult;
  }

  return response;
}

export const config = {
  matcher: [
    // Match alle pathname unntatt api, _next, _vercel og statiske filer
    "/((?!api|trpc|_next|_vercel|.*\\..*).*)",
  ],
};
