---
name: klarpakke-backtest-pipeline
description: Use when validating grid strategies via backtest.
whenToUse: Når bruker ber om validering av grid-strategier via backtest. IKKE for
  live-trading-endringer.
---

# Klarpakke Backtest Pipeline

Systematic walk-forward validation of grid strategies before live deployment.
Replaces guesswork with tested, evidence-based parameter selection.

## Pipeline Overview

```
price_candles (72k+ 1h OHLCV, 10 symbols, 365d)
  ↓ fetch-klines.mjs (daily cron 04:00)
backtest_results (walk-forward sweeps, sharpe-ranked)
  ↓ backtest-sweep.mjs (weekly cron Sun 05:00)
best-config.ts (sharpe >= 2.0, overfit_ratio >= 0.5)
  ↓ getGridConfigForSymbol(db, symbol, currentPrice)
Live grid (pilot-engine recalibration)
```

## Core Principle

> **AI at rebalancing, mechanical grid otherwise.** Never AI per trade.
> Backtest on 75% train, validate on 25% test. Discard what fails on unseen data.

## Walk-Forward Method

1. **Train** (first 75% of candles) — find best params by Sharpe
2. **Test** (last 25%, unseen) — validate params hold
3. **Overfit guard** — `test_return / train_return` must be >= 0.5
4. **Sharpe floor** — only deploy configs with test sharpe >= 2.0

## Key Files

| File | Role |
|---|---|
| `scripts/fetch-klines.mjs` | Daily: fetch 1h klines via binance-proxy, upsert to `price_candles` |
| `scripts/backtest-sweep.mjs` | Weekly: parameter sweep (levels × range) per symbol, walk-forward, save winners |
| `src/lib/trading/backtest/grid-simulator.ts` | Pure grid sim with fees + slippage, max drawdown, Sharpe |
| `src/lib/trading/backtest/best-config.ts` | Read best config from `backtest_results`, re-center range on current price |
| `src/lib/trading/edge-allocation.ts` | Edge-weighted capital allocation across symbols |

## Cron Jobs

| Schedule | Job | Purpose |
|---|---|---|
| `0 4 * * *` | fetch-klines-daglig | Keep candle history fresh |
| `0 5 * * 0` | backtest-sweep-ukentlig | Re-run sweep weekly, update winners |

## Parameter Grid (sweep)

- `grid_levels`: [10, 20, 30, 50]
- `range_pct`: [±5%, ±10%, ±15%, ±25%]
- `fee`: 0.1% taker, `slippage`: 0.05%
- `capital`: 10 000 NOK per backtest

## Overfit Guard

A config that looks great on train but fails on test is discarded:

```typescript
const overfitRatio = trainResult.returnPct !== 0
  ? testResult.returnPct / trainResult.returnPct
  : null;
// Require: overfitRatio === null || overfitRatio > 0.5
```

## Live Config Feeding

`best-config.ts` reads `backtest_results` (strategy='GRID', sharpe desc),
filters by `sharpe >= 2.0` + `overfit_ratio >= 0.5`, first-per-symbol wins.
Re-centers the historical range around **current price** before returning.

Fallback to hardcoded defaults when DB unreachable or symbol never swept.

## Pitfalls

- **Which script is valid for grid (2026-08-05):** `scripts/trading-agent/grid-backtest.ts` (stateful grid, 4h × 1000 candles, 70/30 walk-forward) is the VALID grid simulator — 20–79 trades/par, OOS PF per symbol. `scripts/trading-agent/universe-backtest.ts` runs grid on DAILY candles with single-position semantics → only ~1 trade/par (useless for grid; its multi_signal section IS valid, 730d daily). When reading sweep outputs, check trade counts per symbol — fewer than ~10 trades in OOS means the result is noise, not edge. Fersk fasit 2026-08-05: grid OOS PF ≥ 1,1 på alle 10 par (univers PF 7,42, win 81,9 %, maxDD 3,9 %); multi_signal negativ på 9/10 (PF 0,60) — dette er beslutningsgrunnlaget for par-univers og grid-default-ruting (`reports/trading-agent/2026-08-05-*-fersk.txt`).
- **Never trust train-only results** — always validate on unseen test window.
- **Paper-grid P&L from the legacy grid path is INFLATED — never extrapolate it to live (2026-08-05):** the old grid code path (`grid-strategy.ts`, the "dead road") recorded BTC-grid paper results of +31% per trade on ~500 USDC exposure — physically impossible for a 2% trailing grid (max ~1.5% net after 0.52% round-trip fees). Any paper-derived "time to target equity" estimate must be recomputed from grid physics, not paper fills. Live economics: `net per cycle = level_size × (trail_pct − 2×taker_fee)`; time-to-target = `target / (net_per_cycle × realistic fills/day)`. For a 9.24 USDC level, +2% trail, 0.26% fees: ~0.137 USDC net/cycle → 6 fills/day ≈ 0.82 USDC/day ≈ 4 months for +96 USDC at small balance. Paper data is only usable for RELATIVE signals (which pair is more volatile), never absolute P&L.
- **Re-center range on live price** — backtest prices are historical; a ±25% range
  from 3 months ago is wrong today. `best-config.ts` does this automatically.
- **Mechanical grid, not AI-per-trade** — AI selects params at rebalancing (weekly),
  grid executes mechanically between. Faster, cheaper, no correlated front-running.
- **PostgREST upsert needs `on_conflict`** — see klarpakke-optimization skill.
- **fapi.binance.com geo-blocked from Workers** — route via binance-proxy; see klarpakke-api-failover.

See `references/walk-forward-methodology.md` for the full statistical method.
