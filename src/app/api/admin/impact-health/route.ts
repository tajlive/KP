import { verifyAdminAccess } from "@/lib/admin/verify-admin-access";
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import {
  getImpactActions,
  getImpactCampaigns,
} from "@/lib/impact/impact-client";

export async function GET(_request: NextRequest) {
  const start = performance.now();

  try {
    const auth = await verifyAdminAccess();
    if (!auth.ok) {
      return NextResponse.json(
        {
          status: "error",
          message:
            auth.status === 401 ? "Ikke autentisert" : "Krever admin-tilgang",
          latencyMs: 0,
        },
        { status: auth.status },
      );
    }

    const supabase = createClient();

    const hasKeys =
      Boolean(process.env.IMPACT_ACCOUNT_SID) &&
      Boolean(process.env.IMPACT_AUTH_TOKEN);
    if (!hasKeys) {
      return NextResponse.json(
        {
          status: "error",
          message: "IMPACT_ACCOUNT_SID / IMPACT_AUTH_TOKEN mangler",
          latencyMs: Math.round(performance.now() - start),
        },
        { status: 500 },
      );
    }

    const [campaigns, actions, lastSync] = await Promise.all([
      getImpactCampaigns().catch((e) => ({
        error: e instanceof Error ? e.message : String(e),
      })),
      getImpactActions({ limit: 20 }).catch((e) => ({
        error: e instanceof Error ? e.message : String(e),
      })),
      supabase
        .from("affiliate_sync")
        .select("summary, status, created_at")
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle()
        .then(({ data }) => data),
    ]);

    const campaignsOk = !Array.isArray(campaigns) ? false : true;
    const actionsOk = !Array.isArray(actions) ? false : true;

    // Kommisjonsstatistikk fra godkjente/registrerte handlinger
    const actionList = Array.isArray(actions) ? actions : [];
    const approved = actionList.filter((a) => a.Status === "APPROVED");
    const totalPayout = approved.reduce(
      (sum, a) => sum + (parseFloat(String(a.Payout ?? "0")) || 0),
      0,
    );

    const lastSyncRow =
      lastSync && !("error" in lastSync) ? lastSync : undefined;

    return NextResponse.json({
      status: campaignsOk && actionsOk ? "ok" : "partial",
      message: campaignsOk
        ? `impact.com tilkoblet — ${Array.isArray(campaigns) ? campaigns.length : 0} programmer, ${actionList.length} handlinger`
        : "impact.com delvis feil",
      latencyMs: Math.round(performance.now() - start),
      details: {
        accountSid: String(process.env.IMPACT_ACCOUNT_SID).slice(0, 8) + "…",
        campaignCount: Array.isArray(campaigns) ? campaigns.length : 0,
        campaigns: Array.isArray(campaigns)
          ? campaigns.map((c) => ({
              id: c.Id,
              name: c.Name,
              status: c.ContractStatus,
            }))
          : undefined,
        actionCount: actionList.length,
        approvedActions: approved.length,
        totalApprovedPayout: totalPayout,
        lastSync: lastSyncRow
          ? {
              at: lastSyncRow.created_at,
              summary: lastSyncRow.summary,
            }
          : null,
        recentActions: actionList.slice(0, 10).map((a) => ({
          id: a.Id,
          type: a.ActionType,
          status: a.Status,
          date: a.EventDate,
          payout: a.Payout,
          currency: a.Currency,
          campaignId: a.CampaignId,
        })),
      },
      errors: {
        campaigns: Array.isArray(campaigns) ? undefined : campaigns,
        actions: Array.isArray(actions) ? undefined : actions,
        lastSync: lastSync && "error" in lastSync ? lastSync.error : undefined,
      },
    });
  } catch (error) {
    return NextResponse.json(
      {
        status: "error",
        message: error instanceof Error ? error.message : "Ukjent feil",
        latencyMs: Math.round(performance.now() - start),
      },
      { status: 500 },
    );
  }
}
