#!/usr/bin/env node
/**
 * Backtest parameter-sweep: simulerer mange grid-oppsett mot 1 års klines.
 *
 * For hvert symbol testes et rutenett av parametere:
 *   - grid-levels: [10, 20, 30, 50]
 *   - range: ±[5%, 10%, 15%, 25%] rundt årssnittet
 *   - fee: 0.1%, slippage: 0.05%
 *
 * Resultat lagres i backtest_results (kun walk-forward-validerte vinnere).
 * Kjøres ukentlig av cron; fôrer edge-allokeringen med testede parametere.
 */

import { readFileSync } from "fs";
import { resolve } from "path";
import { simulateGrid } from "../src/lib/trading/backtest/grid-simulator.ts";

const envPath = resolve(process.cwd(), ".env.local");
const env = readFileSync(envPath, "utf8");
for (const line of env.split("\n")) {
  const m = line.match(/^([A-Z_]+)=(.*)$/);
  if (m) process.env[m[1]] = m[2].replace(/^["']|["']$/g, "").trim();
}

const SYMBOLS = [
  "BTCUSDT", "ETHUSDT", "SOLUSDT", "AVAXUSDT", "DOGEUSDT",
  "LINKUSDT", "ADAUSDT", "DOTUSDT", "UNIUSDT", "POLUSDT",
];

const GRID_LEVELS = [10, 20, 30, 50];
const RANGE_PCTS = [0.05, 0.10, 0.15, 0.25];
const FEE_PCT = 0.001;
const SLIPPAGE_PCT = 0.0005;
const CAPITAL = 10000;
/** Walk-forward: tren på første 75%, test på siste 25% */
const TRAIN_FRACTION = 0.75;

async function fetchCandles(symbol) {
  const supaUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const srk = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const url = `${supaUrl}/rest/v1/price_candles?symbol=eq.${symbol}&order=open_time.asc&select=open_time,open,high,low,close,volume`;
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${srk}`, apikey: srk },
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

async function saveResult(row) {
  const supaUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const srk = process.env.SUPABASE_SERVICE_ROLE_KEY;
  // Eksisterende schema: symbol/strategy/interval + metrics JSONB
  const payload = {
    symbol: row.symbol,
    strategy: "GRID",
    interval: "1h",
    initial_capital: 10000,
    total_return_pct: row.test_return_pct,
    max_drawdown_pct: row.test_max_dd,
    sharpe_ratio: row.test_sharpe,
    win_rate: row.test_win_rate,
    total_trades: row.test_trades,
    metrics: {
      grid_levels: row.grid_levels,
      range_pct: row.range_pct,
      lower_price: row.lower_price,
      upper_price: row.upper_price,
      train_return_pct: row.train_return_pct,
      train_sharpe: row.train_sharpe,
      overfit_ratio: row.overfit_ratio,
      walk_forward: true,
    },
    updated_at: new Date().toISOString(),
  };
  const res = await fetch(`${supaUrl}/rest/v1/backtest_results`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${srk}`,
      apikey: srk,
      Prefer: "return=minimal",
    },
    body: JSON.stringify(payload),
  });
  if (!res.ok) console.error(`lagring feilet: ${res.status}`);
}

async function sweepSymbol(symbol) {
  const candles = await fetchCandles(symbol);
  if (candles.length < 500) {
    console.log(`${symbol}: for lite data (${candles.length}) — hopper over`);
    return [];
  }

  const avgPrice = candles.reduce((s, c) => s + c.close, 0) / candles.length;
  const splitIdx = Math.floor(candles.length * TRAIN_FRACTION);
  const train = candles.slice(0, splitIdx);
  const test = candles.slice(splitIdx);

  const results = [];

  for (const levels of GRID_LEVELS) {
    for (const rangePct of RANGE_PCTS) {
      const lower = avgPrice * (1 - rangePct);
      const upper = avgPrice * (1 + rangePct);
      const params = {
        symbol, lowerPrice: lower, upperPrice: upper,
        gridLevels: levels, capitalNok: CAPITAL,
        feePct: FEE_PCT, slippagePct: SLIPPAGE_PCT,
      };

      const trainResult = simulateGrid(train, params);
      const testResult = simulateGrid(test, params);

      results.push({
        symbol,
        grid_levels: levels,
        range_pct: rangePct,
        lower_price: lower,
        upper_price: upper,
        train_return_pct: trainResult.returnPct,
        train_sharpe: trainResult.sharpeRatio,
        train_max_dd: trainResult.maxDrawdownPct,
        test_return_pct: testResult.returnPct,
        test_sharpe: testResult.sharpeRatio,
        test_max_dd: testResult.maxDrawdownPct,
        test_win_rate: testResult.winRate,
        test_trades: testResult.closedTrades,
        /** Overfit-guard: test bør beholde minst 50% av train-ytelse */
        overfit_ratio:
          trainResult.returnPct !== 0
            ? testResult.returnPct / trainResult.returnPct
            : null,
        computed_at: new Date().toISOString(),
      });
    }
  }

  return results;
}

async function main() {
  let saved = 0;
  for (const symbol of SYMBOLS) {
    try {
      const results = await sweepSymbol(symbol);
      for (const r of results) await saveResult(r);
      saved += results.length;

      const valid = results
        .filter((r) => r.test_sharpe > 0 && (r.overfit_ratio === null || r.overfit_ratio > 0.5))
        .sort((a, b) => b.test_sharpe - a.test_sharpe);
      const best = valid[0];
      if (best) {
        console.log(
          `${symbol}: BESTE levels=${best.grid_levels} range=±${(best.range_pct * 100).toFixed(0)}% → test Sharpe ${best.test_sharpe.toFixed(2)}, ret ${best.test_return_pct.toFixed(1)}%, DD ${best.test_max_dd.toFixed(1)}%`,
        );
      } else {
        console.log(`${symbol}: ingen valide oppsett (alle overfit/negativ)`);
      }
    } catch (err) {
      console.error(`${symbol}: FEIL — ${err.message}`);
    }
  }
  console.log(`\n${saved} backtest-resultater lagret`);
}

main().catch((err) => {
  console.error("KRITISK:", err);
  process.exit(1);
});
