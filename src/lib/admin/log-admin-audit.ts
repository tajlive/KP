import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database, Json } from "@/types/supabase-generated";

export type AdminAuditAction = "user_paper_balance" | "user_tier" | string;

/**
 * Append-only sporbarhet for admin-handlinger (service role).
 * Tabell: `admin_audit_log` (migrasjon `20260321120000_admin_audit_log.sql`).
 * Etter `npm run db:gen-types` kan insert types strammes inn.
 */
export async function logAdminAudit(
  db: SupabaseClient<Database>,
  row: {
    admin_user_id: string;
    action: AdminAuditAction;
    target_user_id?: string | null;
    payload?: Record<string, unknown>;
  },
): Promise<void> {
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- tabell legges til i genererte typer etter db:gen-types
    const { error } = await (db as any).from("admin_audit_log").insert({
      admin_user_id: row.admin_user_id,
      action: row.action,
      target_user_id: row.target_user_id ?? null,
      payload: (row.payload ?? {}) as Json,
    });
    if (error) {
      console.warn("[logAdminAudit] insert failed:", error.message);
    }
  } catch (e) {
    console.warn("[logAdminAudit]", e);
  }
}
