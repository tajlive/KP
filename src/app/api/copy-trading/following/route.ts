// GET — autoritativ liste over copy-follows med leder-profil (service role + session).

import { NextRequest, NextResponse } from "next/server";
import { withAuth } from "@/lib/api-auth";
import { createClient } from "@/lib/supabase/server";
import type { Database } from "@/types/database.types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type FollowRow = Database["public"]["Tables"]["copy_trading_follows"]["Row"];
type ExternalFollowRow = Database["public"]["Tables"]["copy_trading_external_follows"]["Row"];

export type FollowingTraderDto = {
  id: string;
  leaderId: string;
  leaderName: string;
  leaderAvatar: string | null;
  maxAllocationNok: number;
  sizingMode: "fixed" | "proportional";
  maxLeverage: number;
  autoStopDrawdownPct: number;
  isActive: boolean;
  pnlNok: number;
  activeCopies: number;
  followedAt: string;
};

export const GET = withAuth(async (_req: NextRequest, { user }) => {
  try {
    const db = createClient();

    const { data: rows, error } = await db
      .from("copy_trading_follows")
      .select("*")
      .eq("follower_id", user.id)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("[copy-trading/following] query:", error.message);
      return NextResponse.json(
        { error: "Kunne ikke hente copy-trading" },
        { status: 500 },
      );
    }

    const list = (rows ?? []) as FollowRow[];
    const leaderIds = [
      ...new Set(list.map((r) => r.leader_id).filter(Boolean)),
    ] as string[];

    const profileByAuthId = new Map<
      string,
      { display_name: string | null; avatar_url: string | null }
    >();

    if (leaderIds.length > 0) {
      const { data: profs } = await db
        .from("user_profiles")
        .select("user_id, display_name")
        .in("user_id", leaderIds);

      for (const p of profs ?? []) {
        if (p.user_id) {
          profileByAuthId.set(p.user_id, {
            display_name: p.display_name,
            avatar_url: null,
          });
        }
      }

      const { data: traderPub } = await db
        .from("trader_profiles")
        .select("user_id, display_name")
        .in("user_id", leaderIds)
        .eq("is_public", true);

      for (const p of traderPub ?? []) {
        if (!p.user_id) continue;
        const cur = profileByAuthId.get(p.user_id);
        const name = p.display_name?.trim();
        if (name && !cur?.display_name?.trim()) {
          profileByAuthId.set(p.user_id, {
            display_name: p.display_name,
            avatar_url: cur?.avatar_url ?? null,
          });
        }
      }

      const { data: bots } = await db
        .from("leaderboard_bots")
        .select("user_id, display_name")
        .in("user_id", leaderIds);

      for (const b of bots ?? []) {
        if (!b.user_id) continue;
        const bn = b.display_name?.trim();
        if (!bn) continue;
        const cur = profileByAuthId.get(b.user_id);
        if (
          !cur?.display_name?.trim() ||
          cur.display_name.trim() === "Trader"
        ) {
          profileByAuthId.set(b.user_id, {
            display_name: bn,
            avatar_url: cur?.avatar_url ?? null,
          });
        }
      }
    }

    const following: FollowingTraderDto[] = list.map((row) => {
      const prof = profileByAuthId.get(row.leader_id);
      const maxRaw = row.max_trade_amount;
      const maxNok =
        typeof maxRaw === "number"
          ? maxRaw
          : maxRaw != null
            ? Number(maxRaw)
            : 10_000;
      const alloc = row.allocation_percent ?? 0;
      const scale = row.scale_factor ?? 0;
      const proportional = alloc > 0 && scale > 0;

      return {
        id: row.id,
        leaderId: row.leader_id,
        leaderName: prof?.display_name?.trim() || "Trader",
        leaderAvatar: prof?.avatar_url ?? null,
        maxAllocationNok: Number.isFinite(maxNok) ? maxNok : 10_000,
        sizingMode: proportional ? "proportional" : "fixed",
        maxLeverage: 5,
        autoStopDrawdownPct: 20,
        isActive: row.is_active !== false,
        pnlNok: 0,
        activeCopies: 0,
        followedAt: row.created_at,
      };
    });

    // Also fetch external follows
    const { data: externalRows } = await db
      .from("copy_trading_external_follows")
      .select("id, external_leader_id, scale_factor, allocation_percent, max_trade_amount, is_active, created_at")
      .eq("follower_id", user.id)
      .eq("is_active", true)
      .order("created_at", { ascending: false });

    const externalFollows = (externalRows || []).map((row) => ({
      id: row.id,
      external_leader_id: row.external_leader_id,
      scale_factor: row.scale_factor,
      allocation_percent: row.allocation_percent,
      max_trade_amount: row.max_trade_amount,
      is_active: row.is_active,
      created_at: row.created_at,
    }));

    return NextResponse.json({
      following,
      external: externalFollows,
      source: "api" as const,
    });
  } catch (e) {
    console.error("[copy-trading/following]", e);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
});
