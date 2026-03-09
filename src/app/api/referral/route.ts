import { createClient } from "@/lib/supabase/server";
import crypto from "crypto";
import { NextResponse } from "next/server";

// Response type for tickets
interface GoldenTicket {
  id: string;
  referral_code: string;
  referrer_user_id: string;
  status: string | null;
  created_at: string | null;
  referred_user_id: string | null;
}

export async function GET() {
  try {
    const supabase = (await createClient()) as unknown;
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Fetch user's existing golden tickets from referral_tracking
    const { data: tickets, error: fetchError } = await supabase
      .from("referral_tracking")
      .select("id, referral_code, referrer_user_id, status, created_at, referred_user_id")
      .eq("referrer_user_id", user.id)
      .order("created_at", { ascending: false });

    if (fetchError) {
      console.error("Fetch tickets error:", fetchError);
      return NextResponse.json(
        { error: "Failed to fetch tickets" },
        { status: 500 },
      );
    }

    // Map to expected format for backwards compatibility
    const mappedTickets = (tickets ?? []).map((t) => ({
      id: t.id,
      ticket_code: t.referral_code,
      referrer_id: t.referrer_user_id,
      status: t.status ?? "pending",
      created_at: t.created_at,
      redeemed_by: t.referred_user_id,
    }));

    return NextResponse.json({ tickets: mappedTickets });
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
    const supabase = (await createClient()) as unknown;
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check if user has generated 3 tickets this month.
    const { count, error: countError } = await supabase
      .from("referral_tracking")
      .select("*", { count: "exact", head: true })
      .eq("referrer_user_id", user.id);

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
      .from("referral_tracking")
      .insert({
        referrer_user_id: user.id,
        referral_code: ticketCode,
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

    // Map to expected format
    const ticket = {
      id: data.id,
      ticket_code: data.referral_code,
      referrer_id: data.referrer_user_id,
      status: data.status ?? "pending",
      created_at: data.created_at,
    };

    return NextResponse.json({ ticket });
  } catch (error) {
    console.error("Referral POST error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
