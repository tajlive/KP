import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getProfileOnboardingExtended } from "@/lib/supabase/helpers";

export async function POST() {
  try {
    const supabase = createClient();

    // Sjekk autentisering
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: "Ikke autentisert" },
        { status: 401 }
      );
    }

    const { data: profile, error: profileError } = await getProfileOnboardingExtended(supabase, user.id);

    if (profileError || !profile) {
      return NextResponse.json(
        { error: "Kunne ikke finne brukerprofil" },
        { status: 404 }
      );
    }

    // Sjekk om onboarding allerede er fullført
    if (profile.onboarding_completed) {
      return NextResponse.json(
        { error: "Onboarding er allerede fullført" },
        { status: 400 }
      );
    }

    // Sjekk at brukeren er på riktig steg
    if (profile.onboarding_step < 4) {
      return NextResponse.json(
        { error: "Onboarding er ikke klar for fullføring" },
        { status: 400 }
      );
    }

    const now = new Date().toISOString();
    const paperBalance = profile.paper_balance || 10000;

    // Oppdater user_profiles
    const { error: updateError } = await supabase
      .from("user_profiles")
      .update({
        onboarding_step: 5,
        onboarding_completed: true,
        onboarding_completed_at: now,
      })
      .eq("user_id" as unknown, user.id);

    if (updateError) {
      console.error("Failed to update user profile:", updateError);
      return NextResponse.json(
        { error: "Kunne ikke oppdatere profil" },
        { status: 500 }
      );
    }

    // Opprett paper trading session
    const { data: session, error: sessionError } = await supabase
      .from("trading_sessions")
      .insert({
        user_id: user.id,
        mode: "paper",
        status: "active",
        strategy_id: "dca", // Default strategi
        trading_pair: "BTCUSDT",
        current_capital_nok: paperBalance,
        starting_capital_nok: paperBalance,
        initial_capital: paperBalance,
        current_capital: paperBalance,
        started_at: now,
        created_at: now,
        updated_at: now,
      })
      .select("id")
      .single() as unknown;

    if (sessionError) {
      console.error("Failed to create trading session:", sessionError);
      // Rollback ikke kritisk her - brukeren kan opprette session manuelt
      return NextResponse.json(
        { error: "Kunne ikke opprette trading session" },
        { status: 500 }
      );
    }

    // Send velkomst-e-post (ikke-blokkerende)
    try {
      await fetch("/api/notifications/welcome", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });
    } catch (emailError) {
      // Logg men ikke feil - e-post er ikke kritisk
      console.warn("Failed to send welcome email:", emailError);
    }

    return NextResponse.json({
      success: true,
      session_id: session.id,
      message: "Onboarding fullført",
    });
  } catch (error) {
    console.error("Unexpected error in onboarding complete:", error);
    return NextResponse.json(
      { error: "Uventet feil" },
      { status: 500 }
    );
  }
}
