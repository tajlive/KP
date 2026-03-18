import createMiddleware from "next-intl/middleware";
import { type NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { routing } from "./i18n/routing";
import { handleOnboarding } from "./middleware/onboarding";
import { handleTierGate } from "./middleware/tier-gate";

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
  const locale = pathname.split("/")[1] || "no";
  const strippedPath = pathname.replace(/^\/(no|en|th|zh)/, "") || "/";

  // Beta fjernes: omdiriger alle /beta-henvisninger til ordinær flyt
  if (strippedPath === "/beta" || strippedPath.startsWith("/beta/")) {
    const url = request.nextUrl.clone();
    if (strippedPath.includes("live-trading")) {
      url.pathname = `/${locale}/paper-trading`;
      url.searchParams.set("mode", "live");
    } else if (strippedPath.includes("auto-trade")) {
      url.pathname = `/${locale}/dashboard/auto-trade`;
    } else if (strippedPath.includes("connect-exchange")) {
      url.pathname = `/${locale}/dashboard`;
    } else {
      url.pathname = `/${locale}/dashboard`;
    }
    return NextResponse.redirect(url, 308);
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
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
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
    },
  );
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // 3. Auth-guard
  const isProtected = PROTECTED_PATHS.some((p) => strippedPath.startsWith(p));

  if (isProtected && !user) {
    const loginUrl = new URL(`/${locale}/innlogging`, request.url);
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
