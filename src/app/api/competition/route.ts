import { createServerClient, createClient as createServiceClient } from "@/lib/supabase/server";
import { COMPETITION_ID } from "@/lib/competition";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

/**
 * GET /api/competition — påmeldingsstatus + deltakertall for aktiv konkurranse.
 * Åpen for anonyme (de får joined:false + deltakertall).
 *
 * POST /api/competition — meld innlogget bruker på aktiv konkurranse.
 * Idempotent: allerede påmeldt → 200 { joined: true }.
 */

async function getParticipantCount(db: ReturnType<typeof createServiceClient>): Promise<number> {
  try {
    const { data, error } = await db.rpc("competition_participant_count" as never, {
      p_competition_id: COMPETITION_ID,
    } as never);
    if (error) return 0;
    return typeof data === "number" ? data : 0;
  } catch {
    return 0; // best effort — tallet er nice-to-have
  }
}

export async function GET() {
  const authClient = await createServerClient();
  const {
    data: { user },
  } = await authClient.auth.getUser();

  const db = createServiceClient();
  const participants = await getParticipantCount(db);

  if (!user) {
    return NextResponse.json({ joined: false, participants });
  }

  const { data: entry } = await db
    .from("competition_entries" as never)
    .select("id")
    .eq("user_id", user.id)
    .eq("competition_id", COMPETITION_ID)
    .maybeSingle();

  return NextResponse.json({ joined: !!entry, participants });
}

export async function POST() {
  const authClient = await createServerClient();
  const {
    data: { user },
  } = await authClient.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const db = createServiceClient();
  const { error } = await db.from("competition_entries" as never).upsert(
    { user_id: user.id, competition_id: COMPETITION_ID } as never,
    { onConflict: "user_id,competition_id", ignoreDuplicates: true },
  );

  if (error) {
    return NextResponse.json({ error: "Could not join" }, { status: 500 });
  }

  const participants = await getParticipantCount(db);
  return NextResponse.json({ joined: true, participants });
}
