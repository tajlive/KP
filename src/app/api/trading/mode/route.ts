/**
 * Trading Mode API
 * GET: Hent nåværende trading mode og Binance-tilkobling
 * POST: Bytt mellom paper og live trading
 */

import { NextRequest, NextResponse } from "next/server";
import { createServerClient, createClient } from "@/lib/supabase/server";
import { z } from "zod";

const tradingModeSchema = z.object({
  mode: z.enum(["paper", "live"]),
});

function getAuthUser(request: NextRequest) {
  const response = NextResponse.next();
  const supabase = createServerClient(request, response);
  return supabase.auth.getUser();
}

/**
 * GET: Hent trading mode status
 */
export async function GET(request: NextRequest) {
  try {
    const {
      data: { user },
      error: authError,
    } = await getAuthUser(request);

    if (authError || !user) {
      return NextResponse.json(
        { error: "Uautorisert", code: "AUTH_REQUIRED" },
        { status: 401 },
      );
    }

    const supabase = createClient();

    // Hent brukerprofil med trading info (kolonner kan mangle i generert type)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: profileRow, error } = await (supabase as any)
      .from("user_profiles")
      .select("trading_mode, binance_api_key_encrypted, paper_trades_count")
      .eq("id", user.id)
      .single();

    if (error) {
      console.error("Error fetching trading mode:", error);
      return NextResponse.json(
        { error: "Kunne ikke hente trading mode" },
        { status: 500 },
      );
    }

    const profile = profileRow as {
      trading_mode?: string;
      binance_api_key_encrypted?: string;
      paper_trades_count?: number;
    } | null;
    return NextResponse.json({
      success: true,
      mode: profile?.trading_mode || "paper",
      canSwitchToLive: !!profile?.binance_api_key_encrypted,
      binanceConnected: !!profile?.binance_api_key_encrypted,
      paperTradesCount: profile?.paper_trades_count || 0,
    });
  } catch (error) {
    console.error("Error in GET /api/trading/mode:", error);
    return NextResponse.json({ error: "Intern serverfeil" }, { status: 500 });
  }
}

/**
 * POST: Bytt trading mode
 */
export async function POST(request: NextRequest) {
  try {
    const {
      data: { user },
      error: authError,
    } = await getAuthUser(request);

    if (authError || !user) {
      return NextResponse.json(
        { error: "Uautorisert", code: "AUTH_REQUIRED" },
        { status: 401 },
      );
    }

    const supabase = createClient();

    const body = await request.json();
    const parsed = tradingModeSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        {
          error: 'Ugyldig trading mode. Må være "paper" eller "live"',
          code: "INVALID_MODE",
          details: parsed.error.flatten(),
        },
        { status: 400 },
      );
    }
    const { mode } = parsed.data;

    // Hvis bytte til live, sjekk at Binance er koblet til
    if (mode === "live") {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: profileRow } = await (supabase as any)
        .from("user_profiles")
        .select("binance_api_key_encrypted")
        .eq("id", user.id)
        .single();
      const profile = profileRow as {
        binance_api_key_encrypted?: string;
      } | null;
      if (!profile?.binance_api_key_encrypted) {
        return NextResponse.json(
          {
            error: "Binance API ikke tilkoblet. Koble til Binance først.",
            code: "BINANCE_NOT_CONNECTED",
          },
          { status: 400 },
        );
      }

      // Sjekk tier-tilgang for live trading
      const { data: entitlements } = await supabase.rpc(
        "get_user_entitlements",
        {
          p_user_id: user.id,
        },
      );

      if (!entitlements?.[0]?.auto_trade_allow_live) {
        return NextResponse.json(
          {
            error: "Live trading krever Bachelor-tier eller høyere",
            code: "TIER_LIMIT",
            required: "bachelor",
            current: entitlements?.[0]?.subscription_tier || "student",
          },
          { status: 403 },
        );
      }
    }

    // Oppdater trading mode
    const { error } = await supabase
      .from("user_profiles")
      .update({
        trading_mode: mode,
        updated_at: new Date().toISOString(),
      })
      .eq("id", user.id);

    if (error) {
      console.error("Error updating trading mode:", error);
      return NextResponse.json(
        { error: "Kunne ikke oppdatere trading mode" },
        { status: 500 },
      );
    }

    // Logg hendelsen
    await supabase.from("audit_logs").insert({
      user_id: user.id,
      action: "TRADING_MODE_CHANGED",
      details: { new_mode: mode },
      created_at: new Date().toISOString(),
    });

    return NextResponse.json({
      success: true,
      message: `Byttet til ${mode} trading`,
      mode,
    });
  } catch (error) {
    console.error("Error in POST /api/trading/mode:", error);
    return NextResponse.json({ error: "Intern serverfeil" }, { status: 500 });
  }
}
