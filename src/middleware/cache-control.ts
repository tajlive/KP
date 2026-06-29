/**
 * Selective Cache-Control middleware
 *
 * Replaces the global no-store that used to live in CSP middleware.
 * Sensitive/user-specific routes get no-store; public marketing and legal
 * pages receive explicit Cloudflare edge-cache headers.
 */

import { NextRequest, NextResponse } from "next/server";
import type { MiddlewareFn } from "./types";
import { parseLocalePath } from "./locale-path";

/** Routes that must never be cached by browser or CDN. */
const NO_STORE_PATHS = [
  // Landing page — must reflect redesign changes immediately
  "/",
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
  "/autopilot",
  "/marked",
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
