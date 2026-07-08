import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

const ADMIN_EMAIL = "tomarnejensen@gmail.com";

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user || user.email !== ADMIN_EMAIL) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  try {
    const { email, amount } = await request.json();

    if (!email || !amount || amount < 0) {
      return NextResponse.json({ error: "Missing email or invalid amount" }, { status: 400 });
    }

    // Find user's auth id from profiles
    const { data: profile, error: findError } = await supabase
      .from("profiles")
      .select("id, email")
      .eq("email", email)
      .single();

    if (findError || !profile) {
      return NextResponse.json({ error: "Bruker ikke funnet" }, { status: 404 });
    }

    // Update or create paper account
    const { data: existing } = await supabase
      .from("paper_accounts")
      .select("id, current_balance")
      .eq("user_id", profile.id)
      .single();

    if (existing) {
      const { error } = await supabase
        .from("paper_accounts")
        .update({
          current_balance: existing.current_balance + amount,
          initial_balance: existing.current_balance + amount > existing.current_balance + 100000 
            ? existing.current_balance + amount 
            : 100000,
        })
        .eq("user_id", profile.id);

      if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    } else {
      const { error } = await supabase
        .from("paper_accounts")
        .insert({
          user_id: profile.id,
          initial_balance: Math.max(100000, amount),
          current_balance: amount,
          total_profit_loss: 0,
        });

      if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      message: `${amount.toLocaleString("no")} kr gitt til ${email}`,
    });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
