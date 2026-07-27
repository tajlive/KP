/**
 * Edge-safe pathname parsing for next-intl `localePrefix: 'as-needed'`.
 * Active locales are derived from `src/i18n/config.ts`.
 */

import { locales } from "@/i18n/config";
// import { _routing } from "@/i18n/routing.config";
import { sanitizePostAuthRedirect } from "@/lib/auth/sanitize-redirect";

export const LOCALE_RE = new RegExp(`^(${locales.join("|")})$`);

export { sanitizePostAuthRedirect };

/**
 * Path for redirects with next-intl routing config.
 * Respects localePrefix setting: 'always' means all locales including default get prefix.
 */
export function localizedPathname(
  locale: string,
  strippedPath: string,
): string {
  const path = strippedPath.startsWith("/") ? strippedPath : `/${strippedPath}`;
  // localePrefix: "always" — all locales including default get /{locale} prefix
  return `/${locale}${path}`;
}

export function parseLocalePath(pathname: string): {
  locale: string;
  strippedPath: string;
} {
  const segments = pathname.split("/").filter(Boolean);
  if (segments.length === 0) {
    return { locale: "no", strippedPath: "/" };
  }
  const first = segments[0] ?? "";
  if (LOCALE_RE.test(first)) {
    const rest = segments.slice(1);
    return {
      locale: first,
      strippedPath: rest.length ? `/${rest.join("/")}` : "/",
    };
  }
  return { locale: "no", strippedPath: `/${segments.join("/")}` };
}

const GUEST_AUTH_EXACT = new Set([
  "/login",
  "/register",
  "/glemt-passord",
  "/registrer",
]);

export function isGuestAuthRoute(strippedPath: string): boolean {
  const pathOnly = strippedPath.split("?")[0] ?? strippedPath;
  if (GUEST_AUTH_EXACT.has(pathOnly)) return true;
  return [...GUEST_AUTH_EXACT].some(
    (route) => route !== "/login" && pathOnly.startsWith(`${route}/`),
  );
}
