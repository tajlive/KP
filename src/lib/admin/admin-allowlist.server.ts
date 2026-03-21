import "server-only";

import {
  ADMIN_EMAIL_FALLBACK,
  normalizeAdminEmail,
} from "@/lib/admin/admin-allowlist.shared";

/**
 * Ekstra admin-e-poster fra miljø (kommaseparert, case-insensitive).
 * @example ADMIN_EMAIL_ALLOWLIST=foo@bar.no,baz@qux.no
 */
export function parseAdminEmailsFromEnv(): string[] {
  const raw = process.env.ADMIN_EMAIL_ALLOWLIST?.trim();
  if (!raw) return [];
  return raw
    .split(",")
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);
}

/** Full liste for server: innebygget fallback + env. */
export function getServerAdminEmailAllowlist(): string[] {
  const fromEnv = parseAdminEmailsFromEnv();
  return [
    ...new Set([
      ...ADMIN_EMAIL_FALLBACK.map((e) => e.toLowerCase()),
      ...fromEnv,
    ]),
  ];
}

export function isEmailOnServerAdminAllowlist(
  email: string | null | undefined,
): boolean {
  const n = normalizeAdminEmail(email);
  if (!n) return false;
  return getServerAdminEmailAllowlist().includes(n);
}
