import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createClient, createServerClient } from "@/lib/supabase/server";
import {
  isGridDefaultRouting,
  resolveAutoConfigStrategy,
  resolveDefaultStrategyId,
} from "@/lib/trading/routing-default";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/pilot — start/aktiver Pilot- eller Auto-sesjon
// Body: { mode: "auto" | "pilot", live?: boolean, symbols?: string[], capital?: number }
//
// - mode "auto"  → Auto-strategi (tick kjører strategi-gates)
// - mode "pilot" → PilotTrade (ensemble-signaler)
// - live=false (default) → paper-sesjon (lekepenger)
// - live=true → ekte Kraken-handel via brukerens egne API-nøkler
//   (krever aktiv exchange_connection med trading-tillatelse + tier)
// ─────────────────────────────────────────────────────────────────────────────

const pilotSchema = z.object({
  mode: z.enum(["auto", "pilot"]).default("auto"),
  live: z.boolean().optional().default(false),
  symbols: z.array(z.string()).max(11).optional(),
  // Valgt kapital (NOK). Tom valgte 10 000 2026-08-04 men fikk hele balansen
  // per symbol (94 389 × 11). Default: hele paper-balansen (bakoverkompatibelt).
  capital: z.number().min(1000).max(10_000_000).optional(),
});

const GUARD_ERROR_OR_FILTER =
  "error_message.not.like.GUARD:%,error_message.is.null";

export async function POST(request: NextRequest) {
  try {
    const response = NextResponse.next();
    const authClient = createServerClient(request, response);
    const {
      data: { user },
    } = await authClient.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const db = createClient();

    const parsed = pilotSchema.safeParse(
      await request.json().catch(() => ({})),
    );
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid body", details: parsed.error.flatten() },
        { status: 400 },
      );
    }

    const { mode, live, symbols, capital: requestedCapital } = parsed.data;

    // Feature-flag: grid som default-strategi for nye auto/pilot-sesjoner.
    // GRID_DEFAULT_ROUTING="off" = gammel oppførsel (multi_signal/cryptopilot).
    // Default (udefinert) = grid (eneste strategi med positiv backtest,
    // PF 7.42 OOS — trading-agent-forslag 2026-08-05).
    const gridDefault = isGridDefaultRouting();

    // Live-krav: Kraken-kobling (user_kraken_keys — EU/EØS 2026) + kvalifisert tier
    if (live) {
      const { data: krakenKeysRow } = await db
        .from("user_kraken_keys")
        .select("api_key_encrypted, api_secret_encrypted")
        .eq("user_id", user.id)
        .limit(1)
        .maybeSingle();

      const { data: profileRow } = await db
        .from("user_profiles")
        .select("tier")
        .eq("id", user.id)
        .single();

      const hasKeys = Boolean(
        krakenKeysRow?.api_key_encrypted && krakenKeysRow.api_secret_encrypted,
      );

      if (!hasKeys) {
        return NextResponse.json(
          {
            error:
              "Koble Kraken i Innstillinger → Kraken API før live-handel (trading-tillatelse kreves)",
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

    // Multi-symbol: én sesjon per valgt valuta (tick = 1 sesjon : 1 trading_pair).
    // Default per mode (2026-08-11): pilot → SOLUSDT (COMBO E3 er mappet optimal
    // på SOL — høy volatilitet + fete haler), auto → BTCUSDT (uendret).
    const tradeSymbols =
      symbols && symbols.length > 0
        ? symbols
        : [mode === "pilot" ? "SOLUSDT" : "BTCUSDT"];

    // Finn hvilke par som faktisk trenger NY sesjon (resten = heartbeat)
    const pendingSymbols: string[] = [];
    for (const sym of tradeSymbols) {
      const pair = sym.includes("USDT") ? sym : `${sym}USDT`;
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
      if (!existingForPair) pendingSymbols.push(pair);
    }

    // Kapital: kun nødvendig når det opprettes NYE sesjoner. FRI kapital
    // (P1-fiks 2026-08-11) = current_balance − sum(aktive/paused). Tidligere:
    // hele saldoen per ny sesjon → to aktive sesjoner delte samme saldo →
    // syncPaperAccountBalance summerte begge → 199 294 ≈ 2×100k (K3-observasjon).
    let capital = 10000;
    let freeCapital = 0;
    if (pendingSymbols.length === 0) {
      // Alt aktivt allerede — heartbeat uten kapitalkrav
      for (const pair of tradeSymbols) {
        const p = pair.includes("USDT") ? pair : `${pair}USDT`;
        const { data: existing } = await db
          .from("trading_sessions")
          .select("id")
          .eq("user_id", user.id)
          .eq("status", "active")
          .eq("mode", sessionMode)
          .eq("trading_pair", p)
          .limit(1)
          .maybeSingle();
        if (existing) {
          await db
            .from("trading_sessions")
            .update({
              last_heartbeat: new Date().toISOString(),
              last_tick_at: new Date().toISOString(),
            })
            .eq("id", existing.id);
        }
      }
      return NextResponse.json({
        success: true,
        mode,
        live,
        sessionId: null,
        sessionIds: [],
        sessionCount: 0,
        message: live
          ? "Auto-handel er allerede aktiv."
          : `${mode === "auto" ? "Auto-handel" : "PilotTrade"} er allerede aktiv.`,
      });
    }

    if (!live) {
      const { data: account } = await db
        .from("paper_accounts")
        .select("current_balance")
        .eq("user_id", user.id)
        .maybeSingle();
      const balance = Number(account?.current_balance ?? 10000);

      // Hvor mye er allerede allokert i levende sesjoner?
      const { data: liveSessions } = await db
        .from("trading_sessions")
        .select("current_capital_nok")
        .eq("user_id", user.id)
        .eq("mode", sessionMode)
        .in("status", ["active", "paused"]);
      const allocated = (liveSessions ?? []).reduce(
        (sum, s) => sum + Number(s.current_capital_nok ?? 0),
        0,
      );
      freeCapital = Math.max(0, balance - allocated);

      // Aldri mer enn faktisk fri kapital; default = hele frie kapitalen.
      capital =
        requestedCapital != null
          ? Math.min(requestedCapital, freeCapital)
          : freeCapital;

      if (capital < 1000) {
        return NextResponse.json(
          {
            error:
              "Ikke nok ledig kapital til ny sesjon. Stopp en aktiv sesjon først.",
            code: "INSUFFICIENT_FREE_CAPITAL",
            freeCapital: Math.round(freeCapital * 100) / 100,
          },
          { status: 400 },
        );
      }
    } else {
      capital = requestedCapital ?? 10000; // live: kun posisjonsstørrelse teller
    }

    // Del valgt kapital jevnt på antall NYE symboler.
    const capitalPerSymbol = Math.round(capital / pendingSymbols.length);

    const createdIds: string[] = [];
    let createFailed = false;

    for (const pair of pendingSymbols) {
      const { data: created, error: createError } = await db
        .from("trading_sessions")
        .insert({
          user_id: user.id,
          mode: sessionMode,
          strategy_id: resolveDefaultStrategyId(mode, gridDefault),
          is_pilot: mode === "pilot",
          status: "active",
          trading_pair: pair,
          starting_capital_nok: capitalPerSymbol,
          current_capital_nok: capitalPerSymbol,
          current_capital: capitalPerSymbol,
          initial_capital: capitalPerSymbol,
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
        {
          error: createFailed
            ? "Kunne ikke opprette sesjon"
            : "Ingen sesjoner opprettet",
        },
        { status: 500 },
      );
    }

    // Auto-opprett/synk auto_trading_configs så cron plukker opp brukeren
    try {
      await db.from("auto_trading_configs").upsert(
        {
          user_id: user.id,
          is_enabled: true,
          strategy: resolveAutoConfigStrategy(mode, gridDefault),
        },
        { onConflict: "user_id" },
      );
    } catch {
      /* best effort */
    }

    return NextResponse.json({
      success: true,
      mode,
      live,
      sessionId: createdIds[0],
      sessionIds: createdIds,
      sessionCount: createdIds.length,
      message: live
        ? `Auto-handel aktiv — ekte penger via Kraken (${createdIds.length} ${createdIds.length === 1 ? "valuta" : "valutaer"}). AI-en overvåker og handler.`
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
    const {
      data: { user },
    } = await authClient.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const db = createClient();

    const sinceDays = Number(
      request.nextUrl.searchParams.get("since_days") ?? 30,
    );

    const { data: trades, error } = await db
      .from("trades")
      .select(
        "id, trading_pair, side, total_value, quantity, realized_pnl, pilot_explanation, created_at",
      )
      .eq("user_id", user.id)
      .gte(
        "created_at",
        new Date(Date.now() - sinceDays * 86400000).toISOString(),
      )
      .order("created_at", { ascending: false })
      .limit(200);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const rows = trades ?? [];
    const closed = rows.filter(
      (t) => t.realized_pnl !== null && t.realized_pnl !== undefined,
    );
    const totalPnl = closed.reduce(
      (s, t) => s + Number(t.realized_pnl ?? 0),
      0,
    );
    const winningTrades = closed.filter(
      (t) => Number(t.realized_pnl) > 0,
    ).length;
    const losingTrades = closed.filter(
      (t) => Number(t.realized_pnl) <= 0,
    ).length;
    const winRate =
      closed.length > 0 ? (winningTrades / closed.length) * 100 : 0;

    // Regime-pause (feed-kort 2026-08-11): siste regime_gate_blocked for
    // brukeren — «Piloten venter på roligere farvann» når 0 handler skyldes
    // bremser, ikke feil. Hentes fra trading_logs (siste 48 t).
    let regimePause: { reason: string; at: string } | null = null;
    const { data: gateRows, error: gateError } = await db
      .from("trading_logs")
      .select("details, created_at")
      .eq("user_id", user.id)
      .eq("action", "regime_gate_blocked")
      .gte("created_at", new Date(Date.now() - 48 * 3600000).toISOString())
      .order("created_at", { ascending: false })
      .limit(1);
    if (!gateError && gateRows && gateRows.length > 0) {
      const row = gateRows[0] as {
        details?: { reason?: string } | null;
        created_at: string;
      };
      if (row.details?.reason) {
        regimePause = { reason: row.details.reason, at: row.created_at };
      }
    }

    const byCoinMap = new Map<
      string,
      {
        coin: string;
        trades: number;
        pnl: number;
        winRate: number;
        wins: number;
      }
    >();
    for (const t of closed) {
      const coin = (t.trading_pair ?? "UNKNOWN").replace("USDT", "");
      const entry = byCoinMap.get(coin) ?? {
        coin,
        trades: 0,
        pnl: 0,
        winRate: 0,
        wins: 0,
      };
      entry.trades += 1;
      entry.pnl += Number(t.realized_pnl ?? 0);
      if (Number(t.realized_pnl) > 0) entry.wins += 1;
      byCoinMap.set(coin, entry);
    }
    const byCoin = Array.from(byCoinMap.values())
      .map((e) => ({
        coin: e.coin,
        trades: e.trades,
        pnl: e.pnl,
        winRate: e.trades > 0 ? (e.wins / e.trades) * 100 : 0,
      }))
      .sort((a, b) => b.pnl - a.pnl);

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
      regimePause,
    });
  } catch (err) {
    console.error("[GET /api/pilot]", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Internal server error" },
      { status: 500 },
    );
  }
}
