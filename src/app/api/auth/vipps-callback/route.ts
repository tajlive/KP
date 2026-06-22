import { constantTimeEqual } from "@/lib/auth/crypto";
import { handleVippsCallback } from "@/lib/auth/vipps-callback";
import { getRedisRest } from "@/lib/redis-client";
import { checkRateLimit } from "@/lib/rate-limit";
import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const VIPPS_PKCE_COOKIE = "__Host-vipps-pkce";
const VIPPS_STATE_COOKIE = "__Host-vipps-state";

function redirectNoCache(request: NextRequest, location: string): NextResponse {
  const res = NextResponse.redirect(new URL(location, request.url), 302);
  res.headers.set(
    "Cache-Control",
    "private, no-store, max-age=0, must-revalidate",
  );
  res.headers.set("CDN-Cache-Control", "no-store");
  return res;
}

/**
 * GET /api/auth/vipps-callback?code=...&state=...
 * Exchanges the Vipps authorization code and redirects the user.
 */
export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");

  const ip =
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    "unknown";
  const { allowed } = checkRateLimit(`vipps-callback:${ip}`, 10, 60_000);

  // Locale is read from KV when available; fall back to Norwegian for errors.
  let locale = "no";

  if (!allowed) {
    return redirectNoCache(request, `/${locale}/innlogging?error=rate_limited`);
  }

  if (!code || !state) {
    return redirectNoCache(
      request,
      `/${locale}/innlogging?error=vipps_missing_params`,
    );
  }

  const codeVerifier = request.cookies.get(VIPPS_PKCE_COOKIE)?.value ?? null;
  const stateCookie = request.cookies.get(VIPPS_STATE_COOKIE)?.value ?? null;

  if (!codeVerifier || !stateCookie || !constantTimeEqual(state, stateCookie)) {
    return redirectNoCache(request, `/${locale}/innlogging?error=invalid_state`);
  }

  const redis = getRedisRest();
  let next: string | undefined;
  if (redis) {
    const stateData = await redis.get<{ locale?: string; next?: string }>(
      `vipps:state:${state}`,
    );
    if (stateData?.locale) {
      locale = stateData.locale;
    }
    if (stateData?.next) {
      next = stateData.next;
    }
    await redis.del(`vipps:state:${state}`);
  }

  const result = await handleVippsCallback({
    code,
    state,
    codeVerifier,
    locale,
    next,
  });

  const res = redirectNoCache(request, result.redirectUrl);

  const deleteCookieOptions = {
    httpOnly: true,
    secure: true,
    sameSite: "lax" as const,
    path: "/",
    maxAge: 0,
  };
  res.cookies.set(VIPPS_PKCE_COOKIE, "", deleteCookieOptions);
  res.cookies.set(VIPPS_STATE_COOKIE, "", deleteCookieOptions);

  return res;
}
