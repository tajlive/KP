/**
 * Post-auth redirect sanitizer.
 *
 * Only allows same-origin relative paths that are not auth pages and that use
 * a known locale prefix. Rejects external URLs, protocol-relative URLs,
 * encoded bypasses, control characters, and auth-related paths.
 */

import { locales, defaultLocale } from "@/i18n/config";

const VALID_LOCALE_SET = new Set<string>(locales);

const AUTH_PATHS = [
  "/login",
  "/register",
  "/glemt-passord",
  "/registrer",
  "/callback",
  "/update-password",
  "/admin/reset-password",
  "/admin/login",
];

export function sanitizePostAuthRedirect(
  next: string | null | undefined,
  locale: string,
): string {
  const safeLocale = VALID_LOCALE_SET.has(locale) ? locale : defaultLocale;
  const fallback = `/${safeLocale}/dashboard`;

  if (next == null) return fallback;

  let raw = next.trim();
  if (raw === "") return fallback;

  // Decode once to catch encoded bypass attempts such as %2f, %2F, etc.
  try {
    raw = decodeURIComponent(raw);
  } catch {
    // Keep raw if decoding fails.
  }

  // Reject control characters.
  if (
    Array.from(raw).some(
      (char) => {
        const code = char.charCodeAt(0);
        return code < 0x20 || code === 0x7f;
      },
    )
  ) {
    return fallback;
  }

  // Extract path from absolute URLs; reject everything else that is not a
  // relative path starting with "/".
  let pathPart = raw;
  if (/^https?:\/\//i.test(raw)) {
    try {
      const u = new URL(raw);
      pathPart = u.pathname + (u.search || "");
    } catch {
      return fallback;
    }
  }

  if (!pathPart.startsWith("/") || pathPart.startsWith("//")) return fallback;

  // Reject auth pages (check path only, ignore query string).
  const pathOnly = pathPart.split("?")[0] ?? pathPart;
  const lowerPath = pathOnly.toLowerCase();
  if (
    AUTH_PATHS.some(
      (p) => lowerPath === p || lowerPath.startsWith(`${p}/`),
    )
  ) {
    return fallback;
  }

  // Validate locale prefix when present.
  const firstSegment = pathOnly.split("/")[1];
  if (firstSegment && !VALID_LOCALE_SET.has(firstSegment)) return fallback;

  return pathPart;
}
