import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { SUPPORTED_LOCALES } from "./i18n";

export function handleOAuthRedirect(request: NextRequest): NextResponse | null {
  const { pathname, searchParams } = request.nextUrl;

  const code = searchParams.get("code");
  const error = searchParams.get("error");
  const isAuthCallback = pathname.includes("/callback");

  // If already on auth callback, don't redirect
  if (isAuthCallback) {
    return null;
  }

  // Catch orphaned OAuth codes
  if (code || error) {
    const parts = pathname.split("/");
    const localePart = parts[1];
    const locale = SUPPORTED_LOCALES.includes(localePart as typeof SUPPORTED_LOCALES[number]) ? localePart : "no";

    const callbackUrl = new URL(`/${locale}/callback`, request.url);
    if (code) callbackUrl.searchParams.set("code", code);
    if (error) callbackUrl.searchParams.set("error", error);

    const next =
      searchParams.get("next") ||
      searchParams.get("redirectTo");
    if (next) callbackUrl.searchParams.set("next", next);

    const res = NextResponse.redirect(callbackUrl);
    res.headers.set("Cache-Control", "no-store, max-age=0, must-revalidate");
    res.headers.set("Vercel-CDN-Cache-Control", "no-store, max-age=0");
    res.headers.set("CDN-Cache-Control", "no-store, max-age=0");
    return res;
  }

  return null;
}
