import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createClient, createServerClient } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/pilot — start/aktiver Pilot- eller Auto-sesjon
// Body: { mode: "auto" | "joker", live?: boolean, symbols?: string[] }
//
// - mode "auto"  → Auto-strategi (tick kjører strategi-gates)
// - mode "joker" → PilotTrade (ensemble-signaler)
// - live=false (default) → paper-sesjon (lekepenger)
// - live=true → ekte Binance-handel via brukerens egne API-nøkler
//   (krever aktiv exchange_connection med trading-tillatelse + tier)
// ─────────────────────────────────────────────────────────────────────────────

const pilotSchema = z.object({
  mode: z.enum(["auto", "joker"]).default("auto"),
  live: z.boolean().optional().default(false),
  symbols: z.array(z.string()).max(11).optional(),
});

const GUARD_ERROR_OR_FILTER = "error_message.not.like.GUARD:%,error_message.is.null";

export async function POST(request: NextRequest) {
  try {
    const response = NextResponse.next();
    const authClient = createServerClient(request, response);
    const { data: { user } } = await authClient.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const db = createClient();

    const parsed = pilotSchema.safeParse(await request.json().catch(() => ({})));
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid body", details: parsed.error.flatten() },
        { status: 400 },
      );
    }

    const { mode, live, symbols } = parsed.data;

    // Live-krav: Binance-kobling (exchange_connections | user_binance_keys | legacy) + kvalifisert tier
    if (live) {
      const { data: connection } = await db
        .from("exchange_connections")
        .select("id, permissions")
        .eq("user_id", user.id)
        .eq("exchange", "binance")
        .eq("is_active", true)
        .is("revoked_at", null)
        .maybeSingle();

      const { data: ubkRow } = await db
        .from("user_binance_keys")
        .select("api_key_id, api_secret_id")
        .eq("user_id", user.id)
        .eq("is_active", true)
        .limit(1)
        .maybeSingle();

      const { data: apiKeyRow } = await db
        .from("api_keys")
        .select("id")
        .eq("user_id", user.id)
        .eq("exchange", "binance")
        .eq("is_active", true)
        .limit(1)
        .maybeSingle();

      const { data: profileRow } = await db
        .from("user_profiles")
        .select("tier, binance_connected")
        .eq("id", user.id)
        .single();

      const perms = (connection?.permissions ?? {}) as Record<string, boolean>;
      const hasKeys =
        Boolean(connection) || Boolean(ubkRow?.api_key_id && ubkRow.api_secret_id) ||
        Boolean(apiKeyRow) || Boolean(profileRow?.binance_connected);

      if (!hasKeys || (connection && !perms.trading)) {
        return NextResponse.json(
          {
            error: "Koble Binance i Innstillinger → Binance API før live-handel (trading-tillatelse kreves)",
            requiresConnection: true,
          },
          { status: 400 },
        );
      }

      const allowedTiers = ["bachelor", "master", "phd", "professor"];
      if (!allowedTiers.includes(profileRow?.tier as string)) {
        return NextResponse.json(
          {
            error: "Live-handel krever Bachelor-tier eller høyere",
            requiresTier: true,
          },
          { status: 400 },
        );
      }
    }

    // Sikre aktive sesjoner (paper eller live) — én per valgt symbol
    const sessionMode = live ? "live" : "paper";

    // Kapital fra paper-konto (paper) eller standard (live)
    let capital = 10000;
    if (!live) {
      const { data: account } = await db
        .from("paper_accounts")
        .select("current_balance")
        .eq("user_id", user.id)
        .maybeSingle();
      capital = Number(account?.current_balance ?? 10000);
    } else {
      capital = 10000; // live: kun posisjonsstørrelse teller, ikke "kapital"
    }

    // Multi-symbol: én sesjon per valgt valuta (tick = 1 sesjon : 1 trading_pair).
    // Hvis symbols ikke er valgt, fallback til standard (BTCUSDT for auto).
    const tradeSymbols =
      symbols && symbols.length > 0
        ? symbols
        : [mode === "auto" ? "BTCUSDT" : "BTCUSDT"];

    const createdIds: string[] = [];
    let createFailed = false;

    for (const sym of tradeSymbols) {
      const pair = sym.includes("USDT") ? sym : `${sym}USDT`;

      // Eksisterende aktiv sesjon for dette paret?
      const { data: existingForPair } = await db
        .from("trading_sessions")
        .select("id")
        .eq("user_id", user.id)
        .eq("status", "active")
        .eq("mode", sessionMode)
        .eq("trading_pair", pair)
        .or(GUARD_ERROR_OR_FILTER)
        .limit(1)
        .maybeSingle();

      if (existingForPair) {
        await db.from("trading_sessions").update({
          last_heartbeat: new Date().toISOString(),
          last_tick_at: new Date().toISOString(),
        }).eq("id", existingForPair.id);
        createdIds.push(existingForPair.id);
        continue;
      }

      const { data: created, error: createError } = await db
        .from("trading_sessions")
        .insert({
          user_id: user.id,
          mode: sessionMode,
          strategy_id: mode === "auto" ? "multi_signal" : "cryptopilot",
          status: "active",
          trading_pair: pair,
          starting_capital_nok: capital,
          current_capital_nok: capital,
          current_capital: capital,
          initial_capital: capital,
          last_heartbeat: new Date().toISOString(),
          last_tick_at: new Date().toISOString(),
          strategy_config: {
            stop_loss_pct: 5,
            close_on_stop: true,
          },
        })
        .select("id")
        .single();

      if (createError || !created) {
        console.error("[Pilot] create session failed:", createError);
        createFailed = true;
        continue;
      }
      createdIds.push(created.id);
    }

    if (createdIds.length === 0) {
      return NextResponse.json(
        { error: createFailed ? "Kunne ikke opprette sesjon" : "Ingen sesjoner opprettet" },
        { status: 500 },
      );
    }

    return NextResponse.json({
      success: true,
      mode,
      live,
      sessionId: createdIds[0],
      sessionIds: createdIds,
      sessionCount: createdIds.length,
      message: live
        ? `Auto-handel aktiv — ekte penger via Binance (${createdIds.length} ${createdIds.length === 1 ? "valuta" : "valutaer"}). AI-en overvåker og handler.`
        : `${mode === "auto" ? "Auto-handel" : "PilotTrade"} aktiv! AI-en overvåker ${createdIds.length} ${createdIds.length === 1 ? "valuta" : "valutaer"}.`,
    });
  } catch (err) {
    console.error("[POST /api/pilot]", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Internal server error" },
      { status: 500 },
    );
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/pilot — analytikk for Statistikk-tabben
// Returnerer: { analytics: { totalPnl, winRate, totalTrades, winningTrades,
//   losingTrades, byCoin }, trades: [...siste 10] }
// ─────────────────────────────────────────────────────────────────────────────

export async function GET(request: NextRequest) {
  try {
    const response = NextResponse.next();
    const authClient = createServerClient(request, response);
    const { data: { user } } = await authClient.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const db = createClient();

    const sinceDays = Number(request.nextUrl.searchParams.get("since_days") ?? 30);

    const { data: trades, error } = await db
      .from("trades")
      .select(
        "id, trading_pair, side, total_value, quantity, realized_pnl, joker_explanation, created_at",
      )
      .eq("user_id", user.id)
      .gte("created_at", new Date(Date.now() - sinceDays * 86400000).toISOString())
      .order("created_at", { ascending: false })
      .limit(200);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const rows = trades ?? [];
    const closed = rows.filter(
      (t) => t.realized_pnl !== null && t.realized_pnl !== undefined,
    );
    const totalPnl = closed.reduce((s, t) => s + Number(t.realized_pnl ?? 0), 0);
    const winningTrades = closed.filter((t) => Number(t.realized_pnl) > 0).length;
    const losingTrades = closed.filter((t) => Number(t.realized_pnl) <= 0).length;
    const winRate = closed.length > 0 ? (winningTrades / closed.length) * 100 : 0;

    const byCoinMap = new Map<string, { coin: string; trades: number; pnl: number; winRate: number; wins: number }>();
    for (const t of closed) {
      const coin = (t.trading_pair ?? "UNKNOWN").replace("USDT", "");
      const entry = byCoinMap.get(coin) ?? { coin, trades: 0, pnl: 0, winRate: 0, wins: 0 };
      entry.trades += 1;
      entry.pnl += Number(t.realized_pnl ?? 0);
      if (Number(t.realized_pnl) > 0) entry.wins += 1;
      byCoinMap.set(coin, entry);
    }
    const byCoin = Array.from(byCoinMap.values()).map((e) => ({
      coin: e.coin,
      trades: e.trades,
      pnl: e.pnl,
      winRate: e.trades > 0 ? (e.wins / e.trades) * 100 : 0,
    })).sort((a, b) => b.pnl - a.pnl);

    return NextResponse.json({
      analytics: {
        totalPnl,
        winRate,
        totalTrades: rows.length,
        winningTrades,
        losingTrades,
        byCoin,
      },
      trades: rows.slice(0, 10),
    });
  } catch (err) {
    console.error("[GET /api/pilot]", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Internal server error" },
      { status: 500 },
    );
  }
}
