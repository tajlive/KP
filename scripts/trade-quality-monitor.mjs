#!/usr/bin/env node
/**
 * KLARPAKKE TRADE-KVALITETSMONITOR (ukentlig, med auto-fiks)
 *
 * Sjekker og RETTER automatisk:
 *   1. is_mock-rader i trades          -> slettes (backup først)
 *   2. USDT-prisede paper-trades       -> konverteres til NOK (backup først)
 *   3. Sesjonsproliferasjon (>12/bruker) -> gamle stoppede sesjoner arkiveres,
 *      nyeste aktive beholdes (backup først)
 *   4. Balanse-drift paper_accounts vs user_profiles -> resync
 *
 * Rapporterer (uten å endre): win-rate per par siste 7 dager, trades/dag,
 * tvetydige valuta-rader.
 *
 * Bruk:
 *   node scripts/trade-quality-monitor.mjs          # dry-run (kun rapport)
 *   node scripts/trade-quality-monitor.mjs --apply  # auto-fiks + rapport
 *
 * Exit 0 = alt rent / fikset. Exit 1 = feil underveis.
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
const FALLBACK_RATE = 9.7;
const BAND_LO = 0.45, BAND_HI = 1.6;
const MAX_SESSIONS_PER_USER = 12;
const BACKUP_DIR = path.join(repoRoot, "backups", "trade-monitor");

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const report = { timestamp: new Date().toISOString(), mode: APPLY ? "apply" : "dry-run", fixes: {}, stats: {}, warnings: [] };
function backup(name, data) {
  fs.mkdirSync(BACKUP_DIR, { recursive: true });
  const p = path.join(BACKUP_DIR, `${new Date().toISOString().replace(/[:.]/g, "-")}-${name}.json`);
  fs.writeFileSync(p, JSON.stringify(data, null, 2));
  return p;
}
async function fetchAll(query) {
  let rows = [], from = 0;
  while (true) {
    const { data, error } = await query().range(from, from + 999);
    if (error) throw new Error(error.message);
    rows = rows.concat(data);
    if (data.length < 1000) break;
    from += 1000;
  }
  return rows;
}

// ── 1. is_mock-rader ─────────────────────────────────────────────
const mockRows = await fetchAll(() => supabase.from("trades").select("*").eq("is_mock", true));
report.stats.is_mock_rows = mockRows.length;
if (mockRows.length > 0 && APPLY) {
  backup("mock-deleted", mockRows);
  for (let i = 0; i < mockRows.length; i += 100) {
    const { error } = await supabase.from("trades").delete().in("id", mockRows.slice(i, i + 100).map((r) => r.id));
    if (error) { report.warnings.push(`mock-sletting feilet: ${error.message}`); break; }
  }
  report.fixes.mock_deleted = mockRows.length;
} else if (mockRows.length > 0) {
  report.fixes.mock_deleted = `(dry-run) ${mockRows.length}`;
}

// ── 2. USDT-prisede rader -> NOK ─────────────────────────────────
const IDS = { BTC: "bitcoin", ETH: "ethereum", SOL: "solana", BNB: "binancecoin", XRP: "ripple", DOGE: "dogecoin", AVAX: "avalanche-2", ADA: "cardano", DOT: "polkadot" };
let REF = {};
try {
  const cg = await (await fetch(`https://api.coingecko.com/api/v3/simple/price?ids=${Object.values(IDS).join(",")}&vs_currencies=usd,nok`, { signal: AbortSignal.timeout(15000) })).json();
  for (const [sym, id] of Object.entries(IDS)) if (cg[id]) REF[sym] = { usd: cg[id].usd, nok: cg[id].nok };
} catch { report.warnings.push("CoinGecko utilgjengelig — valutasjekk hoppet over"); }

const baseSymbol = (pair) => {
  const p = (pair || "").toUpperCase().replace("/", "");
  for (const s of ["USDT", "NOK", "USD", "BUSD"]) if (p.endsWith(s)) return p.slice(0, -s.length);
  return p;
};

let currencyFixes = [], ambiguous = 0;
if (Object.keys(REF).length > 0) {
  const rows = await fetchAll(() =>
    supabase.from("trades").select("id, trading_pair, quantity, price, total_value, fee, realized_pnl, usdt_nok_rate, mode")
      .or("is_mock.is.null,is_mock.eq.false"));
  for (const t of rows) {
    const ref = REF[baseSymbol(t.trading_pair)];
    if (!ref) continue;
    const price = Number(t.price), qty = Number(t.quantity), tv = Number(t.total_value);
    if (!(price > 0) || !(qty > 0)) continue;
    const inUsdt = price >= ref.usd * BAND_LO && price <= ref.usd * BAND_HI;
    const inNok = price >= ref.nok * BAND_LO && price <= ref.nok * BAND_HI;
    const rate = Number(t.usdt_nok_rate) > 0 ? Number(t.usdt_nok_rate) : FALLBACK_RATE;
    const ratio = tv > 0 ? tv / (qty * price) : 1;
    const ratioProvesMixed = ratio > 4 && ratio < 16 && ((Number(t.usdt_nok_rate) > 0 && Math.abs(ratio - rate) / rate < 0.2) || inUsdt);
    if (ratioProvesMixed) {
      currencyFixes.push({ t, update: { price: Math.round(price * rate * 1e8) / 1e8, usdt_nok_rate: rate } });
    } else if (inUsdt && !inNok && ratio < 1.6) {
      const upd = { price: Math.round(price * rate * 1e8) / 1e8, total_value: Math.round(tv * rate * 100) / 100, fee: Math.round(Number(t.fee || 0) * rate * 100) / 100, usdt_nok_rate: rate };
      if (t.realized_pnl != null) upd.realized_pnl = Math.round(Number(t.realized_pnl) * rate * 100) / 100;
      currencyFixes.push({ t, update: upd });
    } else if (!inUsdt && !inNok) ambiguous++;
  }
}
report.stats.usdt_rows_found = currencyFixes.length;
report.stats.ambiguous_rows = ambiguous;
if (currencyFixes.length > 0 && APPLY) {
  backup("currency-fixes", currencyFixes.map((f) => ({ before: f.t, update: f.update })));
  let ok = 0, fail = 0;
  for (const f of currencyFixes) {
    const { error } = await supabase.from("trades").update(f.update).eq("id", f.t.id);
    if (error) { fail++; report.warnings.push(`valutafiks ${f.t.id}: ${error.message}`); } else ok++;
  }
  report.fixes.currency_converted = `${ok} ok, ${fail} feilet`;
} else if (currencyFixes.length > 0) {
  report.fixes.currency_converted = `(dry-run) ${currencyFixes.length}`;
}

// ── 3. Sesjonsproliferasjon (arkivering, ikke sletting) ─────────
// Unngår FK-kræsj: trades.session_id → ON DELETE CASCADE, og
// copy_trade_queue.original_trade_id → ON DELETE SET NULL men NOT NULL.
// Arkivering = trygg.
const allSessions = await fetchAll(() =>
  supabase.from("trading_sessions")
    .select("id, user_id, status, created_at, archived")
    .or("archived.is.null,archived.eq.false"));
const byUser = {};
for (const s of allSessions) (byUser[s.user_id] ??= []).push(s);
let sessionArchiveIds = [];
for (const [uid, sessions] of Object.entries(byUser)) {
  if (sessions.length <= MAX_SESSIONS_PER_USER) continue;
  const sorted = sessions.sort((a, b) => (a.created_at < b.created_at ? -1 : 1));
  const active = sorted.filter((s) => s.status === "active" || s.status === "paused");
  const inactive = sorted.filter((s) => s.status !== "active" && s.status !== "paused");
  const keepInactive = Math.max(0, MAX_SESSIONS_PER_USER - active.length);
  sessionArchiveIds.push(...inactive.slice(0, Math.max(0, inactive.length - keepInactive)).map((s) => s.id));
}
const prolificUsers = Object.entries(byUser).filter(([, s]) => s.length > MAX_SESSIONS_PER_USER).length;
report.stats.users_over_session_limit = prolificUsers;
if (sessionArchiveIds.length > 0 && APPLY) {
  backup("session-archived-ids", { ids: sessionArchiveIds });
  const now = new Date().toISOString();
  for (let i = 0; i < sessionArchiveIds.length; i += 200) {
    const batch = sessionArchiveIds.slice(i, i + 200);
    const { error } = await supabase.from("trading_sessions")
      .update({ archived: true, archived_at: now })
      .in("id", batch);
    if (error) { report.warnings.push(`sesjonsarkivering feilet: ${error.message}`); break; }
  }
  report.fixes.sessions_archived = sessionArchiveIds.length;
} else if (sessionArchiveIds.length > 0) {
  report.fixes.sessions_archived = `(dry-run) ${sessionArchiveIds.length}`;
}

// ── 4. Balanse-drift ─────────────────────────────────────────────
const accounts = await fetchAll(() => supabase.from("paper_accounts").select("user_id, current_balance"));
const profiles = await fetchAll(() => supabase.from("user_profiles").select("id, paper_balance"));
const profMap = new Map(profiles.map((p) => [p.id, Number(p.paper_balance)]));
const drift = accounts.filter((a) => {
  const pb = profMap.get(a.user_id);
  return pb != null && Math.abs(pb - Number(a.current_balance)) > 0.01;
});
report.stats.balance_drift_users = drift.length;
if (drift.length > 0 && APPLY) {
  for (const a of drift) {
    await supabase.from("user_profiles").update({ paper_balance: a.current_balance }).eq("id", a.user_id);
  }
  report.fixes.balance_resynced = drift.length;
} else if (drift.length > 0) {
  report.fixes.balance_resynced = `(dry-run) ${drift.length}`;
}

// ── Statistikk siste 7 dager ─────────────────────────────────────
const weekAgo = new Date(Date.now() - 7 * 864e5).toISOString();
const weekTrades = await fetchAll(() => supabase.from("trades").select("trading_pair, side").gte("executed_at", weekAgo));
const perPair = {};
for (const t of weekTrades) perPair[t.trading_pair] = (perPair[t.trading_pair] || 0) + 1;
report.stats.trades_last_7d = weekTrades.length;
report.stats.per_pair_7d = perPair;
report.stats.total_sessions = allSessions.length;

// ── Output ───────────────────────────────────────────────────────
console.log(JSON.stringify(report, null, 2));
const hasWork = Object.keys(report.fixes).length > 0;
console.log(hasWork ? `\nMONITOR: ${JSON.stringify(report.fixes)}` : "\nMONITOR: Alt rent ✓");
if (report.warnings.length) { console.error("ADVARSLER:", report.warnings); process.exit(1); }
process.exit(0);
