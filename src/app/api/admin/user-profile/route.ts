import { verifyAdminAccess } from "@/lib/admin/verify-admin-access";
import { createClient as createServiceClient } from "@/lib/supabase/server";
import { logAdminAudit } from "@/lib/admin/log-admin-audit";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

export const dynamic = "force-dynamic";

const displayNameSchema = z
  .string()
  .trim()
  .min(2, "Minst 2 tegn")
  .max(30, "Maks 30 tegn")
  .regex(
    /^[\p{L}\p{N} _-]+$/u,
    "Kun bokstaver, tall, mellomrom, bindestrek og understrek",
  );

const bodySchema = z.object({
  user_id: z.string().uuid(),
  full_name: z.string().trim().max(100).nullable().optional(),
  display_name: displayNameSchema.nullable().optional(),
});

/**
 * POST /api/admin/user-profile — admin redigerer brukerprofil.
 * Støtter full_name (internt navn) og display_name (offentlig kallenavn
 * for leaderboard/konkurranse). Tier endres via /api/admin/user-tier.
 */
export async function POST(request: NextRequest) {
  const auth = await verifyAdminAccess();
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  let json: unknown;
  try {
    json = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const { user_id, full_name, display_name } = parsed.data;

  if (full_name === undefined && display_name === undefined) {
    return NextResponse.json(
      { error: "Nothing to update — send full_name and/or display_name" },
      { status: 400 },
    );
  }

  try {
    const db = createServiceClient();
    const now = new Date().toISOString();

    const { data: before, error: findErr } = await db
      .from("user_profiles")
      .select("id, full_name, display_name")
      .eq("id", user_id)
      .maybeSingle();

    if (findErr || !before) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // display_name brukes på offentlig leaderboard — må være unik
    if (display_name != null) {
      const { data: clash } = await db
        .from("user_profiles")
        .select("id")
        .ilike("display_name", display_name)
        .neq("id", user_id)
        .limit(1)
        .maybeSingle();
      if (clash) {
        return NextResponse.json(
          { error: `Kallenavnet «${display_name}» er allerede i bruk` },
          { status: 409 },
        );
      }
    }

    const update: {
      updated_at: string;
      full_name?: string | null;
      display_name?: string;
    } = { updated_at: now };
    if (full_name !== undefined) update.full_name = full_name;
    // display_name er NOT NULL i DB — null betyr «tilbakestill til tom»
    if (display_name !== undefined) update.display_name = display_name ?? "";

    const { error: upErr } = await db
      .from("user_profiles")
      .update(update)
      .eq("id", user_id);

    if (upErr) {
      console.error("[admin user-profile]", upErr);
      return NextResponse.json({ error: upErr.message }, { status: 400 });
    }

    await logAdminAudit(db, {
      admin_user_id: auth.userId,
      action: "user_profile",
      target_user_id: user_id,
      payload: {
        previous_full_name: before.full_name ?? null,
        new_full_name: full_name !== undefined ? full_name : before.full_name,
        previous_display_name: before.display_name ?? null,
        new_display_name:
          display_name !== undefined ? display_name : before.display_name,
      },
    });

    return NextResponse.json({ ok: true, user_id });
  } catch (e) {
    console.error("[admin user-profile]", e);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
