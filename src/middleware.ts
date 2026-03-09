import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

// Inline i18n config to avoid import issues
const SUPPORTED_LOCALES = ["no", "en", "th", "zh"] as const;
const DEFAULT_LOCALE = "no" as const;

// Paths that should NOT be auto-redirected based on Accept-Language
// Auth flows and explicit paths where URL = source of truth
const AUTH_PATHS = [
  "/innlogging",
  "/glemt-passord", 
  "/signup",
  "/registrer",
  "/reset-password",
  "/verify",
  "/auth/",
];

type SupportedLocale = (typeof SUPPORTED_LOCALES)[number];

function isSupportedLocale(locale: string): locale is SupportedLocale {
  return SUPPORTED_LOCALES.includes(locale as SupportedLocale);
}

function isAuthPath(pathname: string): boolean {
  return AUTH_PATHS.some(path => 
    pathname === path || pathname.startsWith(path)
  );
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

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

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
    return NextResponse.next();
  }

  // Handle /leksjon/* routes - redirect to /kurs/leksjon/*
  if (pathname.startsWith("/leksjon/")) {
    const lessonId = pathname.replace("/leksjon/", "");
    const redirectUrl = new URL(`/kurs/leksjon/${lessonId}`, request.url);
    redirectUrl.search = request.nextUrl.search;
    return NextResponse.redirect(redirectUrl, { status: 307 });
  }

  // Check if user is accessing old /no/* URLs -> redirect to /*
  // CRITICAL: Set a header to prevent Accept-Language redirect chain
  // When /no/path redirects to /path, we don't want /path to then redirect to /en/path
  if (pathname.startsWith("/no/")) {
    const newPath = pathname.slice(3);
    const redirectUrl = new URL(newPath || "/", request.url);
    redirectUrl.search = request.nextUrl.search;
    const response = NextResponse.redirect(redirectUrl, { status: 301 });
    // Set header to indicate this redirect came from /no/ legacy URL
    // This will be used to skip Accept-Language redirect on the target
    response.headers.set("x-legacy-no-redirect", "true");
    return response;
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
    return NextResponse.next();
  }

  // CRITICAL: Never auto-redirect auth paths based on browser language
  // URL is the source of truth for auth flows to prevent redirect chains
  if (isAuthPath(pathname)) {
    const response = NextResponse.next();
    response.headers.set("x-auth-path", "true");
    return response;
  }

  // Auto-detect browser language for non-auth paths
  // CRITICAL FIX: Only redirect based on Accept-Language if user is NOT on root URL
  // Root URL (/) should always show Norwegian default without redirect
  const acceptLanguage = request.headers.get("accept-language");
  const preferredLocale = getPreferredLocale(acceptLanguage);

  // Check for saved locale preference (from cookie)
  const savedLocale = request.cookies.get("NEXT_LOCALE")?.value;

  // CRITICAL FIX: Check if user came from /no/ legacy redirect
  // When /no/path redirects to /path, we should NOT then redirect to /en/path
  // This prevents the redirect chain: /no/innlogging -> /innlogging -> /en/innlogging
  const referer = request.headers.get("referer") || "";
  const isFromLegacyNoRedirect = referer.includes("/no/") || referer.endsWith("/no");

  // Only redirect if:
  // 1. Not on root URL (/), AND
  // 2. Preferred locale is NOT Norwegian, AND
  // 3. No explicit saved locale preference (or it differs from detected), AND
  // 4. NOT coming from /no/ legacy redirect (prevent redirect chain)
  if (pathname !== "/" && preferredLocale !== DEFAULT_LOCALE && !isFromLegacyNoRedirect) {
    // If saved locale exists and is different from detected, respect saved
    if (savedLocale && savedLocale !== preferredLocale) {
      // User has explicit preference, don't redirect
      const response = NextResponse.next();
      response.headers.set("x-locale-detected", preferredLocale);
      response.headers.set("x-locale-saved", savedLocale);
      response.headers.set("x-locale-skipped", "saved-preference");
      return response;
    }

    // If preferred locale is NOT Norwegian, redirect to appropriate locale path
    // Map unsupported locales to English (th/zh have limited translations)
    const targetLocale = ["th", "zh"].includes(preferredLocale) ? "en" : preferredLocale;

    const redirectUrl = new URL(`/${targetLocale}${pathname}`, request.url);
    redirectUrl.search = request.nextUrl.search;

    // Use 302 (temporary) to allow future locale preference override
    const response = NextResponse.redirect(redirectUrl, { status: 302 });
    response.headers.set("x-locale-detected", preferredLocale);
    response.headers.set("x-accept-lang-header", acceptLanguage || "none");
    return response;
  }

  // Norwegian users (or unknown locale) -> stay on root path (no prefix)
  const response = NextResponse.next();
  response.headers.set("x-locale-detected", preferredLocale);
  response.headers.set("x-accept-lang-header", acceptLanguage || "none");
  return response;
}

// Match all paths
export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"],
};
