/**
 * Supabase @supabase/ssr lagrer sesjon i cookies som `sb-<ref>-auth-token` (evt. chunk `.0`, `.1`, …).
 * `NEXT_LOCALE` alene er ikke en innloggingssesjon — uten dette henger f.eks. POST /api/paper-trading/execute.
 */
export function hasSupabaseSessionCookies(
  cookies: { name: string }[],
): boolean {
  return cookies.some(
    (c) => c.name.startsWith("sb-") && c.name.includes("auth-token"),
  );
}
