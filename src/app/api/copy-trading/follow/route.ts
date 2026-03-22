// POST — start kopiering av leder (kanonisk auth.uid for RLS + FK mot auth.users).

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { withAuth } from "@/lib/api-auth";
import { FollowLeaderSchema } from "@/lib/schemas";
import { resolveLeaderAuthId } from "@/lib/copy-trading/resolve-leader";
import { maxActiveCopyFollowsForTier } from "@/lib/copy-trading/max-follows";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function loadSubscriberTier(
  db: ReturnType<typeof createClient>,
  authUserId: string,
): Promise<string | null> {
  const { data: byUserId } = await db
    .from("user_profiles")
    .select("tier")
    .eq("user_id", authUserId)
    .maybeSingle();
  if (byUserId?.tier) {
    return byUserId.tier;
  }
  const { data: byPk } = await db
    .from("user_profiles")
    .select("tier")
    .eq("id", authUserId)
    .maybeSingle();
  return byPk?.tier ?? null;
}

export const POST = withAuth(async (req: NextRequest, { user }) => {
  try {
    const body = await req.json();
    const parsed = FollowLeaderSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid input", details: parsed.error.flatten() },
        { status: 400 },
      );
    }

    const {
      leader_id: rawLeaderId,
      scale_factor,
      max_trade_size,
      allocation_percent,
    } = parsed.data;
    const db = createClient();

    const tier = await loadSubscriberTier(db, user.id);
    if (tier === null) {
      return NextResponse.json({ error: "Profile not found" }, { status: 404 });
    }

    const limit = maxActiveCopyFollowsForTier(tier);
    if (limit === 0) {
      return NextResponse.json(
        {
          error: "Copy trading requires a paid subscription",
          code: "TIER_REQUIRED",
          required_tier: "bachelor",
        },
        { status: 402 },
      );
    }

    const { count: currentFollows } = await db
      .from("copy_trading_follows")
      .select("*", { count: "exact", head: true })
      .eq("follower_id", user.id)
      .eq("is_active", true);

    if ((currentFollows ?? 0) >= limit) {
      return NextResponse.json(
        {
          error: `You can follow max ${limit} leader(s) on your plan.`,
          code: "FOLLOW_LIMIT_REACHED",
          current: currentFollows,
          limit,
        },
        { status: 402 },
      );
    }

    const leader = await resolveLeaderAuthId(db, rawLeaderId);
    if (!leader) {
      return NextResponse.json({ error: "Leader not found" }, { status: 404 });
    }

    if (leader.authUserId === user.id) {
      return NextResponse.json(
        { error: "Cannot follow yourself" },
        { status: 400 },
      );
    }

    const { data: follow, error } = await db
      .from("copy_trading_follows")
      .upsert(
        {
          follower_id: user.id,
          leader_id: leader.authUserId,
          scale_factor: scale_factor ?? 1.0,
          allocation_percent: allocation_percent ?? 10,
          max_trade_amount: max_trade_size ?? null,
          is_active: true,
        },
        { onConflict: "follower_id,leader_id" },
      )
      .select()
      .single();

    if (error) {
      console.error("[copy-trading/follow] upsert:", error.message);
      return NextResponse.json(
        { error: "Failed to follow leader" },
        { status: 500 },
      );
    }

    try {
      await db.from("notification_queue").insert({
        user_id: user.id,
        type: "copy_started",
        payload: {
          leader_name: leader.displayName,
          leader_id: leader.authUserId,
          scale_factor,
        },
      });
    } catch (notifyErr) {
      console.warn("[copy-trading/follow] notification_queue:", notifyErr);
    }

    return NextResponse.json({ follow }, { status: 201 });
  } catch (err) {
    console.error("Unexpected error in follow:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
});
