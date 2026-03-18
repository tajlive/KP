/**
 * Admin API: Sync missing users from auth.users to user_profiles
 *
 * Brukere som finnes i auth men mangler i user_profiles (f.eks. hrmonsen)
 * får opprettet profil slik at de vises i admin-brukerlisten.
 */

import { createClient } from "@supabase/supabase-js";
import { createClient as createServerClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

const ADMIN_EMAILS = ["tomarnejensen@gmail.com", "admin@klarpakke.no"];

function getSupabaseAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

async function verifyAdmin(request: NextRequest) {
  const authClient = await createServerClient();
  const {
    data: { user },
  } = await authClient.auth.getUser();
  if (!user)
    return { isAdmin: false as const, error: "Unauthorized", status: 401 };
  const isWhitelisted = ADMIN_EMAILS.includes(user.email || "");
  const { data: profile } = await authClient
    .from("user_profiles")
    .select("role")
    .eq("id", user.id)
    .single();
  if (!isWhitelisted && profile?.role !== "admin")
    return {
      isAdmin: false as const,
      error: "Forbidden: Admin required",
      status: 403,
    };
  return { isAdmin: true as const, user };
}

/**
 * POST: Sync auth.users → user_profiles for alle som mangler profil
 */
export async function POST(request: NextRequest) {
  const adminCheck = await verifyAdmin(request);
  if (!adminCheck.isAdmin) {
    return NextResponse.json(
      { error: adminCheck.error },
      { status: adminCheck.status },
    );
  }

  const supabase = getSupabaseAdminClient();
  if (!supabase) {
    return NextResponse.json(
      { error: "Admin client not configured" },
      { status: 503 },
    );
  }

  try {
    const existingProfileIds = new Set<string>();
    const { data: profiles } = await supabase
      .from("user_profiles")
      .select("id");
    if (profiles) {
      (profiles as { id: string }[]).forEach((p) =>
        existingProfileIds.add(p.id),
      );
    }

    let page = 1;
    const perPage = 1000;
    const toUpsert: Array<{
      id: string;
      email: string;
      full_name: string | null;
      role: string;
      subscription_tier: string;
      subscription_status: string;
      created_at: string;
      updated_at: string;
      user_id?: string;
    }> = [];

    while (true) {
      const { data: listData, error: listError } =
        await supabase.auth.admin.listUsers({
          page,
          perPage,
        });
      if (listError) {
        console.error("[Admin Users Sync] listUsers error:", listError);
        return NextResponse.json({ error: listError.message }, { status: 400 });
      }
      const users = listData.users;
      if (!users?.length) break;

      for (const u of users) {
        const authId = u.id;
        if (existingProfileIds.has(authId)) continue;
        const fullName =
          (u.user_metadata?.full_name as string) ||
          (u.user_metadata?.name as string) ||
          (u.email?.split("@")[0] ?? "Trader");
        toUpsert.push({
          id: authId,
          email: u.email ?? "",
          full_name: fullName,
          role: "user",
          subscription_tier: "student",
          subscription_status: "inactive",
          created_at: u.created_at ?? new Date().toISOString(),
          updated_at: new Date().toISOString(),
        });
        existingProfileIds.add(authId);
      }
      if (users.length < perPage) break;
      page++;
    }

    let synced = 0;
    const errors: string[] = [];

    for (const row of toUpsert) {
      const { error } = await supabase.from("user_profiles").upsert(
        {
          id: row.id,
          email: row.email,
          full_name: row.full_name,
          role: row.role,
          subscription_tier: row.subscription_tier,
          subscription_status: row.subscription_status,
          created_at: row.created_at,
          updated_at: row.updated_at,
        },
        { onConflict: "id" },
      );
      if (error) {
        errors.push(`${row.email}: ${error.message}`);
        continue;
      }
      synced++;
    }

    return NextResponse.json({
      success: true,
      message: `Synkronisert ${synced} manglende brukere til user_profiles`,
      synced,
      total_missing: toUpsert.length,
      errors: errors.length ? errors.slice(0, 10) : undefined,
    });
  } catch (err) {
    console.error("[Admin Users Sync]:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Internal server error" },
      { status: 500 },
    );
  }
}
