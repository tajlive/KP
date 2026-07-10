/**
 * Referral API
 *
 * GET: Hent brukerens referral-koder og statistikk (inviterte, bonus opptjent)
 * POST: Generer ny referral-kode, eller bruk en kode ved registrering (claim)
 */

import { NextRequest, NextResponse } from "next/server";
import {
  createServerClient,
  createClient,
} from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

async function getAuthUser(request: NextRequest) {
  const response = NextResponse.next();
  const supabase = createServerClient(request, response);
  const { data, error } = await supabase.auth.getUser();
  if (error || !data?.user) {
    return { user: null };
  }
  return { user: data.user };
}

function generateReferralCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "";
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

// ---------------------------------------------------------------------------
// GET — Hent brukerens referral-data
// ---------------------------------------------------------------------------

export async function GET(request: NextRequest) {
  try {
    const { user } = await getAuthUser(request);
    if (!user) {
      return NextResponse.json(
        { error: "Uautorisert", code: "AUTH_REQUIRED" },
        { status: 401 },
      );
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const db: any = createClient();

    // 1. Hent alle referral-koder for denne brukeren (både Golden Ticket og paper-bonus)
    const { data: referralTickets } = await db
      .from("referral_tracking")
      .select("*")
      .eq("referrer_user_id", user.id)
      .order("created_at", { ascending: false });

    const tickets = referralTickets || [];

    // 2. Hent brukerens profilinfo for referral-link
    const { data: profile } = await db
      .from("user_profiles")
      .select("user_number, display_name, paper_balance, referral_code")
      .eq("id", user.id)
      .maybeSingle();

    // 3. Hvis brukeren ikke har en permanent referral_code, opprett en
    let referralCode = profile?.referral_code;
    if (!referralCode) {
      referralCode = `KPAK${user.id.slice(0, 5).toUpperCase()}`;
      await db
        .from("user_profiles")
        .update({ referral_code: referralCode })
        .eq("id", user.id);
    }

    // 4. Statistikk
    const totalInvited = tickets.filter(
      (t: { status: string }) =>
        t.status === "signed_up" || t.status === "trial_completed" || t.status === "converted",
    ).length;

    const convertedCount = tickets.filter(
      (t: { status: string }) => t.status === "converted",
    ).length;

    // 5. Paper-bonus: summer alle utbetalte bonuser
    const totalBonusNok = tickets.reduce(
      (sum: number, t: { referrer_reward_nok?: number }) => sum + (t.referrer_reward_nok ?? 0),
      0,
    );

    // 6. Leaderboard — top 10 referrers denne måneden (for badge/leaderboard)
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);

    const { data: monthlyReferrals } = await db
      .from("referral_tracking")
      .select("referrer_user_id")
      .eq("status", "signed_up")
      .gte("signed_up_at", startOfMonth.toISOString());

    const monthlyCount = monthlyReferrals?.length ?? 0;

    // Top-referrer badge: top 3 this month
    const { data: topReferrers } = await db
      .rpc("get_top_referrers", { p_limit: 10 })
      .catch(() => null);

    return NextResponse.json({
      success: true,
      tickets,
      profileCode: referralCode,
      stats: {
        totalInvited,
        convertedCount,
        totalBonusNok,
        monthlyCount,
      },
      referralLink: `${process.env.NEXT_PUBLIC_SITE_URL || "https://www.klarpakke.no"}/innlogging?ref=${referralCode}`,
      topReferrers: topReferrers || [],
    });
  } catch (error) {
    console.error("[referral] GET error:", error);
    return NextResponse.json(
      { error: "Intern serverfeil" },
      { status: 500 },
    );
  }
}

// ---------------------------------------------------------------------------
// POST — Generer ny referral-kode (Golden Ticket) eller claim referral
// ---------------------------------------------------------------------------

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const { action, referral_code, referred_email } = body;

    // --- CLAIM: Bruk referral-kode ved registrering ---
    if (action === "claim" && referral_code) {
      // Dette kalles fra registreringsflyten — lagrer referral_code i metadata
      // Den faktiske oppdateringen skjer i handle_new_user_consolidated()-triggeren
      return NextResponse.json({
        success: true,
        message: "Referral-kode mottatt. Velkomstbonus vil bli utbetalt ved registrering.",
      });
    }

    // --- GENERATE: Opprett ny Golden Ticket / referral-kode ---
    const { user } = await getAuthUser(request);
    if (!user) {
      return NextResponse.json(
        { error: "Uautorisert", code: "AUTH_REQUIRED" },
        { status: 401 },
      );
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const db: any = createClient();

    // Sjekk maks antall aktive tickets
    const { count: activeCount } = await db
      .from("referral_tracking")
      .select("*", { count: "exact", head: true })
      .eq("referrer_user_id", user.id)
      .in("status", ["pending"]);

    const MAX_TICKETS = 3;
    if ((activeCount ?? 0) >= MAX_TICKETS) {
      return NextResponse.json(
        { error: `Du kan ha maks ${MAX_TICKETS} aktive billetter om gangen.` },
        { status: 400 },
      );
    }

    // Generer unik kode
    let code = generateReferralCode();
    let attempts = 0;
    while (attempts < 10) {
      const { data: existing } = await db
        .from("referral_tracking")
        .select("id")
        .eq("referral_code", code)
        .maybeSingle();
      if (!existing) break;
      code = generateReferralCode();
      attempts++;
    }

    const source = body.source || "direct";
    const landingPage = body.landing_page || "/";

    const { data: ticket } = await db
      .from("referral_tracking")
      .insert({
        referrer_user_id: user.id,
        referral_code: code,
        source,
        landing_page: landingPage,
        status: "pending",
        referrer_reward_months: 1, // Golden Ticket: 1 mnd gratis Master-tier
      })
      .select()
      .single();

    if (!ticket) {
      return NextResponse.json(
        { error: "Kunne ikke generere billett" },
        { status: 500 },
      );
    }

    return NextResponse.json({
      success: true,
      ticket,
    });
  } catch (error) {
    console.error("[referral] POST error:", error);
    return NextResponse.json(
      { error: "Intern serverfeil" },
      { status: 500 },
    );
  }
}
