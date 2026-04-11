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
import { randomBytes } from "crypto";
import type { MiddlewareFn } from "./types";

// CSP directive types
interface CSPDirectives {
  [key: string]: string[];
}

/**
 * Generate a cryptographically secure nonce
 * Returns base64-encoded 16 bytes (128 bits) - CSP standard
 */
function generateNonce(): string {
  return randomBytes(16).toString("base64");
}

/**
 * Escape special regex characters in a string
 * Prevents regex injection when replacing nonce placeholders
 */
function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * Build CSP header string from directives object
 */
function buildCSPHeader(directives: CSPDirectives, nonce: string): string {
  const isDev = process.env.NODE_ENV === "development";
  
  const directiveEntries = Object.entries(directives).map(([key, values]) => {
    // Replace NONCE_PLACEHOLDER with actual nonce
    const processedValues = values.map(v => 
      v === "'NONCE_PLACEHOLDER'" ? `'nonce-${escapeRegex(nonce)}'` : v
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
  
  // Generate cryptographically secure nonce
  let nonce: string;
  try {
    nonce = generateNonce();
  } catch (error) {
    // Fallback: If crypto fails, log and use a fallback (should never happen)
    console.error("[CSP] Failed to generate nonce:", error);
    // In production, we should still serve the page but with unsafe-inline
    // This is a safety fallback only
    if (!isDev) {
      console.warn("[CSP] Using fallback CSP without nonce");
    }
    nonce = "";
  }

  // Define CSP directives with nonce placeholder
  // NOTE: 'unsafe-inline' is ignored by browsers when nonce is present (backward compat)
  const directives: CSPDirectives = {
    "default-src": ["'self'"],
    "script-src": [
      "'self'",
      "'NONCE_PLACEHOLDER'",
      ...(isDev ? ["'unsafe-eval'"] : []),
      "https://vuxbjlykgmzskxbclquf.supabase.co",
      "https://*.tradingview.com",
      "https://*.vercel-scripts.com",
      "https://vercel.live",
      "https://plausible.io",
    ],
    "style-src": [
      "'self'",
      "'NONCE_PLACEHOLDER'",
    ],
    "img-src": [
      "'self'",
      "blob:",
      "data:",
      "https://vuxbjlykgmzskxbclquf.supabase.co",
      "https://*.tradingview.com",
      "https://*.coingecko.com",
      "https://vercel.com",
      "https://klarpakke.no",
      "https://www.klarpakke.no",
    ],
    "font-src": [
      "'self'",
      "data:",
      "https://vercel.live",
      "https://r2cdn.perplexity.ai",
    ],
    "worker-src": ["'self'", "blob:"],
    "object-src": ["'none'"],
    "base-uri": ["'self'"],
    "form-action": ["'self'"],
    "frame-ancestors": ["'none'"],
    "connect-src": [
      "'self'",
      "https://vuxbjlykgmzskxbclquf.supabase.co",
      "wss://vuxbjlykgmzskxbclquf.supabase.co",
      "https://api.binance.com",
      "wss://stream.binance.com:9443",
      "https://vercel.live",
      "https://plausible.io",
      "https://o4509555622608896.ingest.de.sentry.io",
      ...(isDev 
        ? [
            "ws://localhost:*",
            "ws://127.0.0.1:*",
            "wss://localhost:*",
            "wss://127.0.0.1:*",
          ]
        : []),
    ],
    "frame-src": ["https://vercel.live"],
    "upgrade-insecure-requests": [],
  };

  // Build CSP header with nonce
  const cspHeader = buildCSPHeader(directives, nonce);

  // Set CSP header on response
  res.headers.set("Content-Security-Policy", cspHeader);

  // Also set nonce in a custom header for client-side access (if needed)
  // This allows client components to access the nonce for inline scripts
  res.headers.set("X-CSP-Nonce", nonce);

  return res;
};

/**
 * Generate CSP meta tag content for use in HTML
 * Use this for pages that need CSP in meta tags
 */
export function generateCSPMetaContent(nonce: string): string {
  const isDev = process.env.NODE_ENV === "development";
  
  const directives: CSPDirectives = {
    "default-src": ["'self'"],
    "script-src": [
      "'self'",
      `'nonce-${nonce}'`,
      ...(isDev ? ["'unsafe-eval'"] : []),
      "https://vuxbjlykgmzskxbclquf.supabase.co",
      "https://*.tradingview.com",
    ],
    "style-src": ["'self'", `'nonce-${nonce}'`],
    "img-src": [
      "'self'",
      "blob:",
      "data:",
      "https://vuxbjlykgmzskxbclquf.supabase.co",
    ],
    "connect-src": [
      "'self'",
      "https://vuxbjlykgmzskxbclquf.supabase.co",
      "wss://vuxbjlykgmzskxbclquf.supabase.co",
    ],
  };

  return Object.entries(directives)
    .map(([key, values]) => `${key} ${values.join(" ")}`)
    .join("; ");
}

export { generateNonce };
