/**
 * POST /api/copy-trading/external-follow
 * Følg / slutt å følge en Binance trader.
 */

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { withAuth } from "@/lib/api-auth";
import type { Database } from "@/types/database.types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const POST = withAuth(async (req: NextRequest, { user }) => {
  try {
    const body = (await req.json()) as {
      encrypted_uid?: string;
      action?: string;
      scale_factor?: number;
      allocation_percent?: number;
      max_trade_amount?: number | null;
    };
    const { encrypted_uid, action, scale_factor, allocation_percent, max_trade_amount } = body;

    if (!encrypted_uid || !action) {
      return NextResponse.json(
        { error: "Missing encrypted_uid or action" },
        { status: 400 },
      );
    }

    const db = createClient();

    if (action === "follow") {
      const { data, error } = await db
        .from("copy_trading_external_follows")
        .upsert(
          {
            follower_id: user.id,
            external_leader_id: encrypted_uid,
            leader_source: "kraken",
            scale_factor: scale_factor ?? 1.0,
            allocation_percent: allocation_percent ?? 10,
            max_trade_amount: max_trade_amount ?? null,
            is_active: true,
          } satisfies Partial<Database["public"]["Tables"]["copy_trading_external_follows"]["Insert"]>,
          { onConflict: "follower_id,external_leader_id" },
        )
        .select()
        .single();

      if (error) {
        console.error("[external-follow] upsert error:", error.message);
        return NextResponse.json({ error: "Failed to follow" }, { status: 500 });
      }

      return NextResponse.json({ follow: data }, { status: 201 });
    }

    if (action === "unfollow") {
      const { error } = await db
        .from("copy_trading_external_follows")
        .update({ is_active: false })
        .eq("follower_id", user.id)
        .eq("external_leader_id", encrypted_uid);

      if (error) {
        console.error("[external-follow] unfollow error:", error.message);
        return NextResponse.json({ error: "Failed to unfollow" }, { status: 500 });
      }

      return NextResponse.json({ ok: true });
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (err) {
    console.error("[external-follow] Unexpected error:", err);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
});
