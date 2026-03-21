/**
 * Admin e-post — delt mellom klient (kun fallback) og server (fallback + env).
 * Env `ADMIN_EMAIL_ALLOWLIST` parses kun på server (se `admin-allowlist.server.ts`).
 */

export const ADMIN_EMAIL_FALLBACK = [
  "tomarnejensen@gmail.com",
  "admin@klarpakke.no",
  "post@klarpakke.no",
  "tom@klarpakke.no",
] as const;

export function normalizeAdminEmail(email: string | null | undefined): string {
  return (email ?? "").trim().toLowerCase();
}

export function isEmailInAdminFallbackList(
  email: string | null | undefined,
): boolean {
  const n = normalizeAdminEmail(email);
  return ADMIN_EMAIL_FALLBACK.some((e) => e === n);
}
