/**
 * Selective Cache-Control middleware
 *
 * Replaces the global no-store that used to live in CSP middleware.
 * Only sensitive/user-specific routes get no-store; marketing and legal
 * pages are left to Next.js / CDN cache heuristics.
 */

import { NextRequest, NextResponse } from "next/server";
import type { MiddlewareFn } from "./types";
import { parseLocalePath } from "./locale-path";

/** Routes that must never be cached by browser or CDN. */
const NO_STORE_PATHS = [
  // Auth
  "/login",
  "/register",
  "/registrer",
  "/glemt-passord",
  "/forgot-password",
  "/reset-password",
  "/update-password",
  "/callback",
  // Admin
  "/admin",
  // User-specific
  "/dashboard",
  "/profile",
  "/innstillinger",
  "/settings",
  "/konto",
  "/handelshistorikk",
  "/varsler",
  "/leagues",
  // Trading
  "/handel",
  "/paper-trading",
  "/live-trading",
  "/auto-trade",
  "/auto-handel",
  "/auto-trading",
  "/autopilot",
  // Social / commerce
  "/copy-trading",
  "/marketplace",
  "/checkout",
  // Onboarding
  "/onboarding",
  "/velg-strategi",
  "/velkommen",
  "/interessetest",
  "/quiz",
  "/verify",
] as const;

/** Public marketing/legal pages that benefit from Cloudflare edge caching. */
const MARKETING_PATHS = [
  "/",
  "/priser",
  "/login",
  "/register",
  "/kontakt",
  "/om-oss",
  "/vilkar",
  "/personvern",
  "/cookies",
] as const;

function isMarketingPath(strippedPath: string): boolean {
  return MARKETING_PATHS.some(
    (p) => strippedPath === p || strippedPath.startsWith(`${p}/`),
  );
}

function isNoStoreRoute(strippedPath: string): boolean {
  const lower = strippedPath.toLowerCase();
  return NO_STORE_PATHS.some(
    (prefix) => lower === prefix || lower.startsWith(`${prefix}/`),
  );
}

function setNoStoreHeaders(response: NextResponse): void {
  response.headers.set(
    "Cache-Control",
    "private, no-store, max-age=0, must-revalidate",
  );
  response.headers.set("CDN-Cache-Control", "no-store, max-age=0");
  response.headers.set("Vercel-CDN-Cache-Control", "no-store, max-age=0");
}

const MARKETING_CACHE_CONTROL =
  "public, max-age=60, s-maxage=300, stale-while-revalidate=86400, stale-if-error=3600";

export const cacheControlMiddleware: MiddlewareFn = (
  request: NextRequest,
  response?: NextResponse,
) => {
  const res = response ?? NextResponse.next();
  const pathname = request.nextUrl.pathname;

  // API routes set their own Cache-Control; don't override them here.
  if (pathname.startsWith("/api/") || pathname === "/api") {
    return res;
  }

  const { strippedPath } = parseLocalePath(pathname);

  // Sensitive/user-specific routes must never be cached, even if they overlap
  // with marketing path definitions (e.g. /login, /register).
  if (isNoStoreRoute(strippedPath)) {
    setNoStoreHeaders(res);
    return res;
  }

  if (isMarketingPath(strippedPath)) {
    res.headers.set("Cache-Control", MARKETING_CACHE_CONTROL);
    return res;
  }

  return res;
};
