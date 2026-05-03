/**
 * Edge-safe pathname parsing for next-intl `localePrefix: 'as-needed'`.
 * Default locale (no) may omit the /no prefix; th/zh kept for legacy URLs.
 */

export const LOCALE_RE = /^(no|en|th|zh)$/;

import { routing } from "@/i18n/routing.config";

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

/** After login: only same-origin relative paths; never back to guest auth screens. */
export function sanitizePostAuthRedirect(
  rawNext: string | null,
  locale: string,
): string {
  const fallback = localizedPathname(locale, "/dashboard");
  if (rawNext == null || rawNext.trim() === "") return fallback;

  let pathPart = rawNext.trim();

  try {
    if (pathPart.startsWith("http://") || pathPart.startsWith("https://")) {
      const u = new URL(pathPart);
      pathPart = u.pathname + (u.search || "");
    }
  } catch {
    return fallback;
  }

  if (!pathPart.startsWith("/") || pathPart.startsWith("//")) return fallback;

  const lower = pathPart.toLowerCase();
  const authFragments = [
    "/login",
    "/register",
    "/glemt-passord",
    "/registrer",
  ];
  if (authFragments.some((f) => lower.includes(f))) return fallback;
  if (lower.includes("/login") && !lower.includes("/admin/login"))
    return fallback;

  return pathPart;
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
