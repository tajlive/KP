#!/usr/bin/env node
/**
 * RESET av paper-konto for tomarnejensen@gmail.com (godkjent av Tom 2026-07-28).
 *  - Backup av trades, trading_sessions, paper_accounts, user_profiles -> scratch/
 *  - Sletter alle trades + trading_sessions for brukeren
 *  - Nullstiller paper_accounts til 100 000 NOK (trigger syncer user_profiles)
 *  - Beholder auto_trade_settings (auto-trading fortsetter med rent ark)
 *
 *   node scratch/reset-tom-account.mjs          # dry-run
 *   node scratch/reset-tom-account.mjs --apply
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
const APPLY = process.argv.includes("--apply");
const USER_ID = "0dd08529-b8a8-4fd3-9806-275e2d0135dd";
const START_BALANCE = 100000;

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

async function fetchAll(table, col) {
  let rows = [], from = 0;
  while (true) {
    const { data, error } = await supabase.from(table).select("*").eq(col, USER_ID).range(from, from + 999);
    if (error) throw new Error(`${table}: ${error.message}`);
    rows = rows.concat(data);
    if (data.length < 1000) break;
    from += 1000;
  }
  return rows;
}

const [trades, sessions, accounts, profiles] = await Promise.all([
  fetchAll("trades", "user_id"),
  fetchAll("trading_sessions", "user_id"),
  fetchAll("paper_accounts", "user_id"),
  supabase.from("user_profiles").select("*").eq("id", USER_ID).then((r) => r.data ?? []),
]);

console.log(`Funnet: ${trades.length} trades, ${sessions.length} sesjoner, ${accounts.length} paper_accounts`);
console.log("Nåværende saldo:", accounts.map((a) => a.current_balance).join(", "));

const ts = new Date().toISOString().replace(/[:.]/g, "-");
const backupPath = path.join(__dirname, `tom-reset-backup-${ts}.json`);
fs.writeFileSync(backupPath, JSON.stringify({ trades, sessions, accounts, profiles }, null, 2));
console.log(`Backup: ${backupPath}`);

if (!APPLY) { console.log("\nDRY-RUN — kjør med --apply for å utføre."); process.exit(0); }

// 1) Slett trades
for (let i = 0; i < trades.length; i += 200) {
  const ids = trades.slice(i, i + 200).map((t) => t.id);
  const { error } = await supabase.from("trades").delete().in("id", ids);
  if (error) { console.error("Trade-sletting feilet:", error.message); process.exit(1); }
}
console.log(`Slettet ${trades.length} trades`);

// 2) Slett sesjoner
for (let i = 0; i < sessions.length; i += 200) {
  const ids = sessions.slice(i, i + 200).map((s) => s.id);
  const { error } = await supabase.from("trading_sessions").delete().in("id", ids);
  if (error) { console.error("Sesjonssletting feilet:", error.message); process.exit(1); }
}
console.log(`Slettet ${sessions.length} sesjoner`);

// 3) Nullstill paper_accounts
for (const a of accounts) {
  const { error } = await supabase.from("paper_accounts").update({
    current_balance: START_BALANCE,
    total_profit_loss: 0,
    win_count: 0,
    loss_count: 0,
    updated_at: new Date().toISOString(),
  }).eq("id", a.id);
  if (error) { console.error("paper_accounts reset feilet:", error.message); process.exit(1); }
}
console.log(`paper_accounts nullstilt til ${START_BALANCE} NOK`);

// 4) Verifiser synk til user_profiles (DB-trigger sync_paper_balance)
await new Promise((r) => setTimeout(r, 1500));
const { data: prof } = await supabase.from("user_profiles").select("paper_balance").eq("id", USER_ID).single();
console.log("user_profiles.paper_balance etter reset:", prof?.paper_balance);
if (Number(prof?.paper_balance) !== START_BALANCE) {
  console.warn("Trigger synket ikke — oppdaterer manuelt");
  await supabase.from("user_profiles").update({ paper_balance: START_BALANCE }).eq("id", USER_ID);
}

// 5) Sluttverifikasjon
const { count: tc } = await supabase.from("trades").select("*", { count: "exact", head: true }).eq("user_id", USER_ID);
const { count: sc } = await supabase.from("trading_sessions").select("*", { count: "exact", head: true }).eq("user_id", USER_ID);
const { data: acc } = await supabase.from("paper_accounts").select("current_balance").eq("user_id", USER_ID);
console.log(`\nFERDIG: trades=${tc}, sesjoner=${sc}, saldo=${acc?.map((a) => a.current_balance).join(",")}`);
