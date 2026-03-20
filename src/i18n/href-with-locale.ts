import { defaultLocale } from "@/i18n/config";

/**
 * Lenker for next-intl `localePrefix: 'as-needed'`.
 * Standardlocale (no) har **ikke** `/no` i URL — bruk `/dashboard`, ikke `/no/dashboard`.
 * Engelsk: `/en/dashboard`.
 */
export function hrefWithLocale(locale: string, pathname: string): string {
  const p = pathname.startsWith("/") ? pathname : `/${pathname}`;
  if (locale === defaultLocale) {
    return p;
  }
  if (p === "/") {
    return `/${locale}`;
  }
  return `/${locale}${p}`;
}
