/**
 * GET /api/kraken/live-state — brukerens synkroniserte Kraken-data (eget kall)
 * Brukes av UI-kort på dashboard/handel. Kun egen rad (RLS).
 */

import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data, error } = await supabase
    .from("kraken_live_state")
    .select("snapshot, total_usdc, open_orders, open_buy_orders, open_sell_orders, realized_profit_usdc, base_holdings, updated_at")
    .eq("user_id", user.id)
    .maybeSingle();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  if (!data) {
    return NextResponse.json({ connected: false });
  }

  return NextResponse.json({ connected: true, ...data });
}
