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
    const { email, tier } = await request.json();

    if (!email || !tier) {
      return NextResponse.json({ error: "Missing email or tier" }, { status: 400 });
    }

    const validTiers = ["student", "bachelor", "master", "phd", "professor"];
    if (!validTiers.includes(tier)) {
      return NextResponse.json({ error: "Invalid tier" }, { status: 400 });
    }

    // Find user by email in profiles
    const { data: profile, error: findError } = await supabase
      .from("profiles")
      .select("id, email, subscription_tier")
      .eq("email", email)
      .single();

    if (findError || !profile) {
      return NextResponse.json({ error: "Bruker ikke funnet" }, { status: 404 });
    }

    // Update tier
    const { error: updateError } = await supabase
      .from("profiles")
      .update({
        subscription_tier: tier,
        subscription_status: "active",
        trial_started_at: null,
        trial_ends_at: null,
      })
      .eq("email", email);

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      message: `${email} er nå ${tier}`,
    });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
