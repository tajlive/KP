# Walk-Forward Methodology — Klarpakke Grid Backtest

## Why Walk-Forward, Not Simple Backtest

A simple backtest optimizes parameters on the full dataset, then reports
performance on the SAME data. Result: curve-fitted configs that look brilliant
historically but bleed capital live (>80% of retail bots underperform buy-and-hold).

Walk-forward mimics reality: optimize on past data, validate on future (unseen)
data. Only configs that hold on unseen data are trustworthy.

## The Split

- **Train: first 75%** of candles (chronological) — parameter search happens here
- **Test: last 25%** (unseen) — validation happens here
- **Never** let test data influence parameter selection

## Metrics

| Metric | Formula | Threshold for live |
|---|---|---|
| Test Sharpe | (avg hourly return / std) × √(365×24) | >= 2.0 |
| Overfit ratio | test_return / train_return | >= 0.5 |
| Max drawdown | max peak-to-trough equity drop | lower is better; report |
| Win rate | winning round-trips / closed round-trips | informational |

## Grid Simulator Mechanics

- Arithmetic grid: N levels evenly spaced between lower/upper
- Start: half capital as base (bought at start price), half as quote (cash)
- Price falls through level → buy 1 grid unit (with slippage + fee)
- Price rises through level → sell 1 grid unit (with slippage + fee)
- Equity curve per candle → drawdown + Sharpe

## Parameter Grid

- grid_levels: 10, 20, 30, 50
- range_pct: ±5%, ±10%, ±15%, ±25% around period average price
- 16 combinations per symbol × 10 symbols = 160 sweeps per run

## Re-Centering for Live

Backtest ranges are anchored to historical average price. Before live use,
re-center: `lower = price_now × (1 - range_pct)`, `upper = price_now × (1 + range_pct)`.
Grid levels count stays from the winning config.

## Regime Dependency

Grid excels in sideways/volatile markets, suffers in strong trends (sells too
early on the way up, buys all the way down). Weekly re-sweep adapts parameters
to the recent regime — but a regime-switch meta-strategy (grid ↔ trend ↔
defensive) is the roadmap item that fully addresses this.

## Data Source

- Binance 1h klines via binance-proxy (geo-block workaround)
- 365 days, 10 symbols, ~8 760 candles/symbol
- Stored in `price_candles` (unique on symbol+open_time; upsert needs `on_conflict`)

## Evidence: 2026-08-04 Sweep

- 6/10 symbols produced valid configs (sharpe >= 2.0, overfit >= 0.5)
- 4 symbols (BTC, ETH, LINK, POL) had NO valid grid config in the test window —
  the honest answer is "don't grid these right now", not force a bad config.
  The allocation engine must respect this: zero weight to invalid symbols.
