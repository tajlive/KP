# Trading Mathematics Suite — Source of Truth

**Status:** Production | 679 tests | d2dbce6fa | 2026-04-21

---

## Modules

### 1. FIFO Position Ledger
- **File:** `src/lib/trading/position-ledger.ts`
- **Tests:** `src/lib/trading/__tests__/position-ledger.test.ts` (30 tests)
- **Purpose:** Correct cost basis for multi-buy positions
- **Key:** `addLot()`, `sellFIFO()`, `getWeightedEntryPrice()`, `getUnrealizedPnl()`
- **Integration:** tick/route.ts (paper), binance-websocket.ts (live)
- **API:** `GET /api/trading/position`
- **UI:** `PositionLotsCard` in portfolio page

### 2. Monte Carlo Simulation
- **File:** `src/lib/trading/monte-carlo.ts`
- **Tests:** `src/lib/trading/__tests__/monte-carlo.test.ts` (17 tests)
- **Purpose:** Bootstrap resampling for backtest uncertainty
- **Key:** `runMonteCarlo(trades, config)` → probability of profit/ruin, CI95
- **Integration:** `/api/backtest` with `includeMonteCarlo: boolean`
- **UI:** Toggle + panel in `/dashboard/metrics`

### 3. Risk Metrics
- **File:** `src/lib/trading/risk-metrics.ts`
- **Tests:** `src/lib/trading/__tests__/risk-metrics.test.ts` (35 tests)
- **Purpose:** Institutional-grade risk analysis
- **Key:** `calculateAllRiskMetrics(returns, riskFreeRate)` → Sortino, Calmar, VaR, CVaR, Omega
- **Integration:** `buildTradingAnalytics()` + `/api/user/trading-analytics`
- **UI:** `RiskMetricsPanel` in dashboard

### 4. Walk-Forward Optimization
- **File:** `src/lib/trading/walk-forward.ts`
- **Tests:** `src/lib/trading/__tests__/walk-forward.test.ts` (15 tests)
- **Purpose:** Overfit detection via IS/OOS testing
- **Key:** `runWalkForward(config)` → WFE, robustnessScore, verdict
- **Integration:** `backtestEngine.ts` with `includeWalkForward`

### 5. Portfolio Allocator
- **File:** `src/lib/trading/portfolio-allocator.ts`
- **Tests:** `src/lib/trading/__tests__/portfolio-allocator.test.ts` (14 tests)
- **Purpose:** Multi-strategy capital allocation
- **Key:** `optimizePortfolio(config)` → Kelly + correlation + risk-parity
- **Integration:** Standalone, `backtestToStrategyPerformance()` helper

---

## Decision: Paper = Live

Both paper and live trading use **identical FIFO ledger logic**:
- Buy → `addLot()` → update `session.open_position`
- Sell → `sellFIFO()` → update trade + session
- Fallback to simple P&L if FIFO throws

This ensures users see consistent P&L regardless of mode.

---

## i18n Keys

All new UI uses `next-intl` with keys in:
- `messages/no/dashboard.json` — `positionLots`, risk metric labels
- `messages/en/dashboard.json` — Same, English
- `messages/no/trading.json` — Monte Carlo labels
- `messages/en/trading.json` — Same, English

---

## Next Work

1. Walk-Forward UI (currently backend-only)
2. Portfolio Allocator UI (currently backend-only)
3. Monte Carlo on live trades (currently backtest-only)
4. Real-time risk alerts (VaR breach, consecutive loss threshold)
5. Strategy performance persistence table
