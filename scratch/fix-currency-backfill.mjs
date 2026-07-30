#!/usr/bin/env node
/**
 * BACKFILL: Konverter USDT-prisede paper-trades til NOK.
 *
 * Klassifisering per rad:
 *  - Prisbånd rundt dagens CoinGecko-pris (±55 %): USDT-bånd og NOK-bånd er
 *    disjunkte fordi kursen er ~9.7x.
 *  - ratio = total_value / (qty*price):
 *      ~1   => hele raden er USDT  => konverter price, total_value, fee, realized_pnl
 *      ~9.7 => pris USDT, resten NOK (executePaperTrade-bug) => konverter kun price
 *  - Utenfor begge bånd => uberørt, rapporteres som "ambiguous".
 *
 * Bruk:
 *   node scratch/fix-currency-backfill.mjs          # dry-run (ingen skriving)
 *   node scratch/fix-currency-backfill.mjs --apply  # skriver til DB
 *
 * Backup av alle rader som endres skrives til scratch/backfill-backup-<ts>.json
 * uansett modus. is_mock-rader håndteres av eget script (delete-mock-trades.mjs).
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

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) { console.error("Mangler env"); process.exit(2); }
const supabase = createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } });

// 1) Dagens priser (USDT og NOK) fra CoinGecko
const IDS = {
  BTC: "bitcoin", ETH: "ethereum", SOL: "solana", BNB: "binancecoin",
  XRP: "ripple", DOGE: "dogecoin", AVAX: "avalanche-2", ADA: "cardano",
  DOT: "polkadot", LINK: "chainlink", LTC: "litecoin",
};
const cg = await (await fetch(
  `https://api.coingecko.com/api/v3/simple/price?ids=${Object.values(IDS).join(",")}&vs_currencies=usd,nok`,
  { signal: AbortSignal.timeout(20000) },
)).json();
const REF = {};
for (const [sym, id] of Object.entries(IDS)) {
  if (cg[id]) REF[sym] = { usd: cg[id].usd, nok: cg[id].nok };
}
console.log("Referansepriser hentet for:", Object.keys(REF).join(", "));

function baseSymbol(pair) {
  const p = (pair || "").toUpperCase().replace("/", "");
  for (const s of ["USDT", "NOK", "USD", "BUSD"]) if (p.endsWith(s)) return p.slice(0, -s.length);
  return p;
}

// 2) Hent alle ikke-mock trades
let rows = [], from = 0;
while (true) {
  const { data, error } = await supabase
    .from("trades")
    .select("id, user_id, trading_pair, side, quantity, price, total_value, fee, realized_pnl, usdt_nok_rate, reason_code, mode, executed_at")
    .or("is_mock.is.null,is_mock.eq.false")
    .range(from, from + 999);
  if (error) { console.error("Fetch feilet:", error.message); process.exit(1); }
  rows = rows.concat(data);
  if (data.length < 1000) break;
  from += 1000;
}
console.log(`Rader å vurdere: ${rows.length}`);

// 3) Klassifiser
const fixes = [];
const ambiguous = [];
for (const t of rows) {
  const sym = baseSymbol(t.trading_pair);
  const ref = REF[sym];
  if (!ref) continue;
  const price = Number(t.price), qty = Number(t.quantity), tv = Number(t.total_value);
  if (!(price > 0) || !(qty > 0)) continue;
  const inUsdtBand = price >= ref.usd * BAND_LO && price <= ref.usd * BAND_HI;
  const inNokBand = price >= ref.nok * BAND_LO && price <= ref.nok * BAND_HI;
  const rate = Number(t.usdt_nok_rate) > 0 ? Number(t.usdt_nok_rate) : FALLBACK_RATE;
  const ratio = tv > 0 ? tv / (qty * price) : 1;
  // Blandet rad bevist hvis ratio ≈ lagret kurs (total er NOK, pris er USDT) —
  // dette gjelder uavhengig av prisbånd og sjekkes FØR bånd-logikken.
  const ratioProvesMixed =
    ratio > 4 && ratio < 16 &&
    ((Number(t.usdt_nok_rate) > 0 && Math.abs(ratio - rate) / rate < 0.2) || inUsdtBand);
  if (ratioProvesMixed) {
    fixes.push({ t, kind: "mixed", rate, update: { price: round8(price * rate), usdt_nok_rate: rate } });
    continue;
  }
  if (!inUsdtBand || inNokBand) {
    if (!inNokBand && !inUsdtBand) ambiguous.push(t);
    continue; // NOK allerede, eller utenfor begge
  }
  if (inUsdtBand && ratio < 1.6) {
    // Hele raden USDT
    const upd = {
      price: round8(price * rate),
      total_value: Math.round(tv * rate * 100) / 100,
      fee: Math.round(Number(t.fee || 0) * rate * 100) / 100,
      usdt_nok_rate: rate,
    };
    if (t.realized_pnl != null) upd.realized_pnl = Math.round(Number(t.realized_pnl) * rate * 100) / 100;
    fixes.push({ t, kind: "full", rate, update: upd });
  } else {
    ambiguous.push(t);
  }
}
function round8(x) { return Math.round(x * 1e8) / 1e8; }

const byKind = { full: fixes.filter((f) => f.kind === "full"), mixed: fixes.filter((f) => f.kind === "mixed") };
console.log(`\nKlassifisering: ${byKind.full.length} hele-USDT-rader, ${byKind.mixed.length} blandede rader, ${ambiguous.length} tvetydige (uberørt)`);
const count = (arr, fn) => arr.reduce((m, f) => { const k = fn(f); m[k] = (m[k] || 0) + 1; return m; }, {});
console.log("Hele-USDT per par:", count(byKind.full, (f) => f.t.trading_pair));
console.log("Hele-USDT per reason:", count(byKind.full, (f) => f.t.reason_code ?? "null"));
console.log("Blandede per reason:", count(byKind.mixed, (f) => f.t.reason_code ?? "null"));
console.log("Tvetydige per par:", count(ambiguous, (t) => t.trading_pair));

// 4) Backup
const ts = new Date().toISOString().replace(/[:.]/g, "-");
const backupPath = path.join(__dirname, `backfill-backup-${ts}.json`);
fs.writeFileSync(backupPath, JSON.stringify(fixes.map((f) => ({ before: f.t, kind: f.kind, update: f.update })), null, 2));
console.log(`\nBackup skrevet: ${backupPath} (${fixes.length} rader)`);

if (!APPLY) {
  console.log("\nDRY-RUN — ingen endringer skrevet. Kjør med --apply for å utføre.");
  process.exit(0);
}

// 5) Apply
let ok = 0, fail = 0;
for (const f of fixes) {
  const { error } = await supabase.from("trades").update(f.update).eq("id", f.t.id);
  if (error) { console.error(`Feil på ${f.t.id}: ${error.message}`); fail++; }
  else ok++;
}
console.log(`\nAPPLY ferdig: ${ok} oppdatert, ${fail} feilet`);
process.exit(fail > 0 ? 1 : 0);
