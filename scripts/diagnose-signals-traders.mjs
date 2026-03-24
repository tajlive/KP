#!/usr/bin/env node
/**
 * Diagnostikk mot Supabase (service role): trading_signals + leaderboard_bots.
 * Kjør fra repo-roten med nøkler i miljø, f.eks.:
 *   node --env-file=.env.local scripts/diagnose-signals-traders.mjs
 *
 * Exit 1 hvis: ingen signaler, signaler eldre enn max-alder, eller ingen aktive ledere.
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

const { data: sigRow, error: sigErr } = await supabase
  .from("trading_signals")
  .select("created_at")
  .order("created_at", { ascending: false })
  .limit(1)
  .maybeSingle();

if (sigErr) {
  problems.push(`trading_signals query: ${sigErr.message}`);
} else if (!sigRow?.created_at) {
  problems.push("trading_signals: ingen rader");
} else {
  const ageMin = (Date.now() - new Date(sigRow.created_at).getTime()) / 60_000;
  if (ageMin > maxAgeMinutes) {
    problems.push(
      `trading_signals: siste signal for gammel (${Math.round(ageMin)} min > ${maxAgeMinutes})`,
    );
  }
}

const { count: botCount, error: botErr } = await supabase
  .from("leaderboard_bots")
  .select("id", { count: "exact", head: true })
  .eq("is_active", true);

if (botErr) {
  problems.push(`leaderboard_bots count: ${botErr.message}`);
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
  trading_signals: {
    latest_created_at: sigRow?.created_at ?? null,
    latest_age_minutes:
      sigRow?.created_at != null
        ? Number(
            (
              (Date.now() - new Date(sigRow.created_at).getTime()) /
              60_000
            ).toFixed(2),
          )
        : null,
    ok: !sigErr && sigRow?.created_at != null,
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

console.log("\n→ Data ser levende ut ift. terskler (sjekk likevel signal-engine/cron i Supabase).");
process.exit(0);
