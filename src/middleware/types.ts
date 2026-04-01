import type { NextRequest, NextResponse } from "next/server";

/**
 * A middleware function receives the current request and optionally
 * an accumulated response (e.g. with cookies set by upstream middleware).
 * It must return a NextResponse.
 */
export type MiddlewareFn = (
  request: NextRequest,
  response?: NextResponse,
) => NextResponse | Promise<NextResponse>;

/**
 * Helper to decide whether a response is terminal (redirect / rewrite / rate-limit).
 * Terminal responses stop the chain early.
 */
export function isTerminal(response: NextResponse): boolean {
  const status = response.status;
  const hasLocation = response.headers.get("location");
  const stopped = response.headers.get("x-middleware-stop");
  return status >= 300 && status < 400
    ? !!hasLocation
    : status !== 200 || !!stopped;
}
