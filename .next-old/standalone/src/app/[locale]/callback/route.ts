import { NextRequest, NextResponse } from "next/server";
import { locales, defaultLocale } from "@/i18n/config";
import { createServerClient } from "@/lib/supabase/server";
import { sanitizePostAuthRedirect } from "@/lib/auth/sanitize-redirect";

export const dynamic = "force-dynamic";

function redirectNoCache(location: string | URL): NextResponse {
  const res = NextResponse.redirect(location, 302);
  res.headers.set(
    "Cache-Control",
    "private, no-store, max-age=0, must-revalidate",
  );
  res.headers.set("CDN-Cache-Control", "no-store");
  return res;
}

export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const locale = url.pathname.split("/")[1] || defaultLocale;

  if (!locales.includes(locale as typeof locales[number])) {
    return redirectNoCache(
      new URL(`/${defaultLocale}/login?error=invalid_locale`, request.url),
    );
  }

  const code = url.searchParams.get("code");
  const error = url.searchParams.get("error");

  if (error) {
    const target = new URL(`/${locale}/login`, request.url);
    target.searchParams.set("error", error);
    return redirectNoCache(target);
  }

  if (!code) {
    const target = new URL(`/${locale}/login`, request.url);
    target.searchParams.set("error", "no_code");
    return redirectNoCache(target);
  }

  // Dedicated response object for cookie handling. createServerClient will set
  // the Supabase auth cookies on it; we copy them onto the final redirect.
  const cookieResponse = NextResponse.next();
  const supabase = createServerClient(request, cookieResponse);

  const { error: exchangeError } =
    await supabase.auth.exchangeCodeForSession(code);

  if (exchangeError) {
    const target = new URL(`/${locale}/login`, request.url);
    target.searchParams.set("error", exchangeError.message || "exchange_failed");
    const final = redirectNoCache(target);
    for (const cookie of cookieResponse.cookies.getAll()) {
      final.cookies.set(cookie);
    }
    return final;
  }

  const next = url.searchParams.get("next");
  const redirectPath = sanitizePostAuthRedirect(next, locale);
  const final = redirectNoCache(new URL(redirectPath, request.url));
  for (const cookie of cookieResponse.cookies.getAll()) {
    final.cookies.set(cookie);
  }
  return final;
}
