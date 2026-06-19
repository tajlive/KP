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
  }

  return res;
};
