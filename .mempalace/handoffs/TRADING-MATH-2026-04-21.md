# MemPalace Handoff: Trading Mathematics Suite

**Date:** 2026-04-21
**Commit:** d2dbce6fa
**Tests:** 679 passed, 1 skipped
**Deploy:** www.klarpakke.no (verified)

---

## Overview

Implemented 5 production-grade trading mathematics modules for Klarpakke.
All modules are pure functions, fully tested, TypeScript-strict, and deployed.

---

## 1. FIFO Position Ledger

**File:** `src/lib/trading/position-ledger.ts` (411 lines, 30 tests)

### Purpose
Correct cost basis tracking for multi-buy positions. Fixes production bug where P&L was incorrect when user bought multiple times before selling.

### Key Concepts
- **Lot:** `{ id, quantity, entryPrice, timestamp, originalQuantity }`
- **LedgerState:** `{ side: "long"|"short", lots: Lot[] }` (sorted oldest-first)
- **FIFO:** On sell, match against oldest lots first
- **Partial sells:** Split lots when sell quantity < lot quantity

### API
```typescript
createLedger(side)                    → LedgerState
addLot(ledger, qty, price)            → LedgerState
sellFIFO(ledger, qty, exitPrice)      → SellResult { realizedPnl, lotMatches[], remainingLots }
getWeightedEntryPrice(ledger)         → number
getTotalQuantity(ledger)              → number
getUnrealizedPnl(ledger, price)       → number
getUnrealizedPnlPct(ledger, price)    → number
migrateFromLegacy(openPosition)       → LedgerState (backward compat)
toLegacyPosition(ledger)              → OpenPosition (with lots[])
```

### Integration
- **Paper:** `src/app/api/cron/tick/route.ts` — buy uses `addLot()`, sell uses `sellFIFO()`
- **Live:** `src/lib/auto-trading/binance-websocket.ts` — same pattern on execution reports
- **API:** `GET /api/trading/position` — returns live lots with unrealized P&L
- **UI:** `PositionLotsCard` in portfolio dashboard

---

## 2. Monte Carlo Simulation

**File:** `src/lib/trading/monte-carlo.ts` (314 lines, 17 tests)

### Purpose
Bootstrap resampling to estimate uncertainty in backtest results.

### Key Concepts
- **Bootstrap:** Draw trades WITH replacement 10,000 times
- **Equity curve:** Build new curve per simulation using proportional P&L
- **Ruin:** Equity falls below 50% of initial capital

### API
```typescript
runMonteCarlo(trades, config) → MonteCarloResult {
  probabilityOfProfit,      // P(final equity > initial)
  probabilityOfRuin,        // P(equity ever < 50%)
  medianReturn,             // 50th percentile
  meanReturn,
  confidenceInterval95,     // [2.5%, 97.5%]
  confidenceInterval99,     // [0.5%, 99.5%]
  percentiles,              // {5, 10, 25, 50, 75, 90, 95}
  maxConsecutiveLosses,
  avgMaxConsecutiveLosses,
  avgTimeToRecovery,
  simulationsRun,
  executionTimeMs
}
```

### Integration
- **API:** `/api/backtest` accepts `includeMonteCarlo: boolean` (opt-in, adds ~1-2s)
- **UI:** Toggle in `/dashboard/metrics` + `MonteCarloPanel` with probability cards and CI chart

---

## 3. Advanced Risk Metrics

**File:** `src/lib/trading/risk-metrics.ts` (400 lines, 35 tests)

### Purpose
Institutional-grade risk analysis on daily returns.

### Metrics
| Metric | Description |
|--------|-------------|
| **Sortino Ratio** | Sharpe but only downside volatility |
| **Calmar Ratio** | Annualized return / max drawdown |
| **VaR 95%** | Historical Value at Risk (95% confidence) |
| **VaR 99%** | Historical Value at Risk (99% confidence) |
| **Expected Shortfall (CVaR)** | Average of returns below VaR threshold |
| **Omega Ratio** | Probability-weighted gain/loss ratio |
| **Max Consecutive Losses** | Worst losing streak |
| **Max Consecutive Wins** | Best winning streak |
| **Time to Recovery** | Avg periods from drawdown to new ATH |
| **Gain/Pain Ratio** | Sum of gains / abs(sum of losses) |

### API
```typescript
calculateSortino(returns, riskFreeRate)       → number
calculateCalmar(totalReturn, maxDrawdown)     → number
calculateVaR(returns, confidence)             → number
calculateExpectedShortfall(returns, conf)     → number
calculateOmega(returns)                       → number
calculateMaxConsecutiveLosses(trades)         → number
calculateTimeToRecovery(equityCurve)          → number
calculateGainPainRatio(trades)                → number
calculateAllRiskMetrics(returns, riskFreeRate) → RiskMetricsSummary
```

### Integration
- **Analytics:** `buildTradingAnalytics()` includes `riskMetrics` field
- **API:** `/api/user/trading-analytics` returns risk metrics
- **UI:** `RiskMetricsPanel` in main dashboard

---

## 4. Walk-Forward Optimization

**File:** `src/lib/trading/walk-forward.ts` (421 lines, 15 tests)

### Purpose
Detect overfitting by testing strategy on out-of-sample data.

### Key Concepts
- **IS (In-Sample):** Train strategy on historical data
- **OOS (Out-of-Sample):** Test on unseen future data
- **WFE:** Walk-Forward Efficiency = OOS return / IS return
- **Robustness score:** 0-100 based on WFE consistency
- **Verdict:** robust | acceptable | questionable | overfit

### Modes
- **Rolling:** Window slides forward (fixed train/test size)
- **Anchored:** Train grows, test fixed (more data over time)

### API
```typescript
runWalkForward(config) → WalkForwardResult {
  windows: WindowResult[],
  wfe: number,                    // Overall WFE
  robustnessScore: number,        // 0-100
  verdict: "robust" | "acceptable" | "questionable" | "overfit",
  isAvgReturn: number,
  oosAvgReturn: number,
  windowsPassed: number,
  windowsTotal: number
}
```

### Integration
- **Backtest:** `includeWalkForward?: boolean` in `BacktestInput`
- **BacktestEngine:** `calculateBacktest()` optionally runs WFO

---

## 5. Portfolio Allocator

**File:** `src/lib/trading/portfolio-allocator.ts` (519 lines, 14 tests)

### Purpose
Optimal capital allocation across multiple strategies.

### Key Concepts
- **Kelly Criterion:** Per-strategy optimal fraction (half-Kelly default)
- **Correlation matrix:** Pearson correlation between strategy returns
- **Correlation penalty:** Reduce allocation to correlated strategies
- **Risk parity:** Equal marginal risk contribution per strategy

### API
```typescript
calculateKellyAllocation(returns, profiles)    → AllocationResult
calculateCorrelationMatrix(returns)            → number[][]
calculateCorrelationPenalty(allocation, corr)  → number[]
calculateRiskParity(returns, covMatrix)        → number[]
backtestToStrategyPerformance(backtest)        → StrategyPerformance
optimizePortfolio(config)                      → PortfolioOptimizationResult {
  allocations: number[],          // Capital fractions per strategy
  expectedReturn: number,
  expectedRisk: number,
  sharpeRatio: number,
  diversificationRatio: number
}
```

### Integration
- **Standalone:** Call `optimizePortfolio()` with strategy returns
- **Backtest:** Use `backtestToStrategyPerformance()` to convert backtest output

---

## Architecture Decision: Paper = Live

**Rule:** Paper trading and live trading MUST use identical P&L calculation.

**Implementation:**
- Both use `position-ledger.ts` FIFO logic
- Paper: `tick/route.ts` updates `session.open_position` with `addLot()` / `sellFIFO()`
- Live: `binance-websocket.ts` updates `session.open_position` on execution reports
- Fallback: If FIFO fails (edge case), fall back to simple `(exit - entry) * qty`

---

## Files Changed

### New files
- `src/lib/trading/position-ledger.ts` (+411)
- `src/lib/trading/monte-carlo.ts` (+314)
- `src/lib/trading/risk-metrics.ts` (+400)
- `src/lib/trading/walk-forward.ts` (+421)
- `src/lib/trading/portfolio-allocator.ts` (+519)
- `src/app/api/trading/position/route.ts` (+158)
- `src/features/dashboard/PositionLotsCard.tsx` (+228)
- `src/features/dashboard/RiskMetricsPanel.tsx` (+140)
- `src/app/[locale]/(user)/dashboard/metrics/components/monte-carlo-panel.tsx` (+160)
- Tests: position-ledger.test.ts (+394), risk-metrics.test.ts (+304), monte-carlo.test.ts (+269), walk-forward.test.ts (+200), portfolio-allocator.test.ts (+279)

### Modified files
- `src/app/api/cron/tick/route.ts` — FIFO integration
- `src/lib/auto-trading/binance-websocket.ts` — FIFO integration
- `src/lib/auto-trading/types.ts` — open_position field
- `src/lib/trading/backtestEngine.ts` — Monte Carlo + WFO hooks
- `src/lib/trading/build-trading-analytics.ts` — risk metrics
- `src/app/api/backtest/route.ts` — Monte Carlo toggle
- `src/app/api/user/trading-analytics/route.ts` — risk metrics response
- `messages/no/dashboard.json`, `messages/en/dashboard.json` — i18n
- `messages/no/trading.json`, `messages/en/trading.json` — i18n

---

## Next Steps / Future Work

1. **Expose Walk-Forward in UI** — Currently backend-only. Add toggle + results panel in metrics page.
2. **Expose Portfolio Allocator in UI** — Currently backend-only. Add strategy comparison + allocation slider.
3. **Monte Carlo on LIVE performance** — Currently only on backtest. Bootstrap user's actual trades.
4. **Real-time risk monitoring** — Alert when VaR 95% is breached, or consecutive losses exceed threshold.
5. **Strategy performance persistence** — Save `strategy_performance` table with Kelly stats, WFE scores, Sharpe per strategy.

---

## Related Entries

- `.mempalace/handoffs/OAUTH-SESSION-404-FIX-2026-04-08.md` — Auth patterns
- `.mempalace/handoffs/KIMI-API-OPTIMALISERING-2026-04-13.md` — API optimization
- `docs/CRON-SOURCE-OF-TRUTH.md` — Cron architecture
- `src/lib/supabase/TYPE_DEBT.md` — TypeScript debt
