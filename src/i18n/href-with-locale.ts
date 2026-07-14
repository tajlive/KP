/**
 * Lenker for next-intl `localePrefix: 'always'`.
 * ALLE URL-er skal ha locale-prefix: `/no/dashboard`, `/en/dashboard`.
 * Bruk av URL uten prefix gir ekstra server-redirects og kan bryte RSC-prefetch.
 */
export function hrefWithLocale(locale: string, pathname: string): string {
  const p = pathname.startsWith("/") ? pathname : `/${pathname}`;
  if (p === "/") {
    return `/${locale}`;
  }
  return `/${locale}${p}`;
}
