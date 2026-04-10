import { getAppUrl } from "@/lib/auth/config";
import { handleVippsCallback } from "@/lib/auth/vipps-callback";
import { createServerClient } from "@supabase/ssr";
import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const VIPPS_PKCE_COOKIE = "vipps_pkce_verifier";
const VIPPS_STATE_PREFIX = "vipps_";

// Cookie domain helper
function getCookieDomain(request: NextRequest): string | undefined {
  const host = request.headers.get("host") || "";
  const rootDomain = host.startsWith("www.") ? host.replace("www.", "") : host;
  return rootDomain.includes(":") ? undefined : `.${rootDomain}`;
}

// Simple OAuth error handler
function handleOAuthError(error: string): { error: string; description: string } {
  return {
    error,
    description: error === "access_denied" ? "Bruker avbrøt innloggingen" : "OAuth feil",
  };
}

function getErrorRedirectUrl(
  errorResult: { error: string; description: string },
  locale: string,
  origin: string,
): URL {
  const url = new URL(`/${locale}/innlogging`, origin);
  url.searchParams.set("error", errorResult.error);
  url.searchParams.set("detail", errorResult.description);
  return url;
}

export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  
  // Get locale from query param or default to "no"
  const locale = url.searchParams.get("locale") || "no";
  
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
  const cookieDomain = getCookieDomain(request);

  const allCookies = request.cookies.getAll();
  const pkceCookie = allCookies.find((c) => c.name.includes("code-verifier"));
  const vippsVerifier = allCookies.find((c) => c.name === VIPPS_PKCE_COOKIE);

  // 🚨 HANDLE OAUTH ERRORS FROM PROVIDER
  if (error) {
    console.error("🔥 OAUTH PROVIDER ERROR:", error);
    const errorResult = handleOAuthError(error);
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

  // Debug: Log all incoming cookies
  console.error("🔥 CALLBACK DEBUG — Incoming cookies:", {
    count: allCookies.length,
    names: allCookies.map((c) => c.name),
    pkceCookies: allCookies
      .filter((c) => c.name.includes("code-verifier"))
      .map((c) => ({
        name: c.name,
        valueLen: c.value.length,
        valuePreview: c.value.substring(0, 50) + "...",
        isEncoded: c.value.includes("%"),
      })),
  });

  // Create response early so we can capture cookies set by Supabase
  const redirectResponse = NextResponse.redirect(new URL(next, origin), {
    status: 302,
  });

  try {
    // Create Supabase SSR client with detailed logging
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookieEncoding: "raw",
        cookies: {
          getAll: () => {
            // Return all cookies, but decode PKCE cookie values
            const cookies = request.cookies.getAll();
            return cookies.map((cookie) => {
              // PKCE cookies need to be URL-decoded for Supabase SSR
              if (cookie.name.includes("code-verifier")) {
                try {
                  let decoded = decodeURIComponent(cookie.value);
                  // Remove surrounding quotes if present
                  if (decoded.startsWith('"') && decoded.endsWith('"')) {
                    decoded = decoded.slice(1, -1);
                  }
                  console.error("🔥 PKCE COOKIE DECODED:", {
                    name: cookie.name,
                    originalLen: cookie.value.length,
                    decodedLen: decoded.length,
                  });
                  return { ...cookie, value: decoded };
                } catch (e) {
                  console.error("🔥 PKCE DECODE FAILED:", e);
                  return cookie;
                }
              }
              return cookie;
            });
          },
          setAll: (cookiesToSet) => {
            console.error("🔥 SUPABASE SETALL CALLED:", {
              count: cookiesToSet.length,
              names: cookiesToSet.map((c) => c.name),
            });

            cookiesToSet.forEach(({ name, value, options }) => {
              console.error("🔥 SETTING COOKIE:", {
                name,
                valueLen: value.length,
                valuePreview: value.substring(0, 100) + "...",
              });

              redirectResponse.cookies.set(name, value, {
                ...options,
                domain: cookieDomain,
                sameSite: "none",
                secure: true,
                path: "/",
              });
            });
          },
        },
      },
    );

    console.error(
      "🔥 CALLING exchangeCodeForSession with code:",
      code.substring(0, 20) + "...",
    );

    const { data, error: exchangeError } =
      await supabase.auth.exchangeCodeForSession(code);

    console.error("🔥 EXCHANGE RESULT:", {
      success: !exchangeError,
      error: exchangeError?.message,
      hasSession: !!data?.session,
      userId: data?.session?.user?.id?.slice(0, 8),
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

    // Debug: Log cookies that were set on redirectResponse
    const setCookies = redirectResponse.cookies.getAll();
    console.error("🔥 COOKIES SET ON REDIRECT RESPONSE:", {
      count: setCookies.length,
      names: setCookies.map((c) => c.name),
    });

    console.error("✅ OAUTH SUCCESS — redirecting to", next);
    return redirectResponse;
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
