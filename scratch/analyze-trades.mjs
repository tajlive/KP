#!/usr/bin/env node
/**
 * Analyse av paper-trades for én bruker + aggregat for alle brukere.
 * Kjør: node scratch/analyze-trades.mjs
 * Leser NEXT_PUBLIC_SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY fra .env.local/.env
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
if (!url || !key) { console.error("Mangler env"); process.exit(2); }

const supabase = createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } });
const EMAIL = "tomarnejensen@gmail.com";

async function resolveUserId(email) {
  // listUsers (admin) feiler med 500 mot dette prosjektet — logg inn som testbruker i stedet.
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!anon) throw new Error("Mangler NEXT_PUBLIC_SUPABASE_ANON_KEY");
  const userClient = createClient(url, anon, { auth: { autoRefreshToken: false, persistSession: false } });
  const { data, error } = await userClient.auth.signInWithPassword({
    email,
    password: process.env.TEST_USER_PASSWORD ?? "TestTest123!",
  });
  if (error) throw error;
  return data.user.id;
}

async function fetchAll(table, filter) {
  let rows = [], from = 0;
  const step = 1000;
  while (true) {
    let q = supabase.from(table).select("*").range(from, from + step - 1);
    if (filter) q = filter(q);
    const { data, error } = await q;
    if (error) { console.error(`Feil ved henting fra ${table}:`, error.message); break; }
    rows = rows.concat(data);
    if (data.length < step) break;
    from += step;
  }
  return rows;
}

const userId = await resolveUserId(EMAIL);
if (!userId) { console.error("Bruker ikke funnet"); process.exit(1); }
console.log("USER_ID:", userId);

// --- Data for målbruker ---
const [accounts, sessions, trades, autoCfg, profile] = await Promise.all([
  fetchAll("paper_accounts", (q) => q.eq("user_id", userId)),
  fetchAll("trading_sessions", (q) => q.eq("user_id", userId)),
  fetchAll("trades", (q) => q.eq("user_id", userId).order("executed_at", { ascending: true })),
  fetchAll("user_auto_trading_configs", (q) => q.eq("user_id", userId)),
  fetchAll("user_profiles", (q) => q.eq("id", userId)),
]);

const out = { userId, accounts, sessions, trades, autoCfg, profile };
fs.writeFileSync(path.join(__dirname, "tom-trades-raw.json"), JSON.stringify(out, null, 2));
console.log(`Hentet: ${accounts.length} paper_accounts, ${sessions.length} sesjoner, ${trades.length} trades, ${autoCfg.length} auto-configs`);

// --- Aggregat for ALLE brukere (kun tall, ingen e-post) ---
const allTrades = await fetchAll("trades", (q) => q.order("executed_at", { ascending: true }));
const allSessions = await fetchAll("trading_sessions");
const allAccounts = await fetchAll("paper_accounts");
fs.writeFileSync(path.join(__dirname, "all-trades-raw.json"), JSON.stringify({ allTrades, allSessions, allAccounts }));

const usersWithTrades = new Set(allTrades.map((t) => t.user_id));
console.log(`ALLE: ${allTrades.length} trades, ${allSessions.length} sesjoner, ${allAccounts.length} paper_accounts, ${usersWithTrades.size} brukere med trades`);
console.log("OK");
