/**
 * API Versioning Middleware — Enterprise deprecation strategy.
 *
 * Adds standard HTTP deprecation headers to unversioned /api/* routes,
 * signaling clients to migrate to /api/v1/* before the sunset date.
 *
 * Headers:
 *   Deprecation: true
 *   Sunset: Sat, 01 Jan 2027 00:00:00 GMT
 *   Link: </api/v1>; rel="deprecation"
 *   API-Version: 1
 */

import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

const SUNSET_DATE = "Sat, 01 Jan 2027 00:00:00 GMT";

export function apiVersionMiddleware(
  request: NextRequest,
  response?: NextResponse,
): NextResponse {
  const res = response ?? NextResponse.next();

  // Only add deprecation headers to unversioned /api/* routes
  const pathname = request.nextUrl.pathname;
  if (pathname.startsWith("/api/") && !pathname.startsWith("/api/v")) {
    res.headers.set("Deprecation", "true");
    res.headers.set("Sunset", SUNSET_DATE);
    res.headers.set("Link", '</api/v1>; rel="deprecation"');
  }

  res.headers.set("API-Version", "1");

  return res;
}
