import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database, Json } from "@/types/database.types";

type AdminAuditLogInsert = {
  admin_user_id: string;
  action: string;
  target_user_id?: string | null;
  payload: Json;
};

type DbWithAdminAudit = Database & {
  public: Database["public"] & {
    Tables: Database["public"]["Tables"] & {
      admin_audit_log: {
        Row: AdminAuditLogInsert & { id?: string; created_at?: string | null };
        Insert: AdminAuditLogInsert;
        Update: Partial<AdminAuditLogInsert>;
        Relationships: [];
      };
    };
  };
};

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
    const { error } = await (db as unknown as SupabaseClient<DbWithAdminAudit>)
      .from("admin_audit_log")
      .insert({
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
