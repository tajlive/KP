import { getAppUrl } from "@/lib/auth/config";
import { createServerClient } from "@/lib/supabase/server";
import { createServerClient as createSSRServerClient } from "@supabase/ssr";
import type { Database } from "@/lib/database.types";
import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

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

  // Use localhost detection FIRST, then check forwardedHost
  const forwardedHost = request.headers.get("x-forwarded-host");
  const origin = isLocalhost
    ? `${protocol}://${host}`
    : forwardedHost
      ? `https://${forwardedHost}`
      : canonicalUrl;

  const code = url.searchParams.get("code");
  const error = url.searchParams.get("error");

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
    protocol: protocol,
    host: host,
    isLocalhost: isLocalhost,
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

  function sanitizeRedirectPath(path: string | null): string {
    if (!path) return `/${locale}/dashboard`;
    if (path.startsWith("//")) return `/${locale}/dashboard`;
    if (path.startsWith("/")) return path;
    return `/${locale}/dashboard`;
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
      cookiesAfterExchange: response.cookies.getAll().map((c) => c.name),
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
