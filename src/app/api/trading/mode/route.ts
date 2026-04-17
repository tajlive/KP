/**
 * Trading Mode API
 * GET: Hent nåværende trading mode og Binance-tilkobling
 * POST: Bytt mellom paper og live trading
 */

import { NextRequest, NextResponse } from "next/server";
import { createServerClient, createClient } from "@/lib/supabase/server";
import { canAccessLiveAutoTrading, type TierSlug } from "@/types/subscription";
import { normalizeTier } from "@/lib/pricing/tiers";
import type { Database, Json } from "@/types/database.types";
import type { SupabaseClient } from "@supabase/supabase-js";
import { z } from "zod";

async function userMayUseLiveTrading(
  supabase: SupabaseClient<Database>,
  userId: string,
  tier: TierSlug,
): Promise<boolean> {
  if (!canAccessLiveAutoTrading(tier)) return false;
  const { data: entitlements, error } = await supabase.rpc(
    "get_user_entitlements",
    { p_user_id: userId },
  );
  if (!error && entitlements?.length) {
    const row = entitlements[0] as { auto_trade_allow_live?: boolean };
    return Boolean(row.auto_trade_allow_live);
  }
  return canAccessLiveAutoTrading(tier);
}

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

    const { data: profileRow, error } = await supabase
      .from("user_profiles")
      .select("preferred_trading_mode, binance_connected, tier")
      .eq("id", user.id)
      .single();

    if (error) {
      console.error("Error fetching trading mode:", error);
      return NextResponse.json(
        { error: "Kunne ikke hente trading mode" },
        { status: 500 },
      );
    }

    const tier = normalizeTier(profileRow?.tier);
    const binanceConnected = Boolean(profileRow?.binance_connected);
    const allowLiveTier = await userMayUseLiveTrading(supabase, user.id, tier);
    const canSwitchToLive = binanceConnected && allowLiveTier;

    const stored = profileRow?.preferred_trading_mode;
    const mode = stored === "live" || stored === "paper" ? stored : "paper";

    return NextResponse.json({
      success: true,
      mode,
      canSwitchToLive,
      binanceConnected,
      paperTradesCount: 0,
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
      const { data: profileRow } = await supabase
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
        preferred_trading_mode: mode,
        updated_at: new Date().toISOString(),
      } as { preferred_trading_mode: string; updated_at: string }).eq("id", user.id);

    if (error) {
      console.error("Error updating trading mode:", error);
      return NextResponse.json(
        { error: "Kunne ikke oppdatere trading mode" },
        { status: 500 },
      );
    }

    const { error: auditErr } = await supabase.from("audit_logs").insert({
      user_id: user.id,
      action: "TRADING_MODE_CHANGED",
      metadata: { new_mode: mode } as Json,
      timestamp: new Date().toISOString(),
    });
    if (auditErr) {
      console.warn(
        "[trading/mode] audit_logs insert skipped:",
        auditErr.message,
      );
    }

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
