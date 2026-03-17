import { getAppUrl } from "@/lib/auth/config";
import { handleVippsCallback } from "@/lib/auth/vipps-callback";
import { createServerClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

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

  console.info("🔥 CALLBACK DEBUG:", {
    code: code ? `${code.slice(0, 20)}...` : "MISSING",
    error,
    statePrefix: state?.slice(0, 10) ?? "MISSING",
    totalCookies: allCookies.length,
    pkceCookieName: pkceCookie?.name || "NONE",
    vippsCookie: vippsVerifier ? "SET" : "NONE",
    originUsed: origin,
  });

  if (error) {
    console.error("🔥 OAUTH PROVIDER ERROR:", error);
    return NextResponse.redirect(
      new URL(`/${locale}/innlogging?error=${error}`, origin),
    );
  }

  if (!code) {
    console.error("🔥 NO AUTH CODE RECEIVED");
    return NextResponse.redirect(
      new URL(`/${locale}/innlogging?error=no_code`, origin),
    );
  }

  // Vipps flow: state starts with vipps_, use code_verifier cookie and our handler
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

  try {
    const supabase = createServerClient(request, response);

    const { data, error: exchangeError } =
      await supabase.auth.exchangeCodeForSession(code);

    await supabase.auth.getSession();

    console.info("🔥 EXCHANGE RESULT:", {
      success: !exchangeError,
      error: exchangeError?.message,
      hasSession: !!data?.session,
      userId: data?.session?.user?.id?.slice(0, 8),
      redirectingTo: `${origin}${next}`,
    });

    if (exchangeError || !data.session) {
      console.error(
        "🔥 EXCHANGE FAILED:",
        exchangeError?.message || "NO SESSION",
      );
      return NextResponse.redirect(
        new URL(
          `/${locale}/innlogging?error=exchange_failed&detail=${encodeURIComponent(exchangeError?.message || "NO_SESSION")}`,
          origin,
        ),
      );
    }

    console.info(
      `✅ OAUTH SUCCESS — redirecting to ${protocol}://${host}${next}`,
    );
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
