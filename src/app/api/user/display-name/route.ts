import { createServerClient } from "@/lib/supabase/server";
import { createClient as createServiceClient } from "@/lib/supabase/server";
import {
  generateDisplayNameSuggestion,
  validateDisplayName,
} from "@/lib/user/display-name";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

export const dynamic = "force-dynamic";

const putSchema = z.object({
  display_name: z.string(),
});

/**
 * GET /api/user/display-name — hent eget kallenavn + et forslag
 * (forslaget brukes av onboarding-modalen på leaderboard).
 *
 * PUT /api/user/display-name — sett eget kallenavn (må være unikt).
 */
export async function GET() {
  const authClient = await createServerClient();
  const {
    data: { user },
  } = await authClient.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const db = createServiceClient();
  const { data: profile } = await db
    .from("user_profiles")
    .select("display_name")
    .eq("id", user.id)
    .maybeSingle();

  return NextResponse.json({
    display_name: profile?.display_name ?? null,
    suggestion: generateDisplayNameSuggestion(),
  });
}

export async function PUT(request: NextRequest) {
  const authClient = await createServerClient();
  const {
    data: { user },
  } = await authClient.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let json: unknown;
  try {
    json = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = putSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "Validation failed" }, { status: 400 });
  }

  const validation = validateDisplayName(parsed.data.display_name);
  if (!validation.ok) {
    return NextResponse.json({ error: validation.error }, { status: 400 });
  }

  const db = createServiceClient();

  // Unikhet (case-insensitive) — display_name vises på offentlig leaderboard
  const { data: clash } = await db
    .from("user_profiles")
    .select("id")
    .ilike("display_name", validation.value)
    .neq("id", user.id)
    .limit(1)
    .maybeSingle();

  if (clash) {
    return NextResponse.json(
      { error: `Kallenavnet «${validation.value}» er allerede i bruk` },
      { status: 409 },
    );
  }

  const { error: upErr } = await db
    .from("user_profiles")
    .update({
      display_name: validation.value,
      updated_at: new Date().toISOString(),
    })
    .eq("id", user.id);

  if (upErr) {
    console.error("[user display-name]", upErr);
    return NextResponse.json({ error: upErr.message }, { status: 400 });
  }

  return NextResponse.json({ ok: true, display_name: validation.value });
}
