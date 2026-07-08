/**
 * Paper Trading with Tier Enforcement
 * 
 * Creates or updates paper accounts with tier-based limits.
 * Admin can override via /api/admin/give-paper.
 */

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { enforcePaperTradingCap } from "@/lib/pricing/tier-enforcement";

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const { amount } = await request.json();
    const enforcement = await enforcePaperTradingCap(supabase, user.id, amount);

    if (!enforcement.allowed) {
      return NextResponse.json({ error: enforcement.reason, tier: enforcement.tier, limit: enforcement.limit }, { status: 403 });
    }

    // Create or update paper account
    const { data: existing } = await supabase
      .from("paper_accounts")
      .select("id, current_balance")
      .eq("user_id", user.id)
      .single();

    if (existing) {
      await supabase
        .from("paper_accounts")
        .update({ current_balance: existing.current_balance + (amount || 0) })
        .eq("user_id", user.id);
    } else {
      await supabase
        .from("paper_accounts")
        .insert({ user_id: user.id, initial_balance: amount || 100000, current_balance: amount || 100000, total_profit_loss: 0 });
    }

    return NextResponse.json({ success: true, tier: enforcement.tier, limit: enforcement.limit });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
