#!/usr/bin/env node
/**
 * RESET av 10 testbrukere (@klarpakke.test) + Viking_NO (outlier/pengeprinter-konto).
 * Godkjent av Tom 2026-07-28 ("alt må fikses"). Backup før sletting.
 *   node scratch/reset-test-accounts.mjs --apply
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
const START_BALANCE = 100000;

const USERS = {
  "anne.mo@klarpakke.test": "7734a444-0094-4a8a-9744-cd09c2a2cfd2",
  "bjorn.fjell@klarpakke.test": "4bd58f81-c41c-49ca-a712-b5aecbc8548d",
  "ingrid.sol@klarpakke.test": "4211b1c7-2b0d-4a55-b397-a10b3ae598a7",
  "kari.aas@klarpakke.test": "eb292ddd-c3ee-45d0-be98-2ce6bd7f10a8",
  "lars.vik@klarpakke.test": "241e1133-c895-4e64-a02f-447af4ea90b6",
  "marte.hav@klarpakke.test": "10de2b9b-62c3-43a0-8d83-c1e38aecba5d",
  "ola.nordmann@klarpakke.test": "67db9b24-3c98-4196-9f88-e70c2c164a03",
  "per.berg@klarpakke.test": "d4480fda-6c67-4e77-b4a3-ad4b7d00f652",
  "silje.lund@klarpakke.test": "165b894d-f747-4c1a-8ca1-1e9e2df0925a",
  "trond.dal@klarpakke.test": "f4d68672-d994-4d4b-855a-36f39c71d09d",
  "Viking_NO (outlier)": "814b8c67-1534-4a47-8c66-40a3f80870cd",
};

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

async function fetchAll(table, uid) {
  let rows = [], from = 0;
  while (true) {
    const { data, error } = await supabase.from(table).select("*").eq("user_id", uid).range(from, from + 999);
    if (error) throw new Error(`${table}: ${error.message}`);
    rows = rows.concat(data);
    if (data.length < 1000) break;
    from += 1000;
  }
  return rows;
}

const ts = new Date().toISOString().replace(/[:.]/g, "-");
const backup = {};
for (const [label, uid] of Object.entries(USERS)) {
  const [trades, sessions, accounts] = await Promise.all([
    fetchAll("trades", uid),
    fetchAll("trading_sessions", uid),
    fetchAll("paper_accounts", uid),
  ]);
  backup[label] = { uid, trades, sessions, accounts };
  console.log(`${label}: ${trades.length} trades, ${sessions.length} sesjoner, saldo ${accounts.map((a) => a.current_balance).join("/") || "(ingen konto)"}`);
}
const backupPath = path.join(__dirname, `test-accounts-reset-backup-${ts}.json`);
fs.writeFileSync(backupPath, JSON.stringify(backup, null, 2));
console.log(`\nBackup: ${backupPath} (${(fs.statSync(backupPath).size / 1e6).toFixed(1)} MB)`);

if (!APPLY) { console.log("\nDRY-RUN — kjør med --apply."); process.exit(0); }

for (const [label, data] of Object.entries(backup)) {
  const { uid, trades, sessions, accounts } = data;
  for (let i = 0; i < trades.length; i += 200) {
    const { error } = await supabase.from("trades").delete().in("id", trades.slice(i, i + 200).map((t) => t.id));
    if (error) { console.error(`${label}: trade-sletting feilet: ${error.message}`); process.exit(1); }
  }
  for (let i = 0; i < sessions.length; i += 200) {
    const { error } = await supabase.from("trading_sessions").delete().in("id", sessions.slice(i, i + 200).map((s) => s.id));
    if (error) { console.error(`${label}: sesjonssletting feilet: ${error.message}`); process.exit(1); }
  }
  for (const a of accounts) {
    const { error } = await supabase.from("paper_accounts").update({
      current_balance: START_BALANCE, total_profit_loss: 0, win_count: 0, loss_count: 0,
      updated_at: new Date().toISOString(),
    }).eq("id", a.id);
    if (error) { console.error(`${label}: konto-reset feilet: ${error.message}`); process.exit(1); }
  }
  console.log(`${label}: ${trades.length} trades + ${sessions.length} sesjoner slettet, saldo -> ${START_BALANCE}`);
}

// Verifiser
console.log("\nVerifikasjon:");
for (const [label, uid] of Object.entries(USERS)) {
  const { count: tc } = await supabase.from("trades").select("*", { count: "exact", head: true }).eq("user_id", uid);
  const { data: acc } = await supabase.from("paper_accounts").select("current_balance").eq("user_id", uid);
  const { data: prof } = await supabase.from("user_profiles").select("paper_balance").eq("id", uid).single();
  console.log(`${label}: trades=${tc} saldo=${acc?.map((a) => a.current_balance).join("/") || "-"} profil=${prof?.paper_balance ?? "-"}`);
}
console.log("FERDIG");
