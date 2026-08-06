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
 * Per bruker (processAutopilotUser — Task C1, src/lib/trading/autopilot/orchestrator.ts):
 *   1. Hent + dekrypter Kraken-nøkler → KrakenClient
 *   2. scanPortfolio (B1) → equity, fri USDC, posisjoner
 *   3. allocateCapital (B2) → kapitalallokering per par
 *   4. Grid-tick per par (fills → trailing-salg / re-kjøp) + 5-par-aktivering
 *   5. Progresiv drawdown-kill (7 % → halverte nivåer, 15 % → kill)
 *   6. Reinvesteringsbeslutning (B3) + idle-nivåer
 *   7. Upsert autopilot_state (service-role via createAutopilotDb)
 *
 * Ruten plasserer ALDRI ordre selv — all trading-logikk ligger i
 * orchestrator-modulen. Ruten: velg brukere → batch-parallelliser
 * processAutopilotUser → aggreger { processed, errors, error_details }.
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
import type { Database } from "@/types/database.types";
import { createClient } from "@/lib/supabase/server";
import { validateCronSecret } from "@/lib/auth/cron";
import { captureCronError, captureCronSuccess } from "@/lib/cron/cron-helpers";
import {
  processAutopilotUser,
  createAutopilotDb,
} from "@/lib/trading/autopilot/orchestrator";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Batch-størrelse — samme som tick-motoren (25 samtidige per batch). */
const BATCH_SIZE = 25;
/** Timeout-guard: ikke start nye batcher nær Cloudflares 60s CPU-grense. */
const BATCH_TIMEOUT_MS = 55_000;

export interface AutopilotUser {
  user_id: string;
  api_key_encrypted: string;
  api_secret_encrypted: string;
}

export interface AutopilotUserResult {
  user_id: string;
  ok: boolean;
  equity_usdc?: number;
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
    db.from("autopilot_state").select("user_id").eq("activated", true),
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

export async function POST(req: NextRequest) {
  // Auth — samme mønster som tick: Authorization: Bearer ***
  if (!validateCronSecret(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const startTime = Date.now();
  const supabase = (await createClient()) as SupabaseClient<Database>;

  try {
    const users = await fetchAutopilotUsers(supabase);

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
    // All per-bruker-logikk lever i orchestrator-modulen (C1) — ruten velger
    // kun brukere og aggregerer resultatet. Kill-utløsning regnes som «feil»
    // i responsen (synlig i error_details); state er lagret og ordrer
    // kansellert av pipelinen.
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
        batch.map(async (user) => {
          try {
            const autopilotDb = createAutopilotDb(supabase);
            const result = await processAutopilotUser(
              autopilotDb,
              user.user_id,
            );
            if (result.ok) {
              return {
                user_id: user.user_id,
                ok: !result.killTriggered,
                equity_usdc: result.portfolio.equityUsdc,
                error: result.killed ? "drawdown-kill aktiv" : undefined,
              };
            }
            return { user_id: user.user_id, ok: false, error: result.error };
          } catch (err) {
            return {
              user_id: user.user_id,
              ok: false,
              error: err instanceof Error ? err.message : String(err),
            };
          }
        }),
      );
      results.push(...batchResults);
    }

    const errorDetails = results
      .filter((r) => !r.ok)
      .map((r) => ({ user_id: r.user_id, error: r.error ?? "unknown" }));

    await captureCronSuccess(
      "autopilot-orchestrator",
      new Date(startTime),
      new Date(),
    );

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
