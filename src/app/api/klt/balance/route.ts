import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ success: false, error: "Ikke autentisert" }, { status: 401 });
    }

    // KLA-auth: kltbalances er konsolidert inn i user_klt_balances
    // (2026-07-25, legacy-tabell renamet til kltbalances_deprecated).
    const { data, error } = await supabase
      .from("user_klt_balances")
      .select("balance, total_earned, total_spent")
      .eq("user_id", user.id)
      .maybeSingle();

    if (error) {
      return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      data: data ?? { balance: 500, total_earned: 500, total_spent: 0 },
    });
  } catch (err) {
    return NextResponse.json({ success: false, error: String(err) }, { status: 500 });
  }
}
