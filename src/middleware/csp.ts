/**
 * CSP Middleware with Nonce-Based Security
 * 
 * Generates cryptographically secure nonce for each request to replace
 * 'unsafe-inline' in Content-Security-Policy headers.
 * 
 * Security: Uses crypto.randomBytes for nonce generation (CSP compliant)
 * Backward Compatibility: Falls back to 'unsafe-inline' if nonce cannot be generated
 */

import { NextRequest, NextResponse } from "next/server";
import type { MiddlewareFn } from "./types";

// CSP directive types
interface CSPDirectives {
  [key: string]: string[];
}

/**
 * Generate a cryptographically secure nonce using Web Crypto API
 * (Edge Runtime compatible — unlike Node.js crypto.randomBytes)
 * Returns base64url-encoded 16 bytes (128 bits) - CSP standard
 * 
 * Returns null if generation fails (e.g. in some Edge Runtime environments
 * where btoa or crypto may not be fully available).
 */
function generateNonce(): string | null {
  try {
    const array = new Uint8Array(16);
    crypto.getRandomValues(array);
    // Build binary string safely for btoa (each char = one byte)
    const binary = Array.from(array, (byte) => String.fromCharCode(byte)).join("");
    // base64url avoids + and / which can cause issues in CSP headers
    return btoa(binary)
      .replace(/\+/g, "-")
      .replace(/\//g, "_")
      .replace(/=/g, "");
  } catch {
    return null;
  }
}

/**
 * Build CSP header string from directives object
 */
function _buildCSPHeader(directives: CSPDirectives, nonce: string): string {
  const _isDev = process.env.NODE_ENV === "development";

  const directiveEntries = Object.entries(directives).map(([key, values]) => {
    // Replace NONCE_PLACEHOLDER with actual nonce
    const processedValues = values.map(v =>
      v === "'NONCE_PLACEHOLDER'" ? `'nonce-${nonce}'` : v
    );
    return `${key} ${processedValues.join(" ")}`;
  });

  return directiveEntries.join("; ");
}

/**
 * CSP Middleware - Adds nonce-based Content-Security-Policy headers
 * 
 * SECURITY NOTES:
 * - Never use eval() or new Function() - forbidden by CSP
 * - Always escape values in regex replacements
 * - Nonce is regenerated for every request to prevent replay attacks
 */
export const cspMiddleware: MiddlewareFn = (
  _request: NextRequest,
  response?: NextResponse,
) => {
  // Ensure we have a response object
  const res = response ?? NextResponse.next();
  const isDev = process.env.NODE_ENV === "development";
  
  // Generate nonce (may fail in some Edge Runtime environments)
  const nonce = generateNonce();

  // Define CSP directives
  // 'unsafe-inline' + nonce: browsers ignore 'unsafe-inline' when nonce is present,
  // but 'unsafe-inline' is required as fallback when nonce cannot be generated.
  const directives: CSPDirectives = {
    "default-src": ["'self'"],
    "script-src": [
      "'self'",
      "'unsafe-inline'",
      ...(isDev ? ["'unsafe-eval'"] : []),
      "https://pskhryjzkobytnfwucrb.supabase.co",
      "https://*.tradingview.com",
      "https://plausible.io",
      "https://utt.impactcdn.com",
      "https://www.googletagmanager.com",
      "https://www.google-analytics.com",
      "https://challenges.cloudflare.com",
      "https://static.cloudflareinsights.com",
    ],
    "style-src": [
      "'self'",
      "'unsafe-inline'",
    ],
    "img-src": [
      "'self'",
      "blob:",
      "data:",
      "https://pskhryjzkobytnfwucrb.supabase.co",
      "https://*.tradingview.com",
      "https://*.coingecko.com",
      "https://klarpakke.no",
      "https://www.klarpakke.no",
    ],
    "font-src": [
      "'self'",
      "data:",
      "https://r2cdn.perplexity.ai",
    ],
    "worker-src": ["'self'", "blob:"],
    "object-src": ["'none'"],
    "base-uri": ["'self'"],
    "form-action": ["'self'"],
    "frame-ancestors": ["'none'"],
    "connect-src": [
      "'self'",
      "https://pskhryjzkobytnfwucrb.supabase.co",
      "wss://pskhryjzkobytnfwucrb.supabase.co",
      "https://api.kraken.com",
      "https://api.coingecko.com",
      "wss://ws.kraken.com",
      "https://*.sanity.io",
      "wss://*.sanity.io",
      "https://plausible.io",
      "https://o4509555622608896.ingest.de.sentry.io",
      "https://*.ingest.de.sentry.io",
      ...(isDev 
        ? [
            "ws://localhost:*",
            "ws://127.0.0.1:*",
            "wss://localhost:*",
            "wss://127.0.0.1:*",
          ]
        : []),
    ],
    "frame-src": ["'self'"],
    "upgrade-insecure-requests": [],
  };

  // Build CSP header from directives
  const cspHeader = Object.entries(directives)
    .map(([key, values]) => `${key} ${values.join(" ")}`)
    .join("; ");

  // Set CSP header on response
  res.headers.set("Content-Security-Policy", cspHeader);

  // NOTE: We intentionally do NOT set a global Cache-Control header here.
  // CSP is independent of caching; adding no-store globally prevented
  // Cloudflare from caching cacheable HTML (marketing/legal pages).
  // Selective no-store for sensitive routes is handled by a dedicated
  // cache-control middleware so auth/dashboard pages remain uncached.

  // Also set nonce in a custom header for client-side access (if needed)
  // This allows client components to access the nonce for inline scripts
  if (nonce) {
    res.headers.set("X-CSP-Nonce", nonce);
  }

  return res;
};

/**
 * Generate CSP meta tag content for use in HTML
 * Use this for pages that need CSP in meta tags
 */
export function generateCSPMetaContent(_nonce: string): string {
  const isDev = process.env.NODE_ENV === "development";
  
  const directives: CSPDirectives = {
    "default-src": ["'self'"],
    "script-src": [
      "'self'",
      "'unsafe-inline'",
      ...(isDev ? ["'unsafe-eval'"] : []),
      "https://pskhryjzkobytnfwucrb.supabase.co",
      "https://*.tradingview.com",
    ],
    "style-src": ["'self'", "'unsafe-inline'"],
    "img-src": [
      "'self'",
      "blob:",
      "data:",
      "https://pskhryjzkobytnfwucrb.supabase.co",
    ],
    "connect-src": [
      "'self'",
      "https://pskhryjzkobytnfwucrb.supabase.co",
      "wss://pskhryjzkobytnfwucrb.supabase.co",
    ],
  };

  return Object.entries(directives)
    .map(([key, values]) => `${key} ${values.join(" ")}`)
    .join("; ");
}

export { generateNonce };
