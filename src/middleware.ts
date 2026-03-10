import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

// Inline i18n config to avoid import issues
const SUPPORTED_LOCALES = ["no", "en", "th", "zh"] as const;
const DEFAULT_LOCALE = "no" as const;

// ==========================================
// AUTH PATH WHITELIST (P0 CRITICAL)
// ==========================================
// Auth paths should NEVER be auto-redirected based on Accept-Language.
// These are canonical URLs where the path itself is the source of truth.
// Norwegian users get /innlogging, English users who want English use /en/innlogging
const AUTH_PATHS = [
  "/innlogging",
  "/glemt-passord",
  "/signup",
  "/registrer",
  "/reset-password",
  "/verify",
  "/auth/",
] as const;

type SupportedLocale = (typeof SUPPORTED_LOCALES)[number];

function isSupportedLocale(locale: string): locale is SupportedLocale {
  return SUPPORTED_LOCALES.includes(locale as SupportedLocale);
}

/**
 * Check if pathname is an auth route that should NOT be auto-redirected
 * based on Accept-Language. Auth routes respect explicit locale or default to Norwegian.
 * 
 * Handles locale-prefixed paths: /en/innlogging, /th/innlogging, /no/innlogging, etc.
 * 
 * @param pathname - The request pathname
 * @returns true if this is a protected auth path
 */
function isAuthPath(pathname: string): boolean {
  // Strip locale prefix if present (e.g., /en/innlogging -> /innlogging)
  // Also handle /no/ prefix (legacy default locale)
  const pathWithoutLocale = pathname.replace(/^\/(en|th|zh|no)(?=\/|$)/, "");
  const normalizedPath = pathWithoutLocale || pathname; // Fallback if no match
  
  return AUTH_PATHS.some(path => 
    normalizedPath === path || normalizedPath.startsWith(`${path}/`)
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

  // ==========================================
  // SESSION EXPIRED HANDLING
  // ==========================================
  // Detect session=expired query param and set cookie for client-side toast
  if (request.nextUrl.searchParams.has('session', 'expired')) {
    const response = NextResponse.redirect(
      new URL(request.nextUrl.pathname, request.url)
    );
    response.cookies.set('session_expired', 'true', {
      maxAge: 60, // 1 minute
      path: '/',
    });
    return response;
  }

  // ==========================================
  // 1. LEGACY /no/* CLEANUP (301 permanent)
  // ==========================================
  if (pathname.startsWith("/no/")) {
    const newPath = pathname.slice(3) || "/";
    const redirectUrl = new URL(newPath, request.url);
    redirectUrl.search = request.nextUrl.search;
    return NextResponse.redirect(redirectUrl, { status: 301 });
  }

  if (pathname === "/no") {
    const redirectUrl = new URL("/", request.url);
    redirectUrl.search = request.nextUrl.search;
    return NextResponse.redirect(redirectUrl, { status: 301 });
  }

  // Handle /leksjon/* routes - redirect to /kurs/leksjon/*
  if (pathname.startsWith("/leksjon/")) {
    const lessonId = pathname.replace("/leksjon/", "");
    const redirectUrl = new URL(`/kurs/leksjon/${lessonId}`, request.url);
    redirectUrl.search = request.nextUrl.search;
    return NextResponse.redirect(redirectUrl, { status: 307 });
  }

  // ==========================================
  // 1b. UNKNOWN PATH / INVALID LOCALE CHECK
  // ==========================================
  // Detect paths that would match /[locale] but aren't valid
  // This prevents /denne-siden-finnes-ikke from rendering the homepage
  const pathSegments = pathname.split('/').filter(Boolean);
  const firstSegment = pathSegments[0];
  
  // If first segment is not a supported locale and not a known special path,
  // it should 404. Known special paths: auth paths, api, _next, static files
  if (firstSegment && 
      !SUPPORTED_LOCALES.includes(firstSegment as SupportedLocale) &&
      !isAuthPath(pathname) &&
      !pathname.startsWith('/api/') &&
      !pathname.startsWith('/_next/') &&
      !pathname.startsWith('/leksjon/') &&
      !pathname.startsWith('/sitemap') &&
      !pathname.startsWith('/robots') &&
      !pathname.startsWith('/manifest') &&
      !pathname.match(/\.(?:svg|png|jpg|jpeg|gif|webp|ico|css|js|json|txt|xml)$/) &&
      pathname !== '/') {
    
    // Check if this is a known valid path
    // These are all the valid routes in src/app/[locale]/
    const validRoutes = [
      '(auth)', 'admin', 'admin-dashboard', 'akademi', 'auth', 'auto-trading', 
      'auto-trading-ai', 'beta', 'beta-testing', 'binance-guide', 'checkout', 
      'copy-trading', 'dashboard', 'feil', 'handelshistorikk', 'hjelp', 
      'innstillinger', 'interessetest', 'kalkulator', 'kontakt', 'konto', 
      'kurs', 'leaderboard', 'leaderboard-preview', 'leagues', 'live-trading', 
      'login', 'marketplace', 'om-oss', 'onboarding', 'paper-trading', 
      'personvern', 'priser', 'profile', 'quiz', 'registrer', 'reset-password', 
      'settings', 'signals', 'simulator', 'super-admin', 'varsler', 
      'velg-strategi', 'velkommen', 'verify', 'vilkar',
      // Auth paths (also in root)
      'innlogging', 'glemt-passord', 'signup', 'verify', 'reset-password'
    ];
    
    const isValidRoute = validRoutes.some(route => firstSegment === route || pathname.startsWith(`/${route}/`));
    
    // If it's not a valid route and looks like a locale code, return 404
    if (!isValidRoute) {
      const looksLikeLocale = firstSegment.length >= 2 && firstSegment.length <= 4 && /^[a-z]{2,4}$/i.test(firstSegment);
      
      // Either it's an invalid locale code, or it's an unknown long path
      // Both should 404
      const response = NextResponse.rewrite(new URL('/_not-found', request.url));
      response.headers.set("x-not-found", "true");
      if (looksLikeLocale) {
        response.headers.set("x-invalid-locale", firstSegment);
      }
      return response;
    }
    // If it's a valid route, continue to normal processing
  }

  // ==========================================
  // 2. EXPLICIT LOCALE CHECK (non-default)
  // ==========================================
  // If user is already on /en/, /th/, /zh/ path, respect it
  const hasNonDefaultLocale = SUPPORTED_LOCALES.some(
    (locale) => locale !== DEFAULT_LOCALE && (pathname.startsWith(`/${locale}/`) || pathname === `/${locale}`)
  );

  if (hasNonDefaultLocale) {
    const response = NextResponse.next();
    response.headers.set("x-locale-explicit", "true");
    return response;
  }

  // ==========================================
  // 3. AUTH PATH PROTECTION (P0 CRITICAL)
  // ==========================================
  // CRITICAL: Auth paths must NEVER auto-redirect based on browser language.
  // URL is the source of truth for auth flows.
  //
  // For paths without locale prefix (e.g., /innlogging), we REWRITE to include
  // the default locale (/no/innlogging) so Next.js can route to the page at
  // /[locale]/(auth)/innlogging/page.tsx. The URL shown to user stays unchanged.
  //
  // Examples:
  //   /innlogging -> REWRITE to /no/innlogging (canonical Norwegian)
  //   /en/innlogging -> pass through (explicit English)
  //   /glemt-passord -> REWRITE to /no/glemt-passord (canonical Norwegian)
  if (isAuthPath(pathname)) {
    // Check if pathname already has a locale prefix
    const hasLocalePrefix = SUPPORTED_LOCALES.some(
      (locale) => pathname.startsWith(`/${locale}/`) || pathname === `/${locale}`
    );

    if (!hasLocalePrefix) {
      // Rewrite to include default locale (internal routing only, URL stays same)
      const rewriteUrl = new URL(`/${DEFAULT_LOCALE}${pathname}`, request.url);
      rewriteUrl.search = request.nextUrl.search;
      const response = NextResponse.rewrite(rewriteUrl);
      response.headers.set("x-auth-path", "true");
      response.headers.set("x-locale-rewrite", DEFAULT_LOCALE);
      return response;
    }

    // Already has locale prefix, pass through
    const response = NextResponse.next();
    response.headers.set("x-auth-path", "true");
    response.headers.set("x-locale-explicit", "true");
    return response;
  }

  // ==========================================
  // 4. ACCEPT-LANGUAGE REDIRECT (non-auth only)
  // ==========================================
  // Only for non-auth pages: landing, om-oss, priser, etc.
  // Auth paths never reach this point.
  
  const acceptLanguage = request.headers.get("accept-language");
  const preferredLocale = getPreferredLocale(acceptLanguage);
  const savedLocale = request.cookies.get("NEXT_LOCALE")?.value;

  // Only redirect if:
  // 1. Not on root URL (/), AND
  // 2. Preferred locale is NOT Norwegian
  if (pathname !== "/" && preferredLocale !== DEFAULT_LOCALE) {
    // If saved locale exists and is different from detected, respect saved
    if (savedLocale && savedLocale !== preferredLocale) {
      const response = NextResponse.next();
      response.headers.set("x-locale-detected", preferredLocale);
      response.headers.set("x-locale-saved", savedLocale);
      response.headers.set("x-locale-skipped", "saved-preference");
      return response;
    }

    // Map unsupported locales to English (th/zh have limited translations)
    const targetLocale = ["th", "zh"].includes(preferredLocale) ? "en" : preferredLocale;

    const redirectUrl = new URL(`/${targetLocale}${pathname}`, request.url);
    redirectUrl.search = request.nextUrl.search;

    const response = NextResponse.redirect(redirectUrl, { status: 302 });
    response.headers.set("x-locale-detected", preferredLocale);
    response.headers.set("x-locale-redirect", "accept-language");
    return response;
  }

  // Norwegian users (or unknown locale) -> rewrite to include locale for routing
  // URL shown to user stays unchanged (no prefix), but internally routes to /no/*
  if (pathname !== "/" && pathname !== "") {
    const rewriteUrl = new URL(`/${DEFAULT_LOCALE}${pathname}`, request.url);
    rewriteUrl.search = request.nextUrl.search;
    const response = NextResponse.rewrite(rewriteUrl);
    response.headers.set("x-locale-detected", preferredLocale);
    response.headers.set("x-locale-rewrite", DEFAULT_LOCALE);
    return response;
  }

  // Root path (/) - pass through to Next.js (it handles /[locale] → / mapping)
  const response = NextResponse.next();
  response.headers.set("x-locale-detected", preferredLocale);
  response.headers.set("x-locale-redirect", "none");
  return response;
}

// Match all paths
export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"],
};
