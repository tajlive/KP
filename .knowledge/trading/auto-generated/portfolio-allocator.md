# portfolio-allocator

**Fil:** `src/lib/trading/portfolio-allocator.ts`
**Tester:** ❌ Nei

## Beskrivelse
═══════════════════════════════════════════════════════════════════════════════
  PORTFOLIO ALLOCATOR — Multi-strategy capital allocation using Kelly + MPT
  ═══════════════════════════════════════════════════════════════════════════════
 
  Allocates capital across multiple strategies using a combination of:
  - Kelly Criterion (per-strategy optimal fraction)
  - Correlation penalties (reduce allocation to correlated strategies)
  - Risk-parity weighting (equalize risk contribution)
 
  This module provides the mathematical engine. The UI integration calls
  this with strategy performance data from backtests or live trades.
 
  @module lib/trading/portfolio-allocator

## Eksporterte funksjoner
- `allocatePortfolio()`
- `backtestToStrategyPerformance()`

## Typer/Interfaces
- `StrategyPerformance`
- `AllocationResult`
- `StrategyAllocation`
- `PortfolioConfig`

## Konstanter
*Ingen eksporterte konstanter*

---
*Auto-generert av trading-knowledge-miner.mjs*
