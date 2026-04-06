#!/usr/bin/env node
/**
 * Diagnostikk: handler og sesjoner for én bruker (service role).
 * Kjør fra repo-roten:
 *   node --env-file=.env.local scripts/diagnose-user-trades.mjs --user-id=<uuid>
 *   node --env-file=.env.local scripts/diagnose-user-trades.mjs --email=user@example.com
 *
 * Leser NEXT_PUBLIC_SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY.
 * Skriver ikke e-post eller hemmeligheter til stdout (kun aggregater + siste tidsstempler).
 * Exit 2: manglende env/argumenter. Exit 1: bruker ikke funnet. Exit 0: OK.
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

function arg(name) {
  const p = process.argv.find((a) => a.startsWith(`${name}=`));
  return p ? p.slice(name.length + 1) : null;
}

const userIdArg = arg("--user-id");
const emailArg = arg("--email");

if (!url || !key) {
  console.error(
    "Mangler NEXT_PUBLIC_SUPABASE_URL og/eller SUPABASE_SERVICE_ROLE_KEY (bruk .env.local eller --env-file).",
  );
  process.exit(2);
}

if (!userIdArg && !emailArg) {
  console.error("Oppgi --user-id=<uuid> eller --email=<adresse>.");
  process.exit(2);
}

const supabase = createClient(url, key, {
  auth: { autoRefreshToken: false, persistSession: false },
});

async function resolveUserIdFromEmail(email) {
  let page = 1;
  const perPage = 200;
  const target = email.trim().toLowerCase();
  for (let i = 0; i < 50; i++) {
    const { data, error } = await supabase.auth.admin.listUsers({
      page,
      perPage,
    });
    if (error) throw error;
    const u = data.users.find(
      (x) => (x.email ?? "").toLowerCase() === target,
    );
    if (u) return u.id;
    if (data.users.length < perPage) return null;
    page += 1;
  }
  return null;
}

let userId = userIdArg?.trim() ?? null;
if (!userId && emailArg) {
  userId = await resolveUserIdFromEmail(emailArg);
  if (!userId) {
    console.error("Ingen auth-bruker matchet oppgitt e-post (første ~10k brukere søkt paginert).");
    process.exit(1);
  }
}

const uuidRe =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
if (!userId || !uuidRe.test(userId)) {
  console.error("Ugyldig eller manglende user-id.");
  process.exit(2);
}

const { data: profile, error: profileErr } = await supabase
  .from("user_profiles")
  .select("id")
  .eq("id", userId)
  .maybeSingle();

const { count: tradeCount, error: tradeCountErr } = await supabase
  .from("trades")
  .select("id", { count: "exact", head: true })
  .eq("user_id", userId);

const { data: lastTrades, error: lastTradesErr } = await supabase
  .from("trades")
  .select("created_at, mode")
  .eq("user_id", userId)
  .order("created_at", { ascending: false })
  .limit(200);

const { count: sessionCount, error: sessErr } = await supabase
  .from("trading_sessions")
  .select("id", { count: "exact", head: true })
  .eq("user_id", userId);

let legacyCount = null;
let legacyErr = null;
for (const table of ["trade_history", "trade_history_legacy"]) {
  const { count, error } = await supabase
    .from(table)
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId);
  if (!error) {
    legacyCount = count;
    legacyErr = null;
    break;
  }
  legacyErr = error.message;
}

let paperInSample = 0;
let liveInSample = 0;
for (const r of lastTrades ?? []) {
  const m = String(r.mode ?? "")
    .trim()
    .toLowerCase();
  if (m === "live") liveInSample += 1;
  else paperInSample += 1;
}

const out = {
  user_id: userId,
  user_profiles_row: profileErr ? null : !!profile,
  profile_error: profileErr?.message ?? null,
  trades_total_count: tradeCountErr ? null : tradeCount,
  trades_count_error: tradeCountErr?.message ?? null,
  last_trades_sample_error: lastTradesErr?.message ?? null,
  last_trade_created_at: lastTrades?.[0]?.created_at ?? null,
  sample_200_paper: paperInSample,
  sample_200_live: liveInSample,
  trading_sessions_total: sessErr ? null : sessionCount,
  sessions_error: sessErr?.message ?? null,
  trade_history_legacy_count: legacyCount,
  trade_history_note: legacyErr
    ? `query_unavailable: ${legacyErr}`
    : "app handelshistorikk bruker public.trades — legacy kun til sammenligning",
};

console.log(JSON.stringify(out, null, 2));

if (tradeCountErr || lastTradesErr || sessErr) {
  process.exit(1);
}
process.exit(0);
