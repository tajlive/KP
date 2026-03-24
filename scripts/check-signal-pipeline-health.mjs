#!/usr/bin/env node
/**
 * Laster .env.local / .env fra repo-roten (samme mønster som diagnose-signals-traders.mjs)
 * slik at `npm run signals:health` fungerer uten manuell export.
 *
 * Primær sjekk: bot_health.last_heartbeat for signal-engine (oppdateres hver cron-kjøring).
 * trading_signals får kun nye rader ved BUY/SELL — lang pause der er normalt ved HOLD.
 */
import { createClient } from "@supabase/supabase-js";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import dotenv from "dotenv";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, "..");
for (const rel of [".env.local", ".env"]) {
  const full = path.join(repoRoot, rel);
  if (fs.existsSync(full)) dotenv.config({ path: full });
}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const maxAgeMinutes = Number(process.env.SIGNAL_HEALTH_MAX_AGE_MINUTES ?? "20");

if (!supabaseUrl || !serviceRoleKey) {
  console.error(
    "Missing env vars: NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required.",
  );
  process.exit(2);
}

if (!Number.isFinite(maxAgeMinutes) || maxAgeMinutes <= 0) {
  console.error("SIGNAL_HEALTH_MAX_AGE_MINUTES must be a positive number.");
  process.exit(2);
}

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const { data: botRow, error: botErr } = await supabase
  .from("bot_health")
  .select("last_heartbeat, updated_at, status, last_error")
  .eq("bot_name", "signal-engine")
  .maybeSingle();

const heartbeatAt = botRow?.last_heartbeat ?? botRow?.updated_at ?? null;

if (!botErr && botRow && heartbeatAt) {
  const hbAgeMin =
    (Date.now() - new Date(heartbeatAt).getTime()) / 60000;
  const stale = hbAgeMin > maxAgeMinutes;

  if (botRow.status === "error") {
    console.error(
      JSON.stringify(
        {
          ok: false,
          reason: "signal-engine bot_health status error",
          last_error: botRow.last_error,
          maxAgeMinutes,
          heartbeatAgeMinutes: Number(hbAgeMin.toFixed(2)),
        },
        null,
        2,
      ),
    );
    process.exit(1);
  }

  const { data: latestSignal } = await supabase
    .from("trading_signals")
    .select("id,created_at,status,symbol,action,signal_type,reasoning")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  let feedAgeMinutes = null;
  if (latestSignal?.created_at) {
    feedAgeMinutes = Number(
      (
        (Date.now() - new Date(latestSignal.created_at).getTime()) /
        60000
      ).toFixed(2),
    );
  }

  const feedLooksLikeFallback =
    latestSignal?.signal_type === "fallback" ||
    (typeof latestSignal?.reasoning === "string" &&
      latestSignal.reasoning.includes("Fallback signal"));

  const payload = {
    ok: !stale,
    maxAgeMinutes,
    heartbeatAgeMinutes: Number(hbAgeMin.toFixed(2)),
    signalEngineStatus: botRow.status,
    latestSignal,
    feedAgeMinutes,
    note:
      feedAgeMinutes != null && feedAgeMinutes > maxAgeMinutes
        ? "Feed row older than threshold is OK when market/strategies are HOLD."
        : undefined,
    hint:
      stale && feedLooksLikeFallback
        ? "Latest row is PG fallback seed — Edge signal-engine may not be reachable from pg_cron (check net.http_post + Authorization). After migration seed_signal_touch_bot_health, fallback also refreshes bot_health."
        : stale
          ? "Heartbeat stale: redeploy Edge signal-engine, verify pg_cron job signal-engine-5min, and DB vault for service role in cron."
          : undefined,
  };

  if (stale) {
    console.error(JSON.stringify(payload, null, 2));
    process.exit(1);
  }

  console.log(JSON.stringify(payload, null, 2));
  process.exit(0);
}

// Fallback: ingen bot_health-rad — bruk siste trading_signals som før
const { data, error } = await supabase
  .from("trading_signals")
  .select("id,created_at,status,symbol,action")
  .order("created_at", { ascending: false })
  .limit(1)
  .maybeSingle();

if (error) {
  console.error("Failed to fetch latest signal:", error.message);
  process.exit(1);
}

if (!data?.created_at) {
  console.error(
    JSON.stringify(
      {
        ok: false,
        reason: "No bot_health for signal-engine and no trading_signals rows",
        maxAgeMinutes,
      },
      null,
      2,
    ),
  );
  process.exit(1);
}

const ageMinutes = (Date.now() - new Date(data.created_at).getTime()) / 60000;
const stale = ageMinutes > maxAgeMinutes;

const payload = {
  ok: !stale,
  maxAgeMinutes,
  ageMinutes: Number(ageMinutes.toFixed(2)),
  latestSignal: data,
  fallback: "trading_signals_only (no signal-engine bot_health row)",
};

if (stale) {
  console.error(JSON.stringify(payload, null, 2));
  process.exit(1);
}

console.log(JSON.stringify(payload, null, 2));
