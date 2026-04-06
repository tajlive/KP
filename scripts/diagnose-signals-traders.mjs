#!/usr/bin/env node
/**
 * Diagnostikk mot Supabase (service role): signal-engine heartbeat, trading_signals, leaderboard_bots.
 * Kjør fra repo-roten med nøkler i miljø, f.eks.:
 *   node --env-file=.env.local scripts/diagnose-signals-traders.mjs
 *
 * Exit 1 hvis: signal-engine heartbeat mangler/er gammel, bot status error, eller ingen aktive ledere.
 * trading_signals kan være «gammel» uten exit 1 når heartbeat er OK (HOLD-marked).
 * Ingen hemmeligheter skrives ut.
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

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
const maxAgeMinutes = Number(process.env.SIGNAL_HEALTH_MAX_AGE_MINUTES ?? "20");

if (!url || !key) {
  console.error(
    "Mangler NEXT_PUBLIC_SUPABASE_URL og/eller SUPABASE_SERVICE_ROLE_KEY (bruk .env.local eller --env-file).",
  );
  process.exit(2);
}

const supabase = createClient(url, key, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const problems = [];

const { data: botRow, error: botErr } = await supabase
  .from("bot_health")
  .select("last_heartbeat, updated_at, status, last_error")
  .eq("bot_name", "signal-engine")
  .maybeSingle();

const heartbeatAt = botRow?.last_heartbeat ?? botRow?.updated_at ?? null;
let heartbeatAgeMinutes = null;
let heartbeatOk = false;

if (botErr) {
  problems.push(`bot_health query: ${botErr.message}`);
} else if (!botRow || !heartbeatAt) {
  problems.push(
    "signal-engine: ingen bot_health-rad eller tom heartbeat (kjør signal-engine / sjekk cron)",
  );
} else {
  heartbeatAgeMinutes = Number(
    (
      (Date.now() - new Date(heartbeatAt).getTime()) /
      60_000
    ).toFixed(2),
  );
  if (botRow.status === "error") {
    problems.push(
      `signal-engine: status error — ${(botRow.last_error ?? "").slice(0, 160)}`,
    );
  } else if (heartbeatAgeMinutes > maxAgeMinutes) {
    problems.push(
      `signal-engine: heartbeat for gammel (${Math.round(heartbeatAgeMinutes)} min > ${maxAgeMinutes})`,
    );
  } else {
    heartbeatOk = true;
  }
}

const { data: sigRow, error: sigErr } = await supabase
  .from("trading_signals")
  .select("created_at")
  .order("created_at", { ascending: false })
  .limit(1)
  .maybeSingle();

if (sigErr) {
  problems.push(`trading_signals query: ${sigErr.message}`);
}

const feedAgeMinutes =
  sigRow?.created_at != null
    ? Number(
        (
          (Date.now() - new Date(sigRow.created_at).getTime()) /
          60_000
        ).toFixed(2),
      )
    : null;

const feedStale = feedAgeMinutes != null && feedAgeMinutes > maxAgeMinutes;

// Kun når vi ikke har OK heartbeat: gamle feed-rader er alvorlig
if (!heartbeatOk && !sigErr) {
  if (!sigRow?.created_at) {
    problems.push("trading_signals: ingen rader (og heartbeat ikke OK)");
  } else if (feedStale) {
    problems.push(
      `trading_signals: siste rad for gammel (${Math.round(feedAgeMinutes)} min) og ingen fersk heartbeat`,
    );
  }
}

const { count: botCount, error: lbErr } = await supabase
  .from("leaderboard_bots")
  .select("id", { count: "exact", head: true })
  .eq("is_active", true);

if (lbErr) {
  problems.push(`leaderboard_bots count: ${lbErr.message}`);
} else if (!botCount || botCount < 1) {
  problems.push(
    "leaderboard_bots: ingen aktive rader (is_active=true) — discover blir tom uten trader_profiles-fallback",
  );
}

const { count: pubProfiles, error: profErr } = await supabase
  .from("trader_profiles")
  .select("id", { count: "exact", head: true })
  .eq("is_public", true);

if (profErr) {
  problems.push(`trader_profiles (public): ${profErr.message}`);
}

const report = {
  signal_engine: {
    last_heartbeat: heartbeatAt,
    heartbeat_age_minutes: heartbeatAgeMinutes,
    status: botRow?.status ?? null,
    heartbeat_ok: heartbeatOk,
  },
  trading_signals: {
    latest_created_at: sigRow?.created_at ?? null,
    latest_age_minutes: feedAgeMinutes,
    feed_stale_vs_threshold: feedStale,
    /** Sant når det finnes minst én rad (uavhengig av alder) */
    has_rows: sigRow?.created_at != null,
  },
  leaderboard_bots_active: botCount ?? 0,
  trader_profiles_public: pubProfiles ?? 0,
  problems,
};

console.log(JSON.stringify(report, null, 2));

if (problems.length > 0) {
  console.error("\n→ Fant problemer — se «problems» over.");
  process.exit(1);
}

console.log(
  "\n→ Signal-engine heartbeat OK. Gammel siste feed-rad kan være normalt (HOLD).",
);
process.exit(0);
