/**
 * AUTOPILOT ORCHESTRATOR (Task C2, autopilot-plan 2026-08-06)
 *
 * pg_cron-rute som prosesserer ALLE autopilot-brukere hvert 5. minutt.
 *
 * Hvem prosesseres (ekvivalent SQL):
 *   SELECT user_id FROM user_kraken_keys
 *   WHERE is_active = true
 *     AND EXISTS (SELECT 1 FROM autopilot_state
 *                 WHERE user_id = user_kraken_keys.user_id AND activated = true);
 *
 * Per bruker (processAutopilotUser — inline, Task C1 er ikke ferdig ennå):
 *   1. Dekrypter Kraken-nøkler → KrakenClient
 *   2. scanPortfolio (B1) → equity, fri USDC, posisjoner
 *   3. allocateCapital (B2) → kapitalallokering per par
 *   4. Reinvesteringsbeslutning (B3) — kun beslutning; ordreplassering
 *      håndteres av grid-manageren (denne ruten plasserer ALDRI ordre)
 *   5. Upsert autopilot_state: equity, allokeringer, drawdown-kill-latch,
 *      five_pair_activated, last_run
 *
 * Batch-parallellisering som tick-motoren: 25 brukere per batch via
 * Promise.all, 55s timeout-guard per run. Feil for én bruker stopper IKKE
 * de andre — hver bruker logges separat i error_details.
 *
 * pg_cron-oppsett (kjør manuelt i Supabase SQL Editor — IKKE opprettet her).
 * NB: schedule-strengen nedenfor er skrevet som '*||'/5 …' (SQL-konkatenasjon)
 * fordi '*'+'/5' i én streng ville lukket denne JS-kommentaren:
 *   SELECT cron.schedule(
 *     'klarpakke-autopilot-orchestrator',
 *     '*' || '/5 * * * *',
 *     'SELECT net.http_post(
 *        url := ''https://www.klarpakke.no/api/cron/autopilot-orchestrator'',
 *        headers := ''{"Authorization": "Bearer " || current_setting(''app.cron_secret'')}''::jsonb
 *      )'
 *   );
 */

import { NextRequest, NextResponse } from "next/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database, Json } from "@/types/database.types";
import { createClient } from "@/lib/supabase/server";
import { validateCronSecret } from "@/lib/auth/cron";
import {
  captureCronError,
  captureCronSuccess,
} from "@/lib/cron/cron-helpers";
import { decryptApiKey } from "@/lib/crypto/encrypt-api-keys";
import { KrakenClient } from "@/lib/exchanges/kraken/client";
import { scanPortfolio } from "@/lib/trading/autopilot/scanner";
import {
  allocateCapital,
  validateAllocations,
  type Allocation,
} from "@/lib/trading/autopilot/allocator";
import { computeReinvest } from "@/lib/trading/kraken-reinvest";
import { ACTIVE_PAIRS } from "@/lib/trading/kraken-grid-config.mjs";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Batch-størrelse — samme som tick-motoren (25 samtidige per batch). */
const BATCH_SIZE = 25;
/** Timeout-guard: ikke start nye batcher nær Cloudflares 60s CPU-grense. */
const BATCH_TIMEOUT_MS = 55_000;
/** Equity-terskel for 5-par-modus (ADA/DOT aktiveres ved >= 250 USDC). */
const FIVE_PAIR_EQUITY_USDC = 250;
/** Drawdown-kill: equity under 85% av initial → stopp nye ordrer (latch). */
const DRAWDOWN_KILL_PCT = 0.15;

export interface AutopilotUser {
  user_id: string;
  api_key_encrypted: string;
  api_secret_encrypted: string;
}

export interface AutopilotUserResult {
  user_id: string;
  ok: boolean;
  equity_usdc?: number;
  allocations?: Allocation[];
  error?: string;
}

/**
 * Hent alle autopilot-brukere: aktive Kraken-nøkler + aktivert autopilot.
 * To parallelle spørringer + JS-intersection gir samme resultat som EXISTS-
 * spørringen i task-spesifikasjonen (autopilot_state har ingen FK-deklarasjon
 * i typene, så nested `!inner`-select ville kreve casts).
 */
export async function fetchAutopilotUsers(
  db: SupabaseClient<Database>,
): Promise<AutopilotUser[]> {
  const [keysRes, stateRes] = await Promise.all([
    db
      .from("user_kraken_keys")
      .select("user_id, api_key_encrypted, api_secret_encrypted")
      .eq("is_active", true),
    db
      .from("autopilot_state")
      .select("user_id")
      .eq("activated", true),
  ]);

  if (keysRes.error) {
    throw new Error(`DB user_kraken_keys: ${keysRes.error.message}`);
  }
  if (stateRes.error) {
    throw new Error(`DB autopilot_state: ${stateRes.error.message}`);
  }

  const activated = new Set((stateRes.data ?? []).map((r) => r.user_id));
  return (keysRes.data ?? []).filter((u) => activated.has(u.user_id));
}

/**
 * Prosesser ÉN autopilot-bruker (Task C1 — processAutopilotUser, inline).
 * Kast ALDRI utover funksjonen: alle feil fanges og returneres som
 * { ok: false, error } så orkestratoren kan fortsette med neste bruker.
 */
export async function processAutopilotUser(
  db: SupabaseClient<Database>,
  user: AutopilotUser,
): Promise<AutopilotUserResult> {
  try {
    // 1. Nøkler → KrakenClient
    const [apiKey, apiSecret] = await Promise.all([
      decryptApiKey(user.api_key_encrypted),
      decryptApiKey(user.api_secret_encrypted),
    ]);
    const client = new KrakenClient(apiKey, apiSecret);

    // 2. Scan portefølje (B1)
    const portfolio = await scanPortfolio(client, ACTIVE_PAIRS());

    // 3. Alloker kapital (B2) + valider allokeringen
    const allocations = allocateCapital(portfolio.equityUsdc);
    const validation = validateAllocations(allocations, portfolio.equityUsdc);
    if (!validation.valid) {
      throw new Error(`Allokering ugyldig: ${validation.reason}`);
    }

    // 4. Eksisterende state (initial equity, realized profit, drawdown-latch)
    const { data: prev } = await db
      .from("autopilot_state")
      .select(
        "initial_equity_usdc, realized_profit_usdc, current_equity_usdc, drawdown_kill",
      )
      .eq("user_id", user.user_id)
      .maybeSingle();

    const initialEquity =
      prev?.initial_equity_usdc && Number(prev.initial_equity_usdc) > 0
        ? Number(prev.initial_equity_usdc)
        : portfolio.equityUsdc;

    // 5. Reinvesteringsbeslutning (B3) — beslutningen logges; selve
    //    ordreplasseringen gjøres av grid-manageren (money-safe).
    const realizedProfit = Number(prev?.realized_profit_usdc ?? 0);
    const reinvest = computeReinvest(realizedProfit);

    // 6. Drawdown-kill: latchet — én gang under terskelen, forblir kill
    //    til en bruker manuelt resettes (aldri auto-reaktiver trading).
    const drawdownKill =
      prev?.drawdown_kill === true ||
      portfolio.equityUsdc < initialEquity * (1 - DRAWDOWN_KILL_PCT);

    if (drawdownKill) {
      console.warn(
        `[Autopilot] DRAWDOWN-KILL for ${user.user_id}: equity ${portfolio.equityUsdc} < 85% av initial ${initialEquity}`,
      );
    }

    const now = new Date().toISOString();
    const { error: upsertErr } = await db.from("autopilot_state").upsert(
      {
        user_id: user.user_id,
        initial_equity_usdc: initialEquity,
        current_equity_usdc: portfolio.equityUsdc,
        realized_profit_usdc: realizedProfit,
        grid_levels: allocations as unknown as Json,
        five_pair_activated: portfolio.equityUsdc >= FIVE_PAIR_EQUITY_USDC,
        drawdown_kill: drawdownKill,
        last_run: now,
        updated_at: now,
      },
      { onConflict: "user_id" },
    );

    if (upsertErr) {
      throw new Error(`Upsert autopilot_state: ${upsertErr.message}`);
    }

    if (reinvest.shouldReinvest) {
      console.info(
        `[Autopilot] ${user.user_id}: reinvesteringsbeslutning — ${reinvest.amount} USDC (kept ${reinvest.kept})`,
      );
    }

    return {
      user_id: user.user_id,
      ok: true,
      equity_usdc: portfolio.equityUsdc,
      allocations,
    };
  } catch (err) {
    return {
      user_id: user.user_id,
      ok: false,
      error: err instanceof Error ? err.message : String(err),
    };
  }
}

export async function POST(req: NextRequest) {
  // Auth — samme mønster som tick: Authorization: Bearer <CRON_SECRET>
  if (!validateCronSecret(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const startTime = Date.now();
  const db = (await createClient()) as SupabaseClient<Database>;

  try {
    const users = await fetchAutopilotUsers(db);

    if (users.length === 0) {
      return NextResponse.json({
        processed: 0,
        errors: 0,
        error_details: [],
        message: "No active autopilot users",
      });
    }

    // Batch-parallellisering (tick-mønster): 25 brukere samtidig per batch,
    // timeout-guard bryter ut nær 55s så run aldri sprenger CPU-grensen.
    const results: AutopilotUserResult[] = [];
    for (let i = 0; i < users.length; i += BATCH_SIZE) {
      if (Date.now() - startTime > BATCH_TIMEOUT_MS) {
        console.warn(
          `[Autopilot] Timeout nærmer seg — prosesserte ${results.length}/${users.length} brukere`,
        );
        break;
      }
      const batch = users.slice(i, i + BATCH_SIZE);
      const batchResults = await Promise.all(
        batch.map((u) => processAutopilotUser(db, u)),
      );
      results.push(...batchResults);
    }

    const errorDetails = results
      .filter((r) => !r.ok)
      .map((r) => ({ user_id: r.user_id, error: r.error ?? "unknown" }));

    await captureCronSuccess("autopilot-orchestrator", new Date(startTime), new Date());

    return NextResponse.json({
      processed: results.filter((r) => r.ok).length,
      errors: errorDetails.length,
      error_details: errorDetails,
      total_users: users.length,
      duration_ms: Date.now() - startTime,
    });
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : String(err);
    console.error("Autopilot orchestrator unexpected error:", err);
    captureCronError("autopilot-orchestrator", err as Error, {
      durationMs: Date.now() - startTime,
    });

    return NextResponse.json(
      { error: "Internal error", details: errorMessage },
      { status: 500 },
    );
  }
}

// Støtt også GET for manuell triggering (samme som tick)
export const GET = POST;
