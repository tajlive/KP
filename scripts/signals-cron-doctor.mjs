#!/usr/bin/env node
/**
 * Diagnose + self-heal for signal-engine heartbeat.
 *
 * What it does:
 * 1) Reads bot_health + latest trading_signals
 * 2) If heartbeat is stale/missing, invokes Edge function signal-engine once
 * 3) Re-checks heartbeat and prints before/after report
 *
 * Exit codes:
 * - 0: healthy (or healed)
 * - 1: still unhealthy after heal attempt
 * - 2: config/env missing
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import dotenv from "dotenv";
import { createClient } from "@supabase/supabase-js";

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
    JSON.stringify(
      {
        ok: false,
        reason:
          "Missing NEXT_PUBLIC_SUPABASE_URL and/or SUPABASE_SERVICE_ROLE_KEY",
      },
      null,
      2,
    ),
  );
  process.exit(2);
}

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

async function readState() {
  const [{ data: botRow }, { data: signalRow }, { count: publicTraderProfiles }] =
    await Promise.all([
      supabase
        .from("bot_health")
        .select("last_heartbeat, updated_at, status, last_error")
        .eq("bot_name", "signal-engine")
        .maybeSingle(),
      supabase
        .from("trading_signals")
        .select("id,created_at,status,symbol,action,signal_type,reasoning")
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle(),
      supabase
        .from("trader_profiles")
        .select("id", { count: "exact", head: true })
        .eq("is_public", true),
    ]);

  const heartbeatAt = botRow?.last_heartbeat ?? botRow?.updated_at ?? null;
  const heartbeatAgeMinutes = heartbeatAt
    ? Number(((Date.now() - new Date(heartbeatAt).getTime()) / 60000).toFixed(2))
    : null;
  const feedAgeMinutes = signalRow?.created_at
    ? Number(((Date.now() - new Date(signalRow.created_at).getTime()) / 60000).toFixed(2))
    : null;

  return {
    heartbeatAt,
    heartbeatAgeMinutes,
    feedAgeMinutes,
    status: botRow?.status ?? null,
    lastError: botRow?.last_error ?? null,
    latestSignal: signalRow ?? null,
    traderProfilesPublic: publicTraderProfiles ?? 0,
  };
}

function isHealthy(state) {
  return (
    state.heartbeatAgeMinutes != null &&
    state.heartbeatAgeMinutes <= maxAgeMinutes &&
    state.status !== "error"
  );
}

async function invokeSignalEngine() {
  const url = `${supabaseUrl.replace(/\/$/, "")}/functions/v1/signal-engine`;
  const res = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${serviceRoleKey}`,
      "Content-Type": "application/json",
    },
    body: "{}",
  });
  const raw = await res.text();
  let body = null;
  try {
    body = JSON.parse(raw);
  } catch {
    body = { raw };
  }
  return { httpStatus: res.status, body };
}

const before = await readState();

if (isHealthy(before)) {
  console.log(
    JSON.stringify(
      {
        ok: true,
        healed: false,
        maxAgeMinutes,
        before,
        note:
          before.traderProfilesPublic === 0
            ? "trader_profiles_public=0 can make trader lists look empty."
            : undefined,
      },
      null,
      2,
    ),
  );
  process.exit(0);
}

const invoke = await invokeSignalEngine();
await new Promise((r) => setTimeout(r, 2500));
const after = await readState();
const healed = isHealthy(after);

console.log(
  JSON.stringify(
    {
      ok: healed,
      healed,
      maxAgeMinutes,
      invoke,
      before,
      after,
      hint: healed
        ? "Heartbeat repaired by manual invoke. If this repeats, pg_cron -> signal-engine auth/HTTP chain is unhealthy."
        : "Still stale after invoke: check Supabase Edge logs and pg_cron job signal-engine-5min (Authorization/service_role).",
      note:
        after.traderProfilesPublic === 0
          ? "trader_profiles_public=0 can make trader lists look empty."
          : undefined,
    },
    null,
    2,
  ),
);

process.exit(healed ? 0 : 1);
