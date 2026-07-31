#!/usr/bin/env node
/**
 * backfill-open-positions.mjs — Re-aggregerer open_position fra trade-ledger
 *
 * Bryter smart-trader-v3's akkumulerings-bug (overskriving av open_position).
 * Kjør tørrkjøring uten --apply for å se diff, så --apply for å skrive.
 *
 * node scripts/backfill-open-positions.mjs          # bare tørrkjøring
 * node scripts/backfill-open-positions.mjs --apply  # skriv resultatet
 */

import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "node:fs";
import { parse } from "node:path";

// Les .env.local manuelt — Node.js 24 har innebygd .env-støtte, men
// vi trenger spesifikt filen fra prosjektroten.
const ENV_FILE = new URL("../.env.local", import.meta.url);
const envRaw = readFileSync(ENV_FILE, "utf-8");
const env = {};
for (const line of envRaw.split("\n")) {
  const eq = line.indexOf("=");
  if (eq > 0 && !line.startsWith("#")) {
    env[line.slice(0, eq).trim()] = line.slice(eq + 1).trim();
  }
}

const SUPABASE_URL = env.NEXT_PUBLIC_SUPABASE_URL || env.SUPABASE_URL;
const SERVICE_KEY = env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error("❌ SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY mangler i .env.local");
  process.exit(1);
}

const APPLY = process.argv.includes("--apply");
const supabase = createClient(SUPABASE_URL, SERVICE_KEY);

// Ren æra: alle trades etter 2026-07-30 11:00 UTC
const CLEAN_ERA = "2026-07-30T11:00:00.000Z";

async function main() {
  console.log(`🔧 backfill-open-positions — tørrkjøring${APPLY ? " (SKRIVEMODUS)" : " (read-only)"}`);
  console.log();

  // Hent alle aktive paper-sessions
  const { data: sessions, error: sessErr } = await supabase
    .from("trading_sessions")
    .select("id, user_id, open_position, trading_pair")
    .eq("status", "active")
    .eq("mode", "paper");

  if (sessErr) { console.error("❌ Session-query feilet:", sessErr.message); process.exit(1); }
  if (!sessions || sessions.length === 0) {
    console.log("   Ingen aktive paper-sessions funnet.");
    return;
  }
  console.log(`   ${sessions.length} aktive paper-sessions\n`);

  let fixed = 0;
  let unchanged = 0;

  for (const session of sessions) {
    const sessionId = session.id;

    // Hent leder: netto beholdning per symbol fra filled trades
    const { data: trades, error: tradeErr } = await supabase
      .from("trades")
      .select("trading_pair, side, quantity, price, executed_at")
      .eq("session_id", sessionId)
      .eq("status", "filled")
      .gte("executed_at", CLEAN_ERA)
      .order("executed_at", { ascending: true });

    if (tradeErr) {
      console.log(`   ⚠️  ${sessionId.slice(0,8)}: trade-query feilet — ${tradeErr.message}`);
      continue;
    }
    if (!trades || trades.length === 0) {
      unchanged++;
      continue;
    }

    // Gruppér per symbol
    const ledgers = new Map();
    for (const t of trades) {
      const sym = t.trading_pair;
      if (!ledgers.has(sym)) ledgers.set(sym, { qty: 0, cost: 0, high: -Infinity, first: t.executed_at });
      const l = ledgers.get(sym);
      if (t.side === "buy") {
        l.qty += t.quantity;
        l.cost += t.quantity * t.price;
        l.high = Math.max(l.high, t.price);
        if (t.executed_at < l.first) l.first = t.executed_at;
      } else {
        l.qty -= t.quantity;
        l.cost -= t.quantity * t.price; // FIFO-approksimasjon — korrekt for enkel GJ.sn.
        if (l.qty <= 0) {
          l.qty = 0;
          l.cost = 0;
          l.high = -Infinity;
        }
      }
    }

    // Finn gjeldende posisjon (størst beholdning)
    let best = null;
    for (const [sym, l] of ledgers) {
      if (l.qty > 0.000001 && (!best || l.qty > best.qty)) {
        best = {
          symbol: sym,
          side: "buy",
          quantity: +(l.qty.toFixed(8)),
          entry_price: +(l.qty > 0 ? (l.cost / l.qty).toFixed(2) : 0),
          highest_price: +(l.high > 0 ? l.high.toFixed(2) : l.entry_price ?? 0),
          total_value: +(l.cost.toFixed(2)),
          entered_at: l.first,
        };
      }
    }

    const current = session.open_position;
    const currentQty = Number(current?.quantity ?? 0);
    const newQty = best?.quantity ?? 0;

    if (Math.abs(currentQty - newQty) < 0.000001) {
      unchanged++;
      continue;
    }

    // Vis diff
    console.log(
      `   ${sessionId.slice(0,8)}  ledger=${(newQty||0).toFixed(4)} ` +
      `DB=${(currentQty||0).toFixed(4)} ` +
      `→ ${APPLY ? "SKREVET" : "avvik"}`
    );

    if (APPLY) {
      if (best) {
        await supabase
          .from("trading_sessions")
          .update({ open_position: best })
          .eq("id", sessionId);
      } else {
        await supabase
          .from("trading_sessions")
          .update({ open_position: null })
          .eq("id", sessionId);
      }
      fixed++;
    }
  }

  console.log();
  console.log(`   📊 ${unchanged} uendret, ${fixed || "0"}${APPLY ? " fikset" : " avvik"}`);
  if (!APPLY) {
    console.log(`   💡 Kjør med --apply for å skrive endringene`);
  }
}

main().catch(e => { console.error("💥", e.message); process.exit(1); });
