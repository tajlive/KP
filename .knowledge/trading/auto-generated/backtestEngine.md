# backtestEngine

**Fil:** `src/lib/trading/backtestEngine.ts`
**Tester:** ❌ Nei

## Beskrivelse
═══════════════════════════════════════════════════════════════════════════════
  KLARPAKKE BACKTEST ENGINE — Felles sannhetskilde for avkastningsberegning
  ═══════════════════════════════════════════════════════════════════════════════
  
  Denne modulen er én sannhetskilde (single source of truth) for:
  - Landing page ROI-kalkulator
  - Dashboard backtest-visning
  - Paper trading simulering
  - Live trading performance estimater
  
  Bruker ekte historiske data fra Binance med realistiske fees og slippage.
  
  @module lib/trading/backtestEngine

## Eksporterte funksjoner
- `strategyIdToRiskProfile()`
- `fetchHistoricalData()`
- `runBacktest()`
- `calculateBacktest()`
- `calculateBacktestWithProfile()`
- `formatBacktestResult()`
- `markBacktestConverted()`
- `calculateBacktestWithCache()`

## Typer/Interfaces
- `OHLCV`
- `BacktestTrade`
- `BacktestMetrics`
- `BacktestScenarios`
- `BacktestResult`
- `BacktestInput`
- `RiskProfile`
- `StrategyId`
- `StrategyConfig`
- `FormattedBacktestResult`
- `BacktestWithCacheResult`

## Konstanter
- `STRATEGY_CONFIGS`
- `BacktestEngine`

---
*Auto-generert av trading-knowledge-miner.mjs*
