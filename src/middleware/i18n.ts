import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

export const SUPPORTED_LOCALES = ["no", "en", "th", "zh"] as const;
export const DEFAULT_LOCALE = "no" as const;

export function getPreferredLocale(acceptLanguage: string | null): string {
  if (!acceptLanguage) return DEFAULT_LOCALE;

  const languages = acceptLanguage
    .split(",")
    .map((lang) => {
      const [code, qValue] = lang.trim().split(";q=");
      const quality = qValue ? parseFloat(qValue) : 1.0;
      return { code: code.toLowerCase(), quality };
    })
    .sort((a, b) => b.quality - a.quality);

  for (const { code } of languages) {
    if (SUPPORTED_LOCALES.includes(code as typeof SUPPORTED_LOCALES[number])) return code;
    const baseCode = code.split("-")[0];
    if (SUPPORTED_LOCALES.includes(baseCode as typeof SUPPORTED_LOCALES[number])) return baseCode;
    if (baseCode === "nb") return "no";
  }

  return DEFAULT_LOCALE;
}

export function handleI18nRedirect(request: NextRequest): NextResponse | null {
  const { pathname } = request.nextUrl;

  const pathnameHasLocale = SUPPORTED_LOCALES.some(
    (locale) => pathname.startsWith(`/${locale}/`) || pathname === `/${locale}`,
  );

  if (
    !pathnameHasLocale &&
    !pathname.startsWith("/api/") &&
    !pathname.startsWith("/auth/")
  ) {
    const acceptLanguage = request.headers.get("accept-language");
    const preferredLocale = getPreferredLocale(acceptLanguage);
    const redirectUrl = new URL(
      `/${preferredLocale}${pathname === "/" ? "" : pathname}`,
      request.url,
    );
    redirectUrl.search = request.nextUrl.search;
    return NextResponse.redirect(redirectUrl);
  }

  return null;
}
