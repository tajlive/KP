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

  // If preferred locale is NOT Norwegian, redirect to appropriate locale path
  if (preferredLocale !== DEFAULT_LOCALE) {
    // Map unsupported locales to English (th/zh have limited translations)
    const targetLocale = ["th", "zh"].includes(preferredLocale) ? "en" : preferredLocale;

    const redirectUrl = new URL(`/${targetLocale}${pathname}`, request.url);
    redirectUrl.search = request.nextUrl.search;

    // Use 302 (temporary) to allow future locale preference override
    return NextResponse.redirect(redirectUrl, { status: 302 });
  }

  // Norwegian users (or unknown locale) -> stay on root path (no prefix)
  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!api/|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"],
};
