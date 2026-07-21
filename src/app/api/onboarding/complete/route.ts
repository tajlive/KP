import { NextRequest, NextResponse } from "next/server";
import { createServerClient, createClient } from "@/lib/supabase/server";
import {
  jsonSuccess,
  unauthorized,
  notFound,
  badRequest,
  conflict,
  internalError,
} from "@/lib/api-response";
import {
  getRequestContext,
  getOrCreateRequestId,
  logApi,
} from "@/lib/api-request-context";
import { trackCriticalAction } from "@/lib/sentry";

export async function POST(request: NextRequest) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 5000);
  const requestId = getOrCreateRequestId(request);
  try {
    const response = NextResponse.next();
    const supabaseAuth = createServerClient(request, response);
    const {
      data: { user },
      error: authError,
    } = await supabaseAuth.auth.getUser();

    if (authError || !user) {
      return unauthorized("Ikke autentisert");
    }

    const ctx = getRequestContext(request, user.id);

    const supabase = createClient();
    const { data: profile, error: profileError } = await supabase
      .from("user_profiles")
      .select("id, onboarding_step, onboarding_completed, paper_balance")
      .eq("id", user.id)
      .single();

    if (profileError || !profile) {
      logApi(ctx, "warn", "Profile not found for onboarding complete");
      return notFound("Kunne ikke finne brukerprofil");
    }

    if (profile.onboarding_completed) {
      return conflict("Onboarding er allerede fullført");
    }

    if ((profile.onboarding_step ?? 0) < 4) {
      return badRequest("Onboarding er ikke klar for fullføring");
    }

    const now = new Date().toISOString();
    const paperBalance = profile.paper_balance || 100000;

    // Oppdater user_profiles
    const { error: updateError } = await supabase
      .from("user_profiles")
      .update({
        onboarding_step: 5,
        onboarding_completed: true,
        onboarding_completed_at: now,
      })
      .eq("id", user.id);

    if (updateError) {
      logApi(ctx, "error", "Failed to update user profile", {
        error: updateError.message,
      });
      return internalError("Kunne ikke oppdatere profil");
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
      .single();

    if (sessionError) {
      logApi(ctx, "error", "Failed to create trading session", {
        error: sessionError.message,
      });
      return internalError("Kunne ikke opprette trading session");
    }

    // Send velkomst-e-post (ikke-blokkerende)
    try {
      await fetch("/api/notifications/welcome", , { signal: controller.signal }
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });
    } catch (emailError) {
      // Logg men ikke feil - e-post er ikke kritisk
      console.warn("Failed to send welcome email:", emailError);
    }

    trackCriticalAction("onboarding_complete", {
      userId: user.id,
      requestId,
    });
    return jsonSuccess({
      success: true,
      session_id: session.id,
      message: "Onboarding fullført",
    });
  } catch (error) {
    console.error("[onboarding/complete]", requestId, error);
    return internalError("Uventet feil");
  }
}
