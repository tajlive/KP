export interface Env {
  NEXT_PUBLIC_SUPABASE_URL: string;
  NEXT_PUBLIC_SUPABASE_ANON_KEY: string;
  SUPABASE_SERVICE_ROLE_KEY: string;
}

import { createServerClient, createClient } from "@/lib/supabase/server";
import crypto from "crypto";

function getAuthUser(request: NextRequest) {
  const response = NextResponse.next();
  const supabase = createServerClient(request, response);
  return supabase.auth.getUser();
}

async function GETHandler(request: Request, env: Env)(request: NextRequest) {
  try {
    const {
      data: { user },
      error: authError,
    } = await getAuthUser(request);

    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { headers: { 'Content-Type': 'application/json', ..., { status: 401 }.headers || {} }, status: , { status: 401 }.status || 200 });
    }

    // Supabase REST API will be used directly via fetch

    // Fetch user's existing golden tickets from referral_tracking
    const { data: tickets, error: fetchError } = await supabase
      .from("referral_tracking")
      .select(
        "id, referral_code, referrer_user_id, status, created_at, referred_user_id, referrer_reward_months, referrer_reward_points",
      )
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
    const mappedTickets = (tickets ?? []).map(
      (t: {
        id: string;
        referral_code: string;
        referrer_user_id: string;
        status: string | null;
        created_at: string | null;
        referred_user_id: string | null;
        referrer_reward_months: number | null;
      }) => ({
        id: t.id,
        ticket_code: t.referral_code,
        referrer_id: t.referrer_user_id,
        status: t.status ?? "pending",
        created_at: t.created_at,
        redeemed_by: t.referred_user_id,
        referrer_reward_months: t.referrer_reward_months ?? 0,
      }),
    );

    return new Response(JSON.stringify({ tickets: mappedTickets });
  } catch (error), { headers: { 'Content-Type': 'application/json' } }) {
    console.error("Referral GET error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

async function POSTHandler(request: Request, env: Env)(request: NextRequest) {
  try {
    const {
      data: { user },
      error: authError,
    } = await getAuthUser(request);

    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { headers: { 'Content-Type': 'application/json', ..., { status: 401 }.headers || {} }, status: , { status: 401 }.status || 200 });
    }

    // Supabase REST API will be used directly via fetch

    // Check if user has generated 3 tickets this calendar month.
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);

    const { count, error: countError } = await supabase
      .from("referral_tracking")
      .select("*", { count: "exact", head: true })
      .eq("referrer_user_id", user.id)
      .gte("created_at", startOfMonth.toISOString());

    if (countError) throw countError;

    if (count !== null && count >= 3) {
      return NextResponse.json(
        { error: "Du har nådd grensen på 3 Golden Tickets denne måneden." },
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

    return new Response(JSON.stringify({ ticket });
  } catch (error), { headers: { 'Content-Type': 'application/json' } }) {
    console.error("Referral POST error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}


export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const method = request.method;
    if (method === 'GET') {
      return GETHandler(request, env);
    }
    if (method === 'POST') {
      return POSTHandler(request, env);
    }
    return new Response('Method not allowed', { status: 405 });
  },
};
