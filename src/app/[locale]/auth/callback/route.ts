import { getAppUrl } from "@/lib/auth/config";
import { handleVippsCallback } from "@/lib/auth/vipps-callback";
import { createServerClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";
import { handleOAuthError, getErrorRedirectUrl } from "./error-handler";

export const dynamic = "force-dynamic";

const VIPPS_PKCE_COOKIE = "vipps_pkce_verifier";
const VIPPS_STATE_PREFIX = "vipps_";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ locale: string }> },
) {
  const { locale } = await params;
  const url = new URL(request.url);

  const host = request.headers.get("host") || "localhost:3000";
  const canonicalUrl = getAppUrl();

  const isLocalhost = host.includes("localhost") || host.includes("127.0.0.1");
  const protocol = isLocalhost ? "http" : "https";

  const forwardedHost = request.headers.get("x-forwarded-host");
  const origin = isLocalhost
    ? `${protocol}://${host}`
    : forwardedHost
      ? `https://${forwardedHost}`
      : canonicalUrl;

  const code = url.searchParams.get("code");
  const error = url.searchParams.get("error");
  const state = url.searchParams.get("state");

  const allCookies = request.cookies.getAll();
  const pkceCookie = allCookies.find((c) => c.name.includes("code-verifier"));
  const vippsVerifier = allCookies.find((c) => c.name === VIPPS_PKCE_COOKIE);

  // 🚨 HANDLE OAUTH ERRORS FROM PROVIDER
  if (error) {
    console.error("🔥 OAUTH PROVIDER ERROR:", error);
    const errorResult = handleOAuthError(error, locale);
    const errorUrl = getErrorRedirectUrl(errorResult, locale, origin);
    return NextResponse.redirect(errorUrl, { status: 302 });
  }

  if (!code) {
    return NextResponse.redirect(
      new URL(`/${locale}/innlogging?error=no_code`, origin),
    );
  }

  // Vipps flow
  if (state?.startsWith(VIPPS_STATE_PREFIX)) {
    const result = await handleVippsCallback({
      code,
      state,
      codeVerifier: vippsVerifier?.value ?? null,
      locale,
    });
    const res = NextResponse.redirect(result.redirectUrl, { status: 302 });
    res.cookies.delete(VIPPS_PKCE_COOKIE);
    return res;
  }

  function sanitizeRedirectPath(path: string | null): string {
    if (!path) return `/${locale}/dashboard`;
    if (path.startsWith("//")) return `/${locale}/dashboard`;
    const normalized = path.replace(/\/dashbord(\/|$)/g, "/dashboard$1");
    return normalized.startsWith("/") ? normalized : `/${locale}/dashboard`;
  }

  const nextParam =
    url.searchParams.get("next") || url.searchParams.get("redirectTo") || null;
  const next = sanitizeRedirectPath(nextParam);

  const successResponse = NextResponse.redirect(new URL(next, origin), {
    status: 302,
  });
  const response = successResponse;

  // CRITICAL: Decode and re-set PKCE cookie for Supabase SSR
  const cookieDomain = host.includes(":") ? undefined : `.${host.replace(/^www\./, "")}`;
  
  if (pkceCookie) {
    try {
      let rawValue = decodeURIComponent(pkceCookie.value);
      if (rawValue.startsWith('"') && rawValue.endsWith('"')) {
        rawValue = rawValue.slice(1, -1);
      }
      // Re-set the decoded cookie so Supabase SSR can find it
      request.cookies.set(pkceCookie.name, rawValue);
    } catch (e) {
      console.error("🔥 FAILED TO DECODE PKCE COOKIE:", e);
    }
  }

  try {
    // Use Supabase SSR client - it will handle cookie setting automatically
    const supabase = createServerClient(request, response);

    const { data, error: exchangeError } =
      await supabase.auth.exchangeCodeForSession(code);

    if (exchangeError || !data.session) {
      console.error("🔥 EXCHANGE FAILED:", exchangeError?.message || "NO SESSION");
      return NextResponse.redirect(
        new URL(
          `/${locale}/innlogging?error=exchange_failed&detail=${encodeURIComponent(exchangeError?.message || "NO_SESSION")}`,
          origin,
        ),
      );
    }

    // Supabase SSR has now set the cookies via the setAll callback
    // We just return the response which includes the cookies
    console.error("✅ OAUTH SUCCESS — redirecting to", next);
    
    return response;
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("🔥 CALLBACK EXCEPTION:", message);
    return NextResponse.redirect(
      new URL(
        `/${locale}/innlogging?error=auth_failed&detail=${encodeURIComponent(message)}`,
        origin,
      ),
    );
  }
}
