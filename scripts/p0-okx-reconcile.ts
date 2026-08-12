/**
 * P0 READ-ONLY: OKX-avstemming for Tom
 *
 * Kaller getOkxLiveBalance() (leser user_okx_keys + OKX API GET) og
 * sammenligner med DB-tilstand. Ingen skriving.
 *
 * Kjør: npx tsx scripts/p0-okx-reconcile.ts
 */
import { createClient } from "@supabase/supabase-js";
import { getOkxLiveBalance } from "../src/lib/trading/okx-live";
import { getUsdtToNokRateAsync } from "../src/lib/trading/currency";

const TOM_ID = "0dd08529-b8a8-4fd3-9806-275e2d0135dd";

async function main() {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } },
  );

  console.log("=== OKX LIVE-AVSTEMMING (read-only) ===");
  console.log(`Bruker: ${TOM_ID}`);
  console.log("");

  // 1. OKX live data fra API
  const okx = await getOkxLiveBalance(supabase, TOM_ID);
  console.log("[1] OKX API (live):");
  console.log(JSON.stringify(okx, null, 2));
  console.log("");

  // 2. OKX rate
  const rate = await getUsdtToNokRateAsync(supabase);
  console.log(`[2] USDT/NOK rate: ${rate}`);
  console.log("");

  // 3. DB-tilstand: live-sesjon
  const { data: liveSessions } = await supabase
    .from("trading_sessions")
    .select("id, status, trading_pair, current_capital_nok, starting_capital_nok, total_pnl, last_tick_at, updated_at")
    .eq("user_id", TOM_ID)
    .eq("mode", "live")
    .is("archived", false)
    .order("updated_at", { ascending: false });

  console.log("[3] Live-sesjoner (ikke-arkiverte):");
  for (const s of liveSessions ?? []) {
    console.log(`  ${s.id.slice(0, 8)} | ${s.status} | ${s.trading_pair} | capital=${s.current_capital_nok} | start=${s.starting_capital_nok} | pnl=${s.total_pnl} | last_tick=${s.last_tick_at}`);
  }
  console.log("");

  // 4. kraken_live_state (stale sjekk)
  const { data: krakenState } = await supabase
    .from("kraken_live_state")
    .select("total_usdc, open_orders, updated_at")
    .eq("user_id", TOM_ID)
    .maybeSingle();
  console.log("[4] kraken_live_state (skal være STALE — Kraken død):");
  console.log(JSON.stringify(krakenState, null, 2));
  console.log("");

  // 5. Oppsummering av avvik
  console.log("=== OPPSUMMERING ===");
  const okxNok = okx.balanceUsdc * rate;
  console.log(`OKX API saldo: ${okx.balanceUsdc} USDC ≈ ${okxNok.toFixed(2)} NOK (rate ${rate})`);
  if (liveSessions?.length) {
    const liveSession = liveSessions[0];
    console.log(`Live-sesjon capital: ${liveSession.current_capital_nok} NOK`);
    const diff = Math.abs(Number(liveSession.current_capital_nok) - okxNok);
    console.log(`Avvik OKX vs sesjon: ${diff.toFixed(2)} NOK ${diff > 1 ? '⚠️ OVER 1 NOK' : '✅ under 1 NOK'}`);
  }
  console.log(`kraken_live_state alder: ${krakenState ? Math.round((Date.now() - new Date(krakenState.updated_at).getTime()) / 3600000) : 'N/A'} timer gammel`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
