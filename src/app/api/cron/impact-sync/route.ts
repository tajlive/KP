/**
 * Impact Sync — henter affiliate-data (Actions + Campaigns) fra impact.com
 * og lagrer i affiliate_sync (jsonb). Kjøres av pg_cron (f.eks. hver time).
 *
 * Kill switch: IMPACT_SYNC_ENABLED !== "true" → 503 (default off).
 */

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

export async function POST(request: NextRequest) {
  if (process.env.IMPACT_SYNC_ENABLED !== "true") {
    return NextResponse.json(
      { error: "Impact sync disabled", reason: "IMPACT_SYNC_ENABLED != true" },
      { status: 503 },
    );
  }

  const authKey = request.headers.get("x-api-key");
  const bearer = request.headers.get("authorization")?.replace("Bearer ", "");
  if (authKey !== process.env.CRON_SECRET && bearer !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: "Uautorisert" }, { status: 401 });
  }

  try {
    // Dynamisk import — impact-klienten leser env-variabler ved kall-tid
    const { getImpactActions, getImpactCampaigns } = await import(
      "@/lib/impact/impact-client"
    );

    const [actions, campaigns] = await Promise.all([
      getImpactActions({ limit: 100 }).catch((e) => ({
        error: e instanceof Error ? e.message : String(e),
      })),
      getImpactCampaigns().catch((e) => ({
        error: e instanceof Error ? e.message : String(e),
      })),
    ]);

    const actionList = Array.isArray(actions) ? actions : [];
    const campaignList = Array.isArray(campaigns) ? campaigns : [];
    const approved = actionList.filter((a) => a.Status === "APPROVED");
    const totalPayout = approved.reduce(
      (sum, a) => sum + (parseFloat(String(a.Payout ?? "0")) || 0),
      0,
    );

    const summary = {
      actionCount: actionList.length,
      campaignCount: campaignList.length,
      approvedCount: approved.length,
      totalPayout,
      syncedAt: new Date().toISOString(),
    };

    const { error } = await supabase.from("affiliate_sync").insert({
      source: "impact",
      payload: { actions: actionList, campaigns: campaignList },
      summary,
      status: "ok",
    });

    if (error) {
      return NextResponse.json(
        { error: "DB insert failed", details: error.message },
        { status: 500 },
      );
    }

    return NextResponse.json({ success: true, summary });
  } catch (error) {
    return NextResponse.json(
      {
        error: "Impact sync failed",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 },
    );
  }
}
