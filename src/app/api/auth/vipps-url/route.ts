import { getCallbackUrl } from "@/lib/auth/config";
import { shouldShowVippsForRequest } from "@/lib/geo/vipps-region";
import { NextRequest, NextResponse } from "next/server";
import { createHash, randomBytes } from "crypto";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const VIPPS_PKCE_COOKIE = "vipps_pkce_verifier";
const VIPPS_STATE_PREFIX = "vipps_";

function base64UrlEncode(buf: Buffer): string {
  return buf
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

/**
 * GET /api/auth/vipps-url?locale=no&next=/dashboard
 * Returns { url } and sets vipps_pkce_verifier cookie for callback.
 */
export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const locale = url.searchParams.get("locale") || "no";
  const next = url.searchParams.get("next") || "";

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

  const redirectUri = getCallbackUrl(locale);

  const codeVerifier = base64UrlEncode(randomBytes(32));
  const codeChallenge = base64UrlEncode(
    createHash("sha256").update(codeVerifier).digest(),
  );

  const statePayload = {
    next: next || `/${locale}/dashboard`,
    nonce: base64UrlEncode(randomBytes(16)),
  };
  const state =
    VIPPS_STATE_PREFIX +
    base64UrlEncode(Buffer.from(JSON.stringify(statePayload), "utf8"));

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
  res.cookies.set(VIPPS_PKCE_COOKIE, codeVerifier, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 600,
  });

  return res;
}
