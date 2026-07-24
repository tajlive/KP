import "server-only";

import { isEmailOnServerAdminAllowlist } from "@/lib/admin/admin-allowlist.server";
import type { SupabaseClient, User } from "@supabase/supabase-js";

/**
 * KLA-auth admin-guard: getUser fra httpOnly-cookie + e-post-allowlist.
 * Brukes av alle /api/admin/*-ruter slik at browser-supabase (alltid anon)
 * aldri trengs for admin-data.
 */
export async function requireAdmin(): Promise<
  | { ok: true; supabase: SupabaseClient; user: User }
  | { ok: false; status: 401 | 403 }
> {
  const { createServerClient } = await import("@/lib/supabase/server");
  const supabase = await createServerClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) return { ok: false, status: 401 };
  if (!isEmailOnServerAdminAllowlist(user.email)) {
    return { ok: false, status: 403 };
  }
  return { ok: true, supabase: supabase as unknown as SupabaseClient, user };
}
