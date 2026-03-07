import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

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
    return NextResponse.next();
  }

  // Auto-detect browser language
  const acceptLanguage = request.headers.get("accept-language");
  const preferredLocale = getPreferredLocale(acceptLanguage);

  // Debug: Add header to see what locale was detected
  if (preferredLocale !== DEFAULT_LOCALE) {
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
