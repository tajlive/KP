import { isEmailOnServerAdminAllowlist } from "@/lib/admin/admin-allowlist.server";
import { createServerClient } from "@/lib/supabase/server";

/** @deprecated Bruk `ADMIN_EMAIL_FALLBACK` / `getServerAdminEmailAllowlist` */
export const ADMIN_EMAIL_WHITELIST = [
  "tomarnejensen@gmail.com",
  "admin@klarpakke.no",
  "post@klarpakke.no",
  "tom@klarpakke.no",
] as const;

export type AdminAuthResult =
  | { ok: true; userId: string; email: string | undefined }
  | { ok: false; error: string; status: number };

/**
 * Verifiserer innlogget bruker som admin (rolle eller server allowlist inkl. env).
 * Bruk i server routes, server actions og API som leser `cookies()`.
 */
export async function verifyAdminAccess(): Promise<AdminAuthResult> {
  const authClient = await createServerClient();
  const {
    data: { user },
  } = await authClient.auth.getUser();

  if (!user) {
    return { ok: false, error: "Unauthorized", status: 401 };
  }

  const isWhitelisted = isEmailOnServerAdminAllowlist(user.email);

  const { data: profile } = await authClient
    .from("user_profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();

  if (!isWhitelisted && profile?.role !== "admin") {
    return {
      ok: false,
      error: "Forbidden: Admin access required",
      status: 403,
    };
  }

  return { ok: true, userId: user.id, email: user.email };
}
