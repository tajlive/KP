# executor-factory

**Fil:** `src/lib/trading/executor-factory.ts`
**Tester:** ❌ Nei

## Beskrivelse
Executor Factory
 
  Creates the appropriate OrderExecutor based on trading mode.
  This is the key abstraction that allows strategies and API routes
  to work identically in paper and live mode.
 
  Usage:
    const executor = await ExecutorFactory.create(userId, 'paper');
    const result = await executor.executeOrder({ ... });

## Eksporterte funksjoner
*Ingen eksporterte funksjoner*

## Typer/Interfaces
*Ingen eksporterte typer*

## Konstanter
*Ingen eksporterte konstanter*

---
*Auto-generert av trading-knowledge-miner.mjs*
