# ADR: Trading Mathematics Suite

**Date:** 2026-04-21
**Author:** Klarpakke Agent Swarm (Opus + KIMI)
**Status:** Accepted
**Commit:** d2dbce6fa

---

## Context

Klarpakke's trading platform needed institutional-grade mathematics to:
1. Correctly calculate P&L for multi-buy positions (FIFO)
2. Quantify backtest uncertainty (Monte Carlo)
3. Measure live trading risk (Sortino, Calmar, VaR, etc.)
4. Detect strategy overfitting (Walk-Forward)
5. Optimize capital across strategies (Portfolio Allocator)

---

## Decision

Implement 5 pure-function TypeScript modules, fully tested, with opt-in UI integration.

### Rationale
- **Pure functions:** Easy to test, no side effects, reusable
- **Decimal.js:** Avoids floating-point errors in financial calculations
- **Opt-in UI:** Monte Carlo adds ~1-2s latency, so it's toggle-only
- **Paper = Live:** Identical P&L logic prevents mode-switching surprises

### Alternatives Considered

| Alternative | Pros | Cons | Rejected Because |
|-------------|------|------|------------------|
| Python (pandas/numpy) | Rich ecosystem | Requires Python runtime, IPC overhead | Next.js monolith, keep everything TS |
| External library (quantlib, tulip) | Battle-tested | Heavy deps, WASM overhead | We need ~5 specific functions, not a full quant library |
| AI-generated on demand | Flexible | Non-deterministic, slow, expensive | Financial correctness requires deterministic code |
| **Custom TS modules** (chosen) | Lean, tested, integrated | Maintenance burden | Fits our stack, full control, testable |

---

## Consequences

### Positive
- Users see correct P&L even with complex multi-buy strategies
- Backtests include uncertainty quantification (confidence intervals)
- Dashboard shows institutional-grade risk metrics
- Walk-forward prevents overfitted strategies from reaching production
- Portfolio allocator enables multi-strategy bots

### Negative
- 5 new modules = maintenance surface area
- Monte Carlo is CPU-intensive (10k sims ~700ms)
- Walk-forward requires sufficient historical data
- Portfolio allocator needs multi-strategy backtests to be useful

### Mitigations
- All modules have >90% test coverage
- Monte Carlo is opt-in only
- Walk-forward is opt-in only
- Heavy calculations run server-side, not in browser

---

## Related

- `src/lib/trading/position-ledger.ts`
- `src/lib/trading/monte-carlo.ts`
- `src/lib/trading/risk-metrics.ts`
- `src/lib/trading/walk-forward.ts`
- `src/lib/trading/portfolio-allocator.ts`
- `.knowledge/trading/math-suite.md`
- `.mempalace/handoffs/TRADING-MATH-2026-04-21.md`
