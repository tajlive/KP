import { createServerClient } from "@supabase/ssr";
import { kv } from "@vercel/kv";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

const PROTECTED_PATHS = [
  "/dashboard",
  "/admin",
  "/admin-dashboard",
  "/super-admin",
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
  "/simulator",
  "/leagues",
  "/beta",
  "/beta-testing",
  "/copy-trading",
  "/marketplace",
  "/profile",
  "/quiz",
  "/signals",
  "/interessetest",
  "/settings",
];

const PUBLIC_PATHS = [
  "/innlogging",
  "/registrer",
  "/glemt-passord",
  "/auth/callback",
  "/login",
  "/signup",
  "/forgot-password",
  "/reset-password",
];

const SUPPORTED_LOCALES = ["no", "en", "th", "zh"];
const DEFAULT_LOCALE = "no";

function getPreferredLocale(acceptLanguage: string | null): string {
  if (!acceptLanguage) return DEFAULT_LOCALE;

  const languages = acceptLanguage
    .split(",")
    .map((lang) => {
      const [code, qValue] = lang.trim().split(";q=");
      const quality = qValue ? parseFloat(qValue) : 1.0;
      return { code: code.toLowerCase(), quality };
    })
    .sort((a, b) => b.quality - a.quality);

  for (const { code } of languages) {
    if (SUPPORTED_LOCALES.includes(code)) return code;
    const baseCode = code.split("-")[0];
    if (SUPPORTED_LOCALES.includes(baseCode)) return baseCode;
    if (baseCode === "nb") return "no";
  }

  return DEFAULT_LOCALE;
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // CSP is handled by vercel.json headers — no nonce needed

  // 🌍 Auto-redirect based on browser language
  const pathnameHasLocale = SUPPORTED_LOCALES.some(
    (locale) => pathname.startsWith(`/${locale}/`) || pathname === `/${locale}`,
  );

  if (
    !pathnameHasLocale &&
    !pathname.startsWith("/api/") &&
    !pathname.startsWith("/auth/")
  ) {
    const acceptLanguage = request.headers.get("accept-language");
    const preferredLocale = getPreferredLocale(acceptLanguage);
    const redirectUrl = new URL(
      `/${preferredLocale}${pathname === "/" ? "" : pathname}`,
      request.url,
    );
    redirectUrl.search = request.nextUrl.search;
    return NextResponse.redirect(redirectUrl);
  }

  // 🔥 API rate limiting
  if (pathname.startsWith("/api/")) {
    const isKVEnabled =
      process.env.KV_REST_API_URL && process.env.KV_REST_API_TOKEN;

    if (isKVEnabled) {
      try {
        const forwarded = request.headers.get("x-forwarded-for");
        const ip = forwarded
          ? forwarded.split(",")[0]
          : request.headers.get("x-real-ip") || "127.0.0.1";
        const ratelimitKey = `ratelimit:${ip}`;
        const limit = 60;
        const window = 60;

        const currentCount = await kv.incr(ratelimitKey);
        if (currentCount === 1) await kv.expire(ratelimitKey, window);

        if (currentCount > limit) {
          return new NextResponse("Too Many Requests", {
            status: 429,
            headers: {
              "Retry-After": window.toString(),
              "X-RateLimit-Limit": limit.toString(),
              "X-RateLimit-Remaining": "0",
            },
          });
        }
      } catch (error) {
        console.error("[RateLimit] KV Error:", error);
      }
    }

    return NextResponse.next();
  }

  // 🚀 Catch orphaned OAuth codes
  const code = request.nextUrl.searchParams.get("code");
  const error = request.nextUrl.searchParams.get("error");
  const isAuthCallback = pathname.includes("/auth/callback");

  if ((code || error) && !isAuthCallback) {
    const parts = pathname.split("/");
    const localePart = parts[1];
    const locale = SUPPORTED_LOCALES.includes(localePart) ? localePart : "no";

    const callbackUrl = new URL(`/${locale}/auth/callback`, request.url);
    if (code) callbackUrl.searchParams.set("code", code);
    if (error) callbackUrl.searchParams.set("error", error);

    const next =
      request.nextUrl.searchParams.get("next") ||
      request.nextUrl.searchParams.get("redirectTo");
    if (next) callbackUrl.searchParams.set("next", next);

    return NextResponse.redirect(callbackUrl);
  }

  if (isAuthCallback) {
    return NextResponse.next();
  }

  const response = NextResponse.next();

  // Get the domain for cookies (handle www vs non-www)
  const host = request.headers.get("host") || "";
  const isWWW = host.startsWith("www.");
  const rootDomain = isWWW ? host.replace("www.", "") : host;
  const cookieDomain = rootDomain.includes(":") ? undefined : `.${rootDomain}`;

  // Create supabase client
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            // Apply to the response that will be returned
            // Set domain to allow cookies to work on both www and non-www
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

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const locale = pathname.split("/")[1] || "no";
  const pathWithoutLocale = pathname.replace(`/${locale}`, "") || "/";

  // Check path types
  const isProtectedPath = PROTECTED_PATHS.some(
    (p) => pathWithoutLocale === p || pathWithoutLocale.startsWith(`${p}/`),
  );
  // Also protect /onboarding
  const isProtected =
    isProtectedPath || pathWithoutLocale.startsWith("/onboarding");

  const isAuthPage = PUBLIC_PATHS.some(
    (p) => pathWithoutLocale === p || pathWithoutLocale.startsWith(`${p}/`),
  );

  // Helper to create a redirect response that preserves cookies set by Supabase
  const redirectWithCookies = (url: URL) => {
    const redirectResponse = NextResponse.redirect(url);
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
  };

  // 1. Unauthenticated users trying to access protected paths
  if (isProtected && !user) {
    const loginUrl = new URL(`/${locale}/innlogging`, request.url);
    loginUrl.searchParams.set("next", pathname);
    return redirectWithCookies(loginUrl);
  }

  // 2. Authenticated users trying to access auth pages (login/signup)
  if (isAuthPage && user) {
    return redirectWithCookies(new URL(`/${locale}/dashboard`, request.url));
  }

  // 3. Onboarding flow for authenticated users
  if (user) {
    // EMERGENCY BYPASS: Skip onboarding checks entirely for now
    // TODO: Re-enable after fixing cookie/session issues
    const isOnboardingPage = pathWithoutLocale.startsWith("/onboarding");
    
    // Always allow access to all pages for authenticated users
    // The onboarding wizard can still be accessed manually if needed
    return response;
    
    /* DISABLED - Causing redirect loops
    // Only check onboarding if they are navigating to a protected path (or root dashboard)
    if (isProtected) {
      let onboardingCompleted =
        request.cookies.get("kp_onboarding_status")?.value === "completed";

      // If cookie doesn't say completed, check DB
      if (!onboardingCompleted) {
        try {
          const { data: profile } = await supabase
            .from("user_profiles")
            .select("onboarding_completed, setup_completed_at")
            .eq("id", user.id)
            .single();

          if (
            profile &&
            (profile.onboarding_completed === true ||
              profile.setup_completed_at !== null)
          ) {
            onboardingCompleted = true;
          } else {
            // Fallback to older profiles table just in case
            const { data: fallbackProfile } = await supabase
              .from("profiles")
              .select("onboarding_completed, setup_completed_at")
              .eq("id", user.id)
              .maybeSingle();

            if (
              fallbackProfile &&
              (fallbackProfile.onboarding_completed === true ||
                fallbackProfile.setup_completed_at !== null)
            ) {
              onboardingCompleted = true;
            }
          }

          if (onboardingCompleted) {
            response.cookies.set("kp_onboarding_status", "completed", {
              path: "/",
              maxAge: 3600 * 24 * 30,
              sameSite: "lax",
              secure: true,
              domain: cookieDomain,
            });
          }
        } catch (err) {
          console.error("Error checking onboarding status:", err);
        }
      }

      // Redirect to onboarding if not completed and not already there
      if (!onboardingCompleted && !isOnboardingPage) {
        return redirectWithCookies(
          new URL(`/${locale}/onboarding`, request.url),
        );
      }

      // If onboarding IS completed, prevent them from going back to onboarding wizard
      if (onboardingCompleted && isOnboardingPage) {
        return redirectWithCookies(
          new URL(`/${locale}/dashboard`, request.url),
        );
      }
    }
    */
  }

  return response;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$|api/|_vercel).*)",
  ],
};
