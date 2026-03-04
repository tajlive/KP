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
  "/onboarding",
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

const SKIP_ONBOARDING_PATHS = [
  "/api/",
  "/auth/",
  "/onboarding",
  "/innlogging",
  "/registrer",
  "/login",
  "/signup",
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

  // 🚨 Unblock auth pages always to stop redirect loops
  const isDefinitelyAuthPath =
    pathname.includes("/auth/callback") ||
    pathname.includes("/innlogging") ||
    pathname.includes("/registrer") ||
    pathname.includes("/signup") ||
    pathname.includes("/login");

  if (isDefinitelyAuthPath) {
    return NextResponse.next();
  }

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
            response.cookies.set(name, value, {
              ...options,
              sameSite: "none" as const,
              secure: true,
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
  const isProtected = PROTECTED_PATHS.some(
    (p) => pathWithoutLocale === p || pathWithoutLocale.startsWith(`${p}/`),
  );
  const isAuthPage = PUBLIC_PATHS.some(
    (p) => pathWithoutLocale === p || pathWithoutLocale.startsWith(`${p}/`),
  );

  if (isProtected && !user) {
    const loginUrl = new URL(`/${locale}/innlogging`, request.url);
    loginUrl.searchParams.set("next", pathname);
    return NextResponse.redirect(loginUrl);
  }

  if (isAuthPage && user) {
    return NextResponse.redirect(new URL(`/${locale}/dashboard`, request.url));
  }

  // Onboarding guard
  const shouldSkipOnboardingCheck = SKIP_ONBOARDING_PATHS.some(
    (p) => pathname.startsWith(p) || pathWithoutLocale.startsWith(p),
  );

  if (user && isProtected && !shouldSkipOnboardingCheck) {
    const onboardingCookie = request.cookies.get("kp_onboarding_status")?.value;
    let onboardingCompleted = onboardingCookie === "completed";

    if (!onboardingCompleted) {
      try {
        const { data: profile } = await supabase
          .from("user_profiles")
          .select("onboarding_completed, setup_completed_at")
          .eq("id", user.id)
          .single();

        if (profile) {
          onboardingCompleted =
            profile.onboarding_completed === true ||
            profile.setup_completed_at !== null;
        } else {
          const { data: fallbackProfile } = await supabase
            .from("profiles")
            .select("onboarding_completed, setup_completed_at")
            .eq("id", user.id)
            .single();

          if (fallbackProfile) {
            onboardingCompleted =
              fallbackProfile.onboarding_completed === true ||
              fallbackProfile.setup_completed_at !== null;
          }
        }

        if (onboardingCompleted) {
          response.cookies.set("kp_onboarding_status", "completed", {
            path: "/",
            maxAge: 3600 * 2,
            sameSite: "lax",
          });
        }
      } catch (err) {
        console.error("Error checking onboarding status:", err);
      }
    }

    if (!onboardingCompleted) {
      const onboardingUrl = new URL(`/${locale}/onboarding`, request.url);
      return NextResponse.redirect(onboardingUrl);
    }
  }

  return response;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$|api/|_vercel).*)",
  ],
};
