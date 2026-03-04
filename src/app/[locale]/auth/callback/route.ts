import { getAppUrl } from "@/lib/auth/config";
import { createServerClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ locale: string }> },
) {
  const { locale } = await params;
  const url = new URL(request.url);

  // FIX 7: Use x-forwarded-host if available to detect origin correctly behind proxies
  const forwardedHost = request.headers.get("x-forwarded-host");
  const canonicalUrl = getAppUrl();
  const origin = forwardedHost ? `https://${forwardedHost}` : canonicalUrl;

  const code = url.searchParams.get("code");
  const error = url.searchParams.get("error");

  // Debug: log all cookies received from the browser
  const allCookies = request.cookies.getAll();
  const pkceCookie = allCookies.find((c) => c.name.includes("code-verifier"));

  console.info("🔥 CALLBACK DEBUG:", {
    code: code ? `${code.slice(0, 20)}...` : "MISSING",
    error,
    totalCookies: allCookies.length,
    pkceCookieName: pkceCookie?.name || "NONE",
    pkceCookieValue: pkceCookie?.value
      ? `${pkceCookie.value.slice(0, 20)}...`
      : "NONE",
    allCookieNames: allCookies.map((c) => c.name),
    originUsed: origin,
    host: request.headers.get("host"),
    referer: request.headers.get("referer"),
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

  /**
   * FIX 8: Sanitize the redirect path to prevent open redirects.
   * Only allows internal relative paths starting with '/'.
   */
  function sanitizeRedirectPath(path: string | null): string {
    if (!path) return `/${locale}/dashboard`;
    if (path.startsWith("//")) return `/${locale}/dashboard`;
    if (path.startsWith("/")) return path;
    return `/${locale}/dashboard`;
  }

  const nextParam =
    url.searchParams.get("next") || url.searchParams.get("redirectTo") || "/";
  const next = sanitizeRedirectPath(nextParam);

  // FIX 2: Create response FIRST — cookies will be set on this response object
  const successResponse = NextResponse.redirect(new URL(next, origin), {
    status: 302,
  });
  const response = successResponse;

  try {
    // Use Route Handler client: reads cookies from request, writes to response
    const supabase = createServerClient(request, response);

    // Attempt to exchange code for session
    const { data, error: exchangeError } =
      await supabase.auth.exchangeCodeForSession(code);

    // FIX: Verify session explicitly as requested by debug script
    await supabase.auth.getSession();

    console.info("🔥 EXCHANGE RESULT:", {
      success: !exchangeError,
      error: exchangeError?.message,
      hasSession: !!data?.session,
      userId: data?.session?.user?.id?.slice(0, 8),
      cookiesAfterExchange: response.cookies.getAll().map((c) => c.name),
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
      "✅ OAUTH SUCCESS — redirecting to dashboard with session cookies",
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
