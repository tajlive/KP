#!/usr/bin/env node
/**
 * Sett lekepenger (NOK) for en bruker: user_profiles.paper_balance + alle aktive paper trading_sessions.
 *
 *   node --env-file=.env.local scripts/set-user-paper-balance.mjs --email=user@x.com --nok=1000000
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

const emailArg = arg("--email");
const nokRaw = arg("--nok");

if (!url || !key) {
  console.error("Mangler NEXT_PUBLIC_SUPABASE_URL eller SUPABASE_SERVICE_ROLE_KEY.");
  process.exit(2);
}
if (!emailArg || !nokRaw) {
  console.error("Bruk: --email=<e-post> --nok=<tall>");
  process.exit(2);
}

const nok = Math.round(Number(nokRaw));
if (!Number.isFinite(nok) || nok < 0 || nok > 1e12) {
  console.error("Ugyldig --nok");
  process.exit(2);
}

const supabase = createClient(url, key, {
  auth: { autoRefreshToken: false, persistSession: false },
});

async function userIdByEmail(email) {
  const target = email.trim().toLowerCase();
  let page = 1;
  for (let i = 0; i < 50; i++) {
    const { data, error } = await supabase.auth.admin.listUsers({
      page,
      perPage: 200,
    });
    if (error) throw error;
    const u = data.users.find((x) => (x.email ?? "").toLowerCase() === target);
    if (u) return u.id;
    if (data.users.length < 200) return null;
    page += 1;
  }
  return null;
}

const userId = await userIdByEmail(emailArg);
if (!userId) {
  console.error("Bruker ikke funnet i auth.");
  process.exit(1);
}

const now = new Date().toISOString();

const { error: profErr } = await supabase
  .from("user_profiles")
  .update({ paper_balance: nok, updated_at: now })
  .eq("id", userId);

if (profErr) {
  console.error("user_profiles update:", profErr.message);
  process.exit(1);
}

const { data: sessions, error: sessErr } = await supabase
  .from("trading_sessions")
  .select("id")
  .eq("user_id", userId)
  .eq("mode", "paper")
  .eq("status", "active");

if (sessErr) {
  console.error("trading_sessions select:", sessErr.message);
  process.exit(1);
}

let sessionUpdates = 0;
for (const row of sessions ?? []) {
  const { error: uErr } = await supabase
    .from("trading_sessions")
    .update({
      current_capital_nok: nok,
      starting_capital_nok: nok,
      current_capital: nok,
      initial_capital: nok,
      updated_at: now,
    })
    .eq("id", row.id);
  if (uErr) {
    console.error("session update", row.id, uErr.message);
    process.exit(1);
  }
  sessionUpdates += 1;
}

console.log(
  JSON.stringify(
    {
      user_id: userId,
      paper_balance_nok: nok,
      user_profiles_updated: true,
      active_paper_sessions_updated: sessionUpdates,
    },
    null,
    2,
  ),
);
