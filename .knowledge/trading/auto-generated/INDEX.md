# Trading Engine — Auto-generert Dokumentasjon

**Generert:** 2026-05-12
**Kilde:** `src/lib/trading/`
**Filer:** 38

## Oversikt

| Fil | Funksjoner | Typer | Tester |
|-----|------------|-------|--------|
| [auto-trader](auto-trader.md) | 1 | 0 | ❌ |
| [backtestEngine](backtestEngine.md) | 8 | 11 | ❌ |
| [balance](balance.md) | 2 | 1 | ❌ |
| [binance-executor](binance-executor.md) | 0 | 0 | ❌ |
| [build-trade-reason](build-trade-reason.md) | 5 | 3 | ❌ |
| [build-trading-analytics](build-trading-analytics.md) | 2 | 3 | ✅ |
| [circuit-breaker](circuit-breaker.md) | 3 | 3 | ❌ |
| [confluent-signal-engine](confluent-signal-engine.md) | 4 | 3 | ❌ |
| [currency](currency.md) | 3 | 0 | ❌ |
| [data-source-state](data-source-state.md) | 2 | 5 | ❌ |
| [emergency](emergency.md) | 6 | 1 | ❌ |
| [executor-factory](executor-factory.md) | 0 | 0 | ❌ |
| [explanations](explanations.md) | 3 | 7 | ❌ |
| [fallback-signals](fallback-signals.md) | 1 | 1 | ✅ |
| [indicators](indicators.md) | 5 | 0 | ❌ |
| [me-trades-api](me-trades-api.md) | 0 | 2 | ❌ |
| [monte-carlo](monte-carlo.md) | 1 | 2 | ❌ |
| [multi-timeframe](multi-timeframe.md) | 2 | 2 | ❌ |
| [order-executor](order-executor.md) | 3 | 7 | ❌ |
| [paper-demo-risk-defaults](paper-demo-risk-defaults.md) | 0 | 0 | ❌ |
| [paper-executor](paper-executor.md) | 0 | 0 | ❌ |
| [paper-trade-simulator](paper-trade-simulator.md) | 6 | 12 | ❌ |
| [paper-ui-symbols](paper-ui-symbols.md) | 0 | 0 | ❌ |
| [portfolio-allocator](portfolio-allocator.md) | 2 | 4 | ❌ |
| [position-ledger](position-ledger.md) | 10 | 4 | ❌ |
| [risk-level-mapping](risk-level-mapping.md) | 4 | 2 | ❌ |
| [risk-metrics](risk-metrics.md) | 12 | 1 | ❌ |
| [risk](risk.md) | 5 | 1 | ❌ |
| [session-limits](session-limits.md) | 1 | 0 | ✅ |
| [signal-generator](signal-generator.md) | 1 | 1 | ❌ |
| [strategy-configs](strategy-configs.md) | 4 | 7 | ❌ |
| [strategy-id-aliases](strategy-id-aliases.md) | 1 | 1 | ✅ |
| [trade-effective-pnl](trade-effective-pnl.md) | 2 | 0 | ❌ |
| [trade-history-aggregates](trade-history-aggregates.md) | 1 | 2 | ✅ |
| [trade-history-mode](trade-history-mode.md) | 2 | 1 | ❌ |
| [trading-integrity-sync](trading-integrity-sync.md) | 1 | 0 | ❌ |
| [walk-forward](walk-forward.md) | 2 | 5 | ❌ |
| [win-rate-from-trades](win-rate-from-trades.md) | 1 | 1 | ✅ |

## Kjernekomponenter (etter antall eksporter)
- **risk-metrics** — 12 funksjoner
- **position-ledger** — 10 funksjoner
- **backtestEngine** — 8 funksjoner
- **emergency** — 6 funksjoner
- **paper-trade-simulator** — 6 funksjoner

## Mangler testdekning
- `risk-metrics.ts`
- `position-ledger.ts`
- `backtestEngine.ts`
- `emergency.ts`
- `paper-trade-simulator.ts`
- `build-trade-reason.ts`
- `indicators.ts`
- `risk.ts`
- `confluent-signal-engine.ts`
- `risk-level-mapping.ts`
- `strategy-configs.ts`
- `circuit-breaker.ts`
- `currency.ts`
- `explanations.ts`
- `order-executor.ts`
- `balance.ts`
- `data-source-state.ts`
- `multi-timeframe.ts`
- `portfolio-allocator.ts`
- `trade-effective-pnl.ts`
- `trade-history-mode.ts`
- `walk-forward.ts`
- `auto-trader.ts`
- `monte-carlo.ts`
- `signal-generator.ts`
- `trading-integrity-sync.ts`
- `binance-executor.ts`
- `executor-factory.ts`
- `me-trades-api.ts`
- `paper-demo-risk-defaults.ts`
- `paper-executor.ts`
- `paper-ui-symbols.ts`

---
*Auto-generert av trading-knowledge-miner.mjs. Oppdateres manuelt eller via CI.*
