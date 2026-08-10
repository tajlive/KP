/**
 * UKENTLIG PILOT-BEVIS (kjøres av GitHub Actions, søndager 06:47 UTC)
 *
 * Kjører runSimpleBacktest på 90 dager SOL-USDT (1H, OKX public — ingen
 * secrets) med produksjons-defaults, og skriver src/data/backtest-bevis.json.
 * Landingens BacktestBevisSection leser filen (build-time import — edge-safe,
 * ALDRI fs i prod). Workflow commiter kun hvis tallet har endret seg.
 *
 * ÆRLIGHET: Tallet vises uansett fortegn — «Beviset» viser også tap
 * (metodekort m3 på landingen lover nettopp det).
 *
 * Kjør lokalt: npx tsx scripts/backtest-pilot-weekly.mts
 */
import { writeFileSync, mkdirSync } from "fs";
import { runSimpleBacktest, formatBacktestBevis } from "../src/lib/backtest/simple-backtest";
import type { Candle } from "../src/lib/trading/strategies/types";

const DAGER = 90;
const INST = "SOL-USDT";
const PACING_MS = 150;

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

interface OkxSvar {
  code: string;
  data: [string, string, string, string, string, string, string, string, string][];
}

async function hentCandles(): Promise<Candle[]> {
  const siden = Date.now() - DAGER * 86_400_000;
  const alle = new Map<number, Candle>();
  let after = Date.now();
  for (;;) {
    const res = await fetch(
      `https://www.okx.com/api/v5/market/history-candles?instId=${INST}&bar=1H&limit=100&after=${after}`,
    );
    if (!res.ok) throw new Error(`OKX HTTP ${res.status}`);
    const d = (await res.json()) as OkxSvar;
    if (d.code !== "0" || !d.data.length) break;
    let eldst = Infinity;
    for (const [ts, o, h, l, c, , vol] of d.data) {
      const t = Number(ts);
      if (t < eldst) eldst = t;
      if (t >= siden) alle.set(t, { time: t, open: +o, high: +h, low: +l, close: +c, volume: +vol });
    }
    if (eldst <= siden || d.data.length < 100) break;
    after = eldst - 1;
    await sleep(PACING_MS);
  }
  return [...alle.values()].sort((a, b) => a.time - b.time);
}

async function main() {
  console.log(`Kjører ${DAGER}d Pilot-backtest (${INST}) …`);
  const candles = await hentCandles();
  console.log(`✓ ${candles.length} candles`);

  const res = runSimpleBacktest({ candles, initialCapital: 10000 });
  const m = res.metrics;
  const v = res.validation;
  // Buy-and-hold-sammenligning (den ærlige konteksten — «slått markedet?»)
  const holdPct = (candles[candles.length - 1].close / candles[0].close - 1) * 100;
  const holdBelop = formatBacktestBevis(10000 * (holdPct / 100));

  const bevis = {
    resultat: formatBacktestBevis(m.totalPnl),
    bevist: v.bevist,
    dsr: Number(v.dsr.toFixed(3)),
    lukkedeLots: m.closedTrades,
    winRate: Number(m.winRate.toFixed(1)),
    symbol: INST,
    dager: DAGER,
    kapital: "10 000 USDT (≈100 000 kr)",
    holdBelop,
    holdPct: Number(holdPct.toFixed(1)),
    beregnet: new Date().toISOString(),
    disclaimer: "Historisk avkastning er ingen garanti for fremtidig avkastning.",
  };

  mkdirSync("src/data", { recursive: true });
  writeFileSync("src/data/backtest-bevis.json", JSON.stringify(bevis, null, 2) + "\n");
  console.log("Skrevet src/data/backtest-bevis.json:", JSON.stringify(bevis, null, 2));
}

main().catch((e) => { console.error(e); process.exit(1); });
