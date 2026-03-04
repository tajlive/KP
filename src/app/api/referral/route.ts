import { createClient } from "@/lib/supabase/server";
import crypto from "crypto";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Fetch user's existing tickets
    const { data: tickets, error: fetchError } = await supabase
      .from("referrals")
      .select("*")
      .eq("referrer_id", user.id)
      .order("created_at", { ascending: false });

    if (fetchError) {
      console.error("Fetch tickets error:", fetchError);
      return NextResponse.json(
        { error: "Failed to fetch tickets" },
        { status: 500 },
      );
    }

    return NextResponse.json({ tickets });
  } catch (error) {
    console.error("Referral GET error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

export async function POST() {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check if user has generated 3 tickets this month.
    // MVP: Check total tickets for simplicity. We can add a date filter later.
    const { count, error: countError } = await supabase
      .from("referrals")
      .select("*", { count: "exact" })
      .eq("referrer_id", user.id);

    if (countError) throw countError;

    if (count !== null && count >= 3) {
      return NextResponse.json(
        { error: "You have reached your limit of 3 Golden Tickets." },
        { status: 403 },
      );
    }

    // Generate unique code. GOLD-XXXX-XXXX
    const randomHex = crypto.randomBytes(4).toString("hex").toUpperCase();
    const ticketCode = `GOLD-${randomHex.substring(0, 4)}-${randomHex.substring(4, 8)}`;

    const { data, error: insertError } = await supabase
      .from("referrals")
      .insert({
        referrer_id: user.id,
        ticket_code: ticketCode,
        status: "pending",
      })
      .select()
      .single();

    if (insertError) {
      console.error("Ticket creation error:", insertError);
      return NextResponse.json(
        { error: "Failed to generate ticket." },
        { status: 500 },
      );
    }

    return NextResponse.json({ ticket: data });
  } catch (error) {
    console.error("Referral POST error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
