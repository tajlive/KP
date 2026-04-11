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
import { randomBytes } from "crypto";

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
  "/auth/login",
  "/auth/register",
  "/auth/reset-password",
];

/**
 * Generate a cryptographically secure nonce for CSP
 * Returns base64-encoded 16 bytes (128 bits)
 */
function generateNonce(): string {
  return randomBytes(16).toString("base64");
}

/**
 * Build CSP header with nonce
 * Replaces 'unsafe-inline' with nonce-based approach
 */
function buildCSPHeader(nonce: string): string {
  const isDev = process.env.NODE_ENV === "development";
  
  // CSP directives - using nonce instead of 'unsafe-inline'
  const directives = [
    "default-src 'self'",
    `script-src 'self' 'nonce-${nonce}'${isDev ? " 'unsafe-eval'" : ""} https://vuxbjlykgmzskxbclquf.supabase.co https://*.tradingview.com https://*.vercel-scripts.com https://vercel.live https://plausible.io`,
    `style-src 'self' 'nonce-${nonce}'`,
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

  // 2. Auth håndtering
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookieEncoding: "raw",
      cookies: {
        getAll: () => request.cookies.getAll(),
        setAll: (cookies) => {
          cookies.forEach(({ name, value }) => {
            request.cookies.set(name, value);
          });
        },
      },
    }
  );

  const { data: { user } } = await supabase.auth.getUser();

  // Hvis protected route og ikke logget inn -> redirect til login
  const isProtected = PROTECTED_ROUTES.some(route => 
    pathname === route || pathname.startsWith(`${route}/`)
  );
  
  if (isProtected && !user) {
    const loginUrl = new URL("/auth/login", request.url);
    loginUrl.searchParams.set("next", pathname);
    const redirectResponse = NextResponse.redirect(loginUrl);
    return applySecurityHeaders(redirectResponse, nonce);
  }

  // Hvis auth route og allerede logget inn -> redirect til dashboard
  const isAuthRoute = AUTH_ROUTES.some(route => pathname.startsWith(route));
  
  if (isAuthRoute && user) {
    const redirectResponse = NextResponse.redirect(new URL("/dashboard", request.url));
    return applySecurityHeaders(redirectResponse, nonce);
  }

  // Apply security headers to the response
  return applySecurityHeaders(i18nResponse, nonce);
}

export const config = {
  matcher: [
    // Matcher alt unntatt statiske filer og API routes
    "/((?!_next/static|_next/image|favicon.ico|api/|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
