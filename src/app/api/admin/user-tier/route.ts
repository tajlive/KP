import { verifyAdminAccess } from "@/lib/admin/verify-admin-access";
import { createClient as createServiceClient } from "@/lib/supabase/server";
import { logAdminAudit } from "@/lib/admin/log-admin-audit";
import type { Database } from "@/types/database.types";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

type SubscriptionTier = Database["public"]["Enums"]["subscription_tier"];

export const dynamic = "force-dynamic";

const tierSchema = z.enum([
  "free",
  "student",
  "bachelor",
  "master",
  "phd",
  "professor",
]);

const bodySchema = z.object({
  user_id: z.string().uuid(),
  tier: tierSchema,
});

/**
 * Admin: sett abonnementsnivå (user_profiles.tier).
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

  const { user_id, tier } = parsed.data;

  if (user_id === auth.userId) {
    return NextResponse.json(
      { error: "Cannot change your own tier via this endpoint" },
      { status: 400 },
    );
  }

  try {
    const db = createServiceClient();
    const now = new Date().toISOString();

    const { data: exists, error: findErr } = await db
      .from("user_profiles")
      .select("id")
      .eq("id", user_id)
      .maybeSingle();

    if (findErr || !exists) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const { data: before } = await db
      .from("user_profiles")
      .select("tier")
      .eq("id", user_id)
      .maybeSingle();

    const { error: upErr } = await db
      .from("user_profiles")
      .update({
        tier: tier as SubscriptionTier,
        updated_at: now,
      })
      .eq("id", user_id);

    if (upErr) {
      console.error("[admin user-tier]", upErr);
      return NextResponse.json({ error: upErr.message }, { status: 400 });
    }

    await logAdminAudit(db, {
      admin_user_id: auth.userId,
      action: "user_tier",
      target_user_id: user_id,
      payload: {
        previous_tier: before?.tier ?? null,
        new_tier: tier,
      },
    });

    return NextResponse.json({ ok: true, user_id, tier });
  } catch (e) {
    console.error("[admin user-tier]", e);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
