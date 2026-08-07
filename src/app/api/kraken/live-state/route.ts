/**
 * GET /api/kraken/live-state — brukerens synkroniserte Kraken-data
 * Auth: Supabase cookie eller Bearer JWT (withAuth).
 */

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { withAuth } from "@/lib/api-auth";

export const GET = withAuth(async (_request, { user }) => {
  const supabase = createClient();

  const { data, error } = await supabase
    .from("kraken_live_state")
    .select(
      "snapshot, total_usdc, open_orders, open_buy_orders, open_sell_orders, realized_profit_usdc, base_holdings, updated_at",
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
