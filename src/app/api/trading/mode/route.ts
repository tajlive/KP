/**
 * Trading Mode API
 * GET: Hent nåværende trading mode og Kraken-tilkobling
 * POST: Bytt mellom paper og live trading
 */

import { NextRequest, NextResponse } from "next/server";
import { createServerClient, createClient } from "@/lib/supabase/server";
import { verifyLiveEntitlement } from "@/lib/auth/live-trading";
import {
  canUserAccessLiveTrading,
  isLiveTradingDogfood,
  liveTradingBlockReason,
} from "@/lib/auth/live-trading-dogfood";
import type { Json } from "@/types/database.types";
import { z } from "zod";

export const dynamic = "force-dynamic";

const tradingModeSchema = z.object({
  mode: z.enum(["paper", "live"]),
  rememberDefault: z.boolean().optional().default(true),
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
      .select("preferred_trading_mode, tier")
      .eq("id", user.id)
      .single();

    if (error) {
      console.error("Error fetching trading mode:", error);
      return NextResponse.json(
        { error: "Kunne ikke hente trading mode" },
        { status: 500 },
      );
    }

    // EU/EØS (2026): live-kobling = Kraken-nøkler (primær), OKX (børs #2).
    const { data: krakenKeys } = await supabase
      .from("user_kraken_keys")
      .select("user_id")
      .eq("user_id", user.id)
      .maybeSingle();
    const krakenConnected = Boolean(krakenKeys);
    const canSwitchToLive = await verifyLiveEntitlement(supabase, user.id);

    // OKX er børs #2 — kun eksponert når OKX_ENABLED=true (kill switch).
    let okxConnected = false;
    if (process.env.OKX_ENABLED === "true") {
      const { data: okxKeys } = await supabase
        .from("user_okx_keys")
        .select("user_id")
        .eq("user_id", user.id)
        .maybeSingle();
      okxConnected = Boolean(okxKeys);
    }

    const stored = profileRow?.preferred_trading_mode;
    const mode = stored === "live" || stored === "paper" ? stored : "paper";

    return NextResponse.json({
      success: true,
      mode,
      canSwitchToLive,
      krakenConnected,
      okxConnected,
      paperTradesCount: 0,
      liveTradingDogfood: isLiveTradingDogfood(),
      liveTradingBlockedReason: liveTradingBlockReason(user.id),
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
    const { mode, rememberDefault } = parsed.data;

    // Hvis bytte til live, sjekk dogfood-gate først (2026-08-12, P0)
    if (mode === "live") {
      // Gate 0: Dogfood-whitelist
      if (!canUserAccessLiveTrading(user.id)) {
        return NextResponse.json(
          {
            error: liveTradingBlockReason(user.id) || "Live trading er ikke tilgjengelig",
            code: "LIVE_TRADING_DOGFOOD",
          },
          { status: 403 },
        );
      }

      // Gate 1: Exchange-nøkler — Kraken ELLER OKX (2026-08-12: OKX er primær)
      const [{ data: krakenKeys }, { data: okxKeys }] = await Promise.all([
        supabase
          .from("user_kraken_keys")
          .select("user_id")
          .eq("user_id", user.id)
          .eq("is_active", true)
          .maybeSingle(),
        supabase
          .from("user_okx_keys")
          .select("user_id")
          .eq("user_id", user.id)
          .eq("is_active", true)
          .maybeSingle(),
      ]);
      if (!krakenKeys && !okxKeys) {
        return NextResponse.json(
          {
            error: "Ingen exchange tilkoblet. Koble til OKX eller Kraken først.",
            code: "EXCHANGE_NOT_CONNECTED",
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
            current: entitlements?.[0]?.tier_slug || "student",
          },
          { status: 403 },
        );
      }
    }

    // Oppdater trading mode. "Husk som standard" styrer om profilens
    // foretrukne modus skal oppdateres; selve cockpitet bruker URL.
    if (rememberDefault) {
      const { error } = await supabase
        .from("user_profiles")
        .update({
          preferred_trading_mode: mode,
          updated_at: new Date().toISOString(),
        } as { preferred_trading_mode: string; updated_at: string })
        .eq("id", user.id);

      if (error) {
        console.error("Error updating trading mode:", error);
        return NextResponse.json(
          { error: "Kunne ikke oppdatere trading mode" },
          { status: 500 },
        );
      }
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
