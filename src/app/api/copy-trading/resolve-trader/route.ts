// GET — map rå nøkkel (profil-id, auth-id, leaderboard_bots.id) → auth.users id for UI/RLS.

import { NextRequest, NextResponse } from "next/server";
import { withAuth } from "@/lib/api-auth";
import { createClient } from "@/lib/supabase/server";
import { resolveLeaderAuthId } from "@/lib/copy-trading/resolve-leader";
import { z } from "zod";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const QuerySchema = z.object({
  raw: z.string().uuid(),
});

export const GET = withAuth(async (req: NextRequest, _ctx) => {
  const parsed = QuerySchema.safeParse({
    raw: req.nextUrl.searchParams.get("raw") ?? "",
  });
  if (!parsed.success) {
    return NextResponse.json({ error: "Ugyldig raw (uuid)" }, { status: 400 });
  }

  const db = createClient();
  const resolved = await resolveLeaderAuthId(db, parsed.data.raw);
  if (!resolved) {
    return NextResponse.json({ error: "Trader ikke funnet" }, { status: 404 });
  }

  return NextResponse.json({
    authUserId: resolved.authUserId,
    displayName: resolved.displayName,
  });
});
