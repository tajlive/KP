import "server-only";

import { isEmailOnServerAdminAllowlist } from "@/lib/admin/admin-allowlist.server";
import { createClient, type SupabaseClient, type User } from "@supabase/supabase-js";

/**
 * KLA-auth admin-guard: identitet verifiseres via getUser (httpOnly-cookie)
 * + e-post-allowlist. Data-spoerringer skjer deretter med SERVICE-ROLE-
 * klient — anon-klienten (bruker-JWT) ville laatt RLS filtrere bort
 * andre brukeres rader, slik at admin-lister ble stille ufullstendige.
 */
export async function requireAdmin(): Promise<
  | { ok: true; supabase: SupabaseClient; user: User }
  | { ok: false; status: 401 | 403 | 503 }
> {
  // 1. Verifiser innlogget bruker via cookie-basert klient
  const { createServerClient } = await import("@/lib/supabase/server");
  const authClient = await createServerClient();
  const {
    data: { user },
    error,
  } = await authClient.auth.getUser();

  if (error || !user) return { ok: false, status: 401 };
  if (!isEmailOnServerAdminAllowlist(user.email)) {
    return { ok: false, status: 403 };
  }

  // 2. Service-role-klient for data (omgår RLS etter eksplisitt admin-sjekk)
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) return { ok: false, status: 503 };

  const supabase = createClient(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  return { ok: true, supabase, user };
}
