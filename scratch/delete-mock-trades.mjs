#!/usr/bin/env node
/**
 * Slett is_mock=true trades fra prod (falske rader med tilfeldige priser/PnL
 * fra test-cron-scripts). Full backup skrives til scratch/mock-backup-<ts>.json
 * FØR sletting. Presedens: supabase/migrations/20260501160200_remove_fake_bot_trades.sql
 *
 *   node scratch/delete-mock-trades.mjs          # dry-run
 *   node scratch/delete-mock-trades.mjs --apply  # sletter
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
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

let rows = [], from = 0;
while (true) {
  const { data, error } = await supabase.from("trades").select("*").eq("is_mock", true).range(from, from + 999);
  if (error) { console.error("Fetch feilet:", error.message); process.exit(1); }
  rows = rows.concat(data);
  if (data.length < 1000) break;
  from += 1000;
}
console.log(`is_mock-rader funnet: ${rows.length}`);
const perUser = {};
for (const r of rows) perUser[r.user_id] = (perUser[r.user_id] || 0) + 1;
console.log("Fordelt på brukere:", Object.keys(perUser).length);

const ts = new Date().toISOString().replace(/[:.]/g, "-");
const backupPath = path.join(__dirname, `mock-backup-${ts}.json`);
fs.writeFileSync(backupPath, JSON.stringify(rows, null, 2));
console.log(`Backup skrevet: ${backupPath} (${(fs.statSync(backupPath).size / 1e6).toFixed(1)} MB)`);

if (!APPLY) { console.log("\nDRY-RUN — ingenting slettet. Kjør med --apply."); process.exit(0); }

let deleted = 0;
for (let i = 0; i < rows.length; i += 100) {
  const ids = rows.slice(i, i + 100).map((r) => r.id);
  const { error } = await supabase.from("trades").delete().in("id", ids);
  if (error) { console.error(`Slettefeil batch ${i}: ${error.message}`); process.exit(1); }
  deleted += ids.length;
}
console.log(`Slettet: ${deleted}`);

const { count } = await supabase.from("trades").select("*", { count: "exact", head: true }).eq("is_mock", true);
console.log(`Gjenstående is_mock-rader: ${count}`);
process.exit(count === 0 ? 0 : 1);
