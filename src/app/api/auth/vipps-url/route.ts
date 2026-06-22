import { getCanonicalAppOrigin } from "@/lib/auth/config";
import {
  generateCodeChallenge,
  generateCodeVerifier,
  generateState,
} from "@/lib/auth/crypto";
import { sanitizePostAuthRedirect } from "@/lib/auth/sanitize-redirect";
import { getRedisRest } from "@/lib/redis-client";
import { checkRateLimit } from "@/lib/rate-limit";
import { shouldShowVippsForRequest } from "@/lib/geo/vipps-region";
import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const VIPPS_PKCE_COOKIE = "__Host-vipps-pkce";
const VIPPS_STATE_COOKIE = "__Host-vipps-state";
const VIPPS_CALLBACK_PATH = "/api/auth/vipps-callback";

/**
 * GET /api/auth/vipps-url?locale=no&next=/dashboard
 * Returns { url } and sets __Host-vipps-pkce / __Host-vipps-state cookies.
 */
export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const locale = url.searchParams.get("locale") || "no";
  const next = url.searchParams.get("next");

  const ip =
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    "unknown";
  const { allowed } = checkRateLimit(`vipps-url:${ip}`, 5, 60_000);
  if (!allowed) {
    return NextResponse.json({ error: "rate_limited" }, { status: 429 });
  }

  if (!shouldShowVippsForRequest(request.headers)) {
    return NextResponse.json(
      {
        error:
          "Vipps is only available in Norway, Sweden, Denmark, and Finland.",
      },
      { status: 403 },
    );
  }

  const clientId = process.env.VIPPS_CLIENT_ID;
  const baseUrl = process.env.VIPPS_BASE_URL || "https://api.vipps.no";

  if (!clientId) {
    return NextResponse.json(
      { error: "VIPPS_CLIENT_ID not configured" },
      { status: 500 },
    );
  }

  const redirectUri = `${getCanonicalAppOrigin()}${VIPPS_CALLBACK_PATH}`;

  const codeVerifier = generateCodeVerifier();
  const codeChallenge = await generateCodeChallenge(codeVerifier);
  const state = generateState();

  // Store locale + optional post-auth path server-side instead of in state.
  const redis = getRedisRest();
  if (redis) {
    const stateData: { locale: string; next?: string } = { locale };
    if (next) {
      stateData.next = sanitizePostAuthRedirect(next, locale);
    }
    await redis.set(`vipps:state:${state}`, stateData, { ex: 600 });
  }

  const authUrl = new URL(
    `${baseUrl}/access-management-1.0/access/oauth2/auth`,
  );
  authUrl.searchParams.set("client_id", clientId);
  authUrl.searchParams.set("response_type", "code");
  authUrl.searchParams.set("scope", "openid name phoneNumber email");
  authUrl.searchParams.set("redirect_uri", redirectUri);
  authUrl.searchParams.set("state", state);
  authUrl.searchParams.set("code_challenge", codeChallenge);
  authUrl.searchParams.set("code_challenge_method", "S256");

  const res = NextResponse.json({ url: authUrl.toString() });
  const cookieOptions = {
    httpOnly: true,
    secure: true,
    sameSite: "lax" as const,
    path: "/",
    maxAge: 600,
  };
  res.cookies.set(VIPPS_PKCE_COOKIE, codeVerifier, cookieOptions);
  res.cookies.set(VIPPS_STATE_COOKIE, state, cookieOptions);

  return res;
}
