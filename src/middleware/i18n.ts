import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

export const SUPPORTED_LOCALES = ["no", "en", "th", "zh"] as const;
export const DEFAULT_LOCALE = "no" as const;
export const VISIBLE_LOCALES = ["no", "en"] as const;

export type SupportedLocale = (typeof SUPPORTED_LOCALES)[number];

export function isSupportedLocale(locale: string): locale is SupportedLocale {
  return SUPPORTED_LOCALES.includes(locale as SupportedLocale);
}

export function getPreferredLocale(acceptLanguage: string | null): string {
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

/**
 * Check if pathname has a locale prefix
 * Handles both prefixed (/en/) and root (/) for default locale
 */
export function getLocaleFromPathname(pathname: string): {
  locale: SupportedLocale;
  withoutLocale: string;
} | null {
  // Check for explicit locale prefix (/en/, /th/, /zh/)
  for (const locale of SUPPORTED_LOCALES) {
    if (locale === DEFAULT_LOCALE) continue; // Skip default locale - no prefix
    if (pathname.startsWith(`/${locale}/`) || pathname === `/${locale}`) {
      return {
        locale,
        withoutLocale: pathname === `/${locale}` 
          ? "/" 
          : pathname.slice(`/${locale}`.length),
      };
    }
  }
  
  // Default locale (no prefix)
  if (!SUPPORTED_LOCALES.some(l => l !== DEFAULT_LOCALE && pathname.startsWith(`/${l}/`))) {
    return { locale: DEFAULT_LOCALE, withoutLocale: pathname };
  }
  
  return null;
}

export function handleI18nRedirect(request: NextRequest): NextResponse | null {
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
    return null;
  }

  // Debug logging for production troubleshooting
  const acceptLanguage = request.headers.get("accept-language");
  const preferredLocale = getPreferredLocale(acceptLanguage);
  console.log(`[i18n middleware] path: ${pathname}, accept-lang: ${acceptLanguage}, preferred: ${preferredLocale}`);

  // Check if user is accessing old /no/* URLs -> redirect to /*
  if (pathname.startsWith("/no/")) {
    const newPath = pathname.slice(3); // Remove '/no'
    const redirectUrl = new URL(newPath || "/", request.url);
    redirectUrl.search = request.nextUrl.search;
    return NextResponse.redirect(redirectUrl, { status: 301 });
  }
  
  // Handle /no (root) -> redirect to /
  if (pathname === "/no") {
    const redirectUrl = new URL("/", request.url);
    redirectUrl.search = request.nextUrl.search;
    return NextResponse.redirect(redirectUrl, { status: 301 });
  }

  // Check for explicit non-default locale prefix (/en/, /th/, /zh/)
  const hasNonDefaultLocale = SUPPORTED_LOCALES.some(
    (locale) => locale !== DEFAULT_LOCALE && (pathname.startsWith(`/${locale}/`) || pathname === `/${locale}`)
  );

  // If has non-default locale prefix, let it through
  if (hasNonDefaultLocale) {
    return null;
  }

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
  return null;
}

/**
 * Get the correct href for a locale switch
 * - Norwegian (default): /path (no prefix)
 * - English: /en/path (with prefix)
 */
export function getLocaleHref(currentPath: string, targetLocale: SupportedLocale): string {
  const currentLocaleInfo = getLocaleFromPathname(currentPath);
  const currentPathWithoutLocale = currentLocaleInfo?.withoutLocale || currentPath;
  
  if (targetLocale === DEFAULT_LOCALE) {
    return currentPathWithoutLocale || "/";
  }
  
  const path = currentPathWithoutLocale === "/" ? "" : currentPathWithoutLocale;
  return `/${targetLocale}${path}`;
}
