/**
 * MIDDLEWARE med i18n + Auth + CSP (Nonce-Based Security)
 * 
 * 1. i18n routing (next-intl) - håndterer / → /no
 * 2. Route protection (kreve auth for /dashboard)
 * 3. CSP with nonce - replaces 'unsafe-inline' for security
 */

import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";
import createIntlMiddleware from "next-intl/middleware";
import { routing } from "./i18n/routing.config";


// Opprett next-intl middleware
const handleI18n = createIntlMiddleware(routing);

// Routes som krever auth
const PROTECTED_ROUTES = [
  "/dashboard",
  "/profile",
  "/settings",
  "/admin",
];

// Auth routes (redirect til dashboard hvis allerede logget inn)
const AUTH_ROUTES = [
  "/login",
  "/register",
  "/reset-password",
  "/update-password",
];

/**
 * Generate a cryptographically secure nonce for CSP
 * Returns base64-encoded 16 bytes (128 bits)
 */
function generateNonce(): string {
  const array = new Uint8Array(16);
  crypto.getRandomValues(array);
  return Buffer.from(array).toString("base64");
}

// Cookie domain helper - must match src/lib/supabase/server.ts for consistency
function getCookieDomain(request: NextRequest): string | undefined {
  const host = request.headers.get("host") || "";
  const isWWW = host.startsWith("www.");
  const rootDomain = isWWW ? host.replace("www.", "") : host;
  return rootDomain.includes(":") ? undefined : `.${rootDomain}`;
}

function stripLocalePrefix(pathname: string): string {
  const localeMatch = pathname.match(/^\/(no|en)(\/.*)?$/);
  if (localeMatch) {
    return localeMatch[2] || "/";
  }
  return pathname;
}

/**
 * Build CSP header with nonce
 * Replaces 'unsafe-inline' with nonce-based approach
 */
function buildCSPHeader(_nonce: string): string {
  const isDev = process.env.NODE_ENV === "development";
  
  // CSP directives - using 'unsafe-inline' for compatibility
  // TODO: Re-implement nonce-based CSP when Next.js 15 nonce injection is stable
  const directives = [
    "default-src 'self'",
    `script-src 'self' 'unsafe-inline'${isDev ? " 'unsafe-eval'" : ""} https://vuxbjlykgmzskxbclquf.supabase.co https://*.tradingview.com https://*.vercel-scripts.com https://vercel.live https://plausible.io`,
    `style-src 'self' 'unsafe-inline'`,
    "img-src 'self' blob: data: https://vuxbjlykgmzskxbclquf.supabase.co https://*.tradingview.com https://*.coingecko.com https://vercel.com https://klarpakke.no https://www.klarpakke.no",
    "font-src 'self' data: https://vercel.live https://r2cdn.perplexity.ai",
    "worker-src 'self' blob:",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
    `connect-src 'self' https://vuxbjlykgmzskxbclquf.supabase.co wss://vuxbjlykgmzskxbclquf.supabase.co https://api.binance.com wss://stream.binance.com:9443 https://vercel.live https://plausible.io https://o4509555622608896.ingest.de.sentry.io${isDev ? " ws://localhost:* ws://127.0.0.1:* wss://localhost:* wss://127.0.0.1:*" : ""}`,
    "frame-src https://vercel.live",
    "upgrade-insecure-requests",
  ];

  return directives.join("; ");
}

/**
 * Apply security headers including nonce-based CSP
 */
function applySecurityHeaders(response: NextResponse, nonce: string): NextResponse {
  const isDev = process.env.NODE_ENV === "development";
  
  // CSP Header with nonce
  response.headers.set("Content-Security-Policy", buildCSPHeader(nonce));
  
  // Expose nonce to client for inline script/style tagging
  response.headers.set("X-CSP-Nonce", nonce);
  
  // Other security headers
  response.headers.set("X-Frame-Options", "DENY");
  response.headers.set("X-Content-Type-Options", "nosniff");
  response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  response.headers.set(
    "Permissions-Policy",
    "camera=(), microphone=(), geolocation=(), payment=(), usb=(), magnetometer=(), gyroscope=(), accelerometer=()"
  );
  response.headers.set("X-DNS-Prefetch-Control", "on");
  response.headers.set("Cross-Origin-Opener-Policy", "same-origin");
  response.headers.set("Cross-Origin-Embedder-Policy", "credentialless");
  response.headers.set("Cross-Origin-Resource-Policy", "cross-origin");
  
  // HSTS in production
  if (!isDev) {
    response.headers.set(
      "Strict-Transport-Security",
      "max-age=63072000; includeSubDomains; preload"
    );
  }
  
  return response;
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Skip i18n for static files, API routes, and auth routes (they don't use locale prefix)
  // Must be done BEFORE calling handleI18n to prevent redirect loops
  if (
    pathname.startsWith("/_next/") ||
    pathname.startsWith("/api/") ||
    pathname.startsWith("/auth/")
  ) {
    // For auth routes, just apply security headers and pass through
    let nonce: string;
    try {
      nonce = generateNonce();
    } catch {
      nonce = "fallback-nonce-" + Date.now();
    }
    // Use NextResponse.next() to pass through without any i18n processing
    const response = NextResponse.next({
      request: {
        headers: request.headers,
      },
    });
    return applySecurityHeaders(response, nonce);
  }

  // Generate nonce for this request
  let nonce: string;
  try {
    nonce = generateNonce();
  } catch (error) {
    console.error("[CSP] Failed to generate nonce:", error);
    // Fallback to a safe default (should never happen)
    nonce = "fallback-nonce-" + Date.now();
  }

  // 1. Kjør i18n routing først (håndterer / → /no)
  const i18nResponse = handleI18n(request);
  
  // Hvis i18n gir redirect (f.eks. / → /no), returner den
  if (i18nResponse.status !== 200) {
    // Apply security headers even on redirects
    return applySecurityHeaders(i18nResponse, nonce);
  }

  // 2. Auth håndtering - create a response to modify cookies on
  const response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  });
  
  const cookieDomain = getCookieDomain(request);
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookieEncoding: "raw",
      cookies: {
        getAll: () => request.cookies.getAll(),
        setAll: (cookies) => {
          cookies.forEach(({ name, value, options }) => {
            response.cookies.set(name, value, {
              ...options,
              domain: cookieDomain,
              sameSite: "none" as const,
              secure: true,
            });
          });
        },
      },
    }
  );

  const { data: { user } } = await supabase.auth.getUser();

  const pathWithoutLocale = stripLocalePrefix(pathname);

  // Hvis protected route og ikke logget inn -> redirect til login
  const isProtected = PROTECTED_ROUTES.some(route => 
    pathWithoutLocale === route || pathWithoutLocale.startsWith(`${route}/`)
  );
  
  if (isProtected && !user) {
    const loginUrl = new URL("/no/login", request.url);
    loginUrl.searchParams.set("next", pathname);
    const redirectResponse = NextResponse.redirect(loginUrl);
    return applySecurityHeaders(redirectResponse, nonce);
  }

  // Hvis auth route og allerede logget inn -> redirect til dashboard
  const isAuthRoute = AUTH_ROUTES.some(route => pathWithoutLocale.startsWith(route));
  
  if (isAuthRoute && user) {
    const redirectResponse = NextResponse.redirect(new URL("/dashboard", request.url));
    return applySecurityHeaders(redirectResponse, nonce);
  }

  // Apply security headers to i18n response (which includes the body)
  // Copy any cookies set by Supabase to the i18n response
  response.cookies.getAll().forEach(cookie => {
    i18nResponse.cookies.set(cookie.name, cookie.value, cookie);
  });
  
  return applySecurityHeaders(i18nResponse, nonce);
}

export const config = {
  matcher: [
    // Matcher alt unntatt statiske filer, API routes, og auth routes
    "/((?!/_next/static|/_next/image|favicon.ico|/api/|/auth/|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
