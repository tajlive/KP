/**
 * GET /api/okx/live-state — brukerens synkroniserte OKX-data
 * (KLA-300, 2026-08-12). Leser okx_live_state — skrives av
 * /api/cron/okx-balance-sync hvert 5. min.
 * Auth: Supabase cookie eller Bearer JWT (withAuth).
 */

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { withAuth } from "@/lib/api-auth";

export const dynamic = "force-dynamic";

export const GET = withAuth(async (_request, { user }) => {
  const supabase = createClient();

  const { data, error } = await supabase
    .from("okx_live_state")
    .select(
      "snapshot, total_usdc, total_nok, open_orders, open_buy_orders, open_sell_orders, realized_profit_usdc, daily_pnl_usdc, daily_pnl_pct, base_holdings, updated_at",
    )
    .eq("user_id", user.id)
    .maybeSingle();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  if (!data) {
    return NextResponse.json({ connected: false });
  }

  return NextResponse.json({ connected: true, ...data });
});
