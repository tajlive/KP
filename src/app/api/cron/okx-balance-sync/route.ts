/**
 * OKX Balance Sync — henter live balanse + åpne ordre fra OKX
 * for alle brukere med aktive nøkler, lagrer i okx_live_state.
 * KLA-300 (2026-08-12): OKX-saldo manglet DB-persistens.
 * Kjøres av pg_cron hvert 5. minutt.
 */

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { getOkxLiveBalance } from "@/lib/trading/okx-live";

export const runtime = "nodejs"; // decryptApiKey (Buffer) krever node-runtime
export const dynamic = "force-dynamic";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

export async function POST(request: NextRequest) {
  // Verifiser cron — støtter både x-api-key og Authorization: Bearer
  const authKey = request.headers.get("x-api-key");
  const bearer = request.headers.get("authorization")?.replace("Bearer ", "");
  const valid =
    authKey === process.env.CRON_SECRET || bearer === process.env.CRON_SECRET;
  if (!valid) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { data: users, error } = await supabase
      .from("user_okx_keys")
      .select("user_id")
      .eq("is_active", true);

    if (error) throw new Error(`DB: ${error.message}`);

    const results = [];
    for (const user of users || []) {
      try {
        // getOkxLiveBalance dekrypterer nøkler og kaller OKX API (read-only)
        const live = await getOkxLiveBalance(supabase, user.user_id);

        if (!live.connected) {
          results.push({
            userId: user.user_id,
            error: "OKX ikke tilkoblet eller API-feil",
          });
          continue;
        }

        const snapshot = {
          balanceUsdc: live.balanceUsdc,
          balanceNok: live.balanceNok,
          quoteCcy: live.quoteCcy,
          dailyPnl: live.dailyPnl,
          dailyPnlPct: live.dailyPnlPct,
          position: live.position,
          fetchedAt: new Date().toISOString(),
        };

        const { error: upsertErr } = await supabase
          .from("okx_live_state")
          .upsert(
            {
              user_id: user.user_id,
              snapshot,
              total_usdc: Math.round(live.balanceUsdc * 100) / 100,
              total_nok: live.balanceNok,
              open_orders: 0,
              open_buy_orders: 0,
              open_sell_orders: 0,
              realized_profit_usdc: 0,
              daily_pnl_usdc: live.dailyPnl,
              daily_pnl_pct: live.dailyPnlPct,
              base_holdings: {},
              updated_at: new Date().toISOString(),
            },
            { onConflict: "user_id" },
          );

        if (upsertErr) throw new Error(`Upsert: ${upsertErr.message}`);
        results.push({
          userId: user.user_id,
          totalUsdc: Math.round(live.balanceUsdc * 100) / 100,
        });
      } catch (e) {
        results.push({
          userId: user.user_id,
          error: e instanceof Error ? e.message : "unknown",
        });
      }
    }

    return NextResponse.json({
      success: true,
      synced: results.length,
      results,
    });
  } catch (error) {
    console.error("OKX balance sync error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Sync failed" },
      { status: 500 },
    );
  }
}
