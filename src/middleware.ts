import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { handleRateLimit } from "./middleware/rate-limit";
import { handleOAuthRedirect } from "./middleware/oauth";
import { handleAuthGuard } from "./middleware/auth-guard";
import { handleOnboarding } from "./middleware/onboarding";

// Inline i18n config to avoid import issues
const SUPPORTED_LOCALES = ["no", "en", "th", "zh"] as const;
const DEFAULT_LOCALE = "no" as const;

type SupportedLocale = (typeof SUPPORTED_LOCALES)[number];

function isSupportedLocale(locale: string): locale is SupportedLocale {
  return SUPPORTED_LOCALES.includes(locale as SupportedLocale);
}

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
    if (isSupportedLocale(code)) return code;
    const baseCode = code.split("-")[0];
    if (isSupportedLocale(baseCode)) return baseCode;
    if (baseCode === "nb") return "no";
  }

  return DEFAULT_LOCALE;
}

function handleI18nRedirect(request: NextRequest): NextResponse | null {
  const { pathname } = request.nextUrl;
  
  // Debug: Always log for troubleshooting
  const acceptLang = request.headers.get("accept-language");
  console.log(`[middleware] pathname: ${pathname}, accept-lang: ${acceptLang}`);

  // Skip API routes, auth callbacks, and static files
  if (
    pathname.startsWith("/api/") ||
    pathname.startsWith("/auth/") ||
    pathname.startsWith("/_next/") ||
    pathname.startsWith("/favicon") ||
    pathname.startsWith("/images/") ||
    pathname.startsWith("/static/") ||
    pathname.match(/\.(?:svg|png|jpg|jpeg|gif|webp|ico|css|js|json)$/)
  ) {
    return null;
  }

  // Check if user is accessing old /no/* URLs -> redirect to /*
  if (pathname.startsWith("/no/")) {
    const newPath = pathname.slice(3);
    const redirectUrl = new URL(newPath || "/", request.url);
    redirectUrl.search = request.nextUrl.search;
    return NextResponse.redirect(redirectUrl, { status: 301 });
  }

  if (pathname === "/no") {
    const redirectUrl = new URL("/", request.url);
    redirectUrl.search = request.nextUrl.search;
    return NextResponse.redirect(redirectUrl, { status: 301 });
  }

  // Check for explicit non-default locale prefix (/en/, /th/, /zh/)
  const hasNonDefaultLocale = SUPPORTED_LOCALES.some(
    (locale) => locale !== DEFAULT_LOCALE && (pathname.startsWith(`/${locale}/`) || pathname === `/${locale}`)
  );

  if (hasNonDefaultLocale) {
    return null;
  }

  // Auto-detect browser language
  const acceptLanguage = request.headers.get("accept-language");
  const preferredLocale = getPreferredLocale(acceptLanguage);

  // Debug header
  console.log(`[middleware] preferred: ${preferredLocale}, default: ${DEFAULT_LOCALE}`);

  // If preferred locale is NOT Norwegian, redirect to appropriate locale path
  if (preferredLocale !== DEFAULT_LOCALE) {
    // Map unsupported locales to English (th/zh have limited translations)
    const targetLocale = ["th", "zh"].includes(preferredLocale) ? "en" : preferredLocale;

    const redirectUrl = new URL(`/${targetLocale}${pathname}`, request.url);
    redirectUrl.search = request.nextUrl.search;

    console.log(`[middleware] redirecting to: ${redirectUrl.toString()}`);
    
    // Use 302 (temporary) to allow future locale preference override
    const response = NextResponse.redirect(redirectUrl, { status: 302 });
    response.headers.set("x-i18n-redirect", "true");
    response.headers.set("x-preferred-locale", preferredLocale);
    return response;
  }

  // Norwegian users (or unknown locale) -> stay on root path (no prefix)
  console.log(`[middleware] no redirect, staying on /`);
  return null;
}

export async function middleware(request: NextRequest) {
  // 1. 🌍 i18n redirect (auto-detect browser language)
  const i18nResponse = handleI18nRedirect(request);
  if (i18nResponse) {
    console.log(`[middleware] returning redirect response`);
    return i18nResponse;
  }
  console.log(`[middleware] no i18n redirect, continuing...`);

  // 2. 🔥 API rate limiting
  const rateLimitResponse = await handleRateLimit(request);
  if (rateLimitResponse) return rateLimitResponse;

  // 3. 🚀 Catch orphaned OAuth codes
  const oauthResponse = handleOAuthRedirect(request);
  if (oauthResponse) return oauthResponse;

  // 4. 🔒 Auth guard (protected paths)
  const authResponse = await handleAuthGuard(request);
  if (authResponse && authResponse.status !== 200) {
    return authResponse;
  }

  // 5. 📚 Onboarding flow
  const onboardingResponse = await handleOnboarding(request);
  if (onboardingResponse && onboardingResponse.status !== 200) {
    return onboardingResponse;
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/"],
};
