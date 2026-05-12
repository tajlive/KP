# circuit-breaker

**Fil:** `src/lib/trading/circuit-breaker.ts`
**Tester:** ❌ Nei

## Beskrivelse
Circuit Breaker – Fault Tolerance for External APIs
  
  Prevents cascading failures when external APIs are down or slow.
  States: CLOSED (normal) -> OPEN (failing) -> HALF_OPEN (testing)
  
  @module trading
  @version 1.0.0

## Eksporterte funksjoner
- `withCircuitBreaker()`
- `getAllCircuitBreakerMetrics()`
- `resetAllCircuitBreakers()`

## Typer/Interfaces
- `CircuitState`
- `CircuitBreakerOptions`
- `CircuitBreakerMetrics`

## Konstanter
- `binanceCircuitBreaker`
- `priceFeedCircuitBreaker`
- `generalApiCircuitBreaker`

---
*Auto-generert av trading-knowledge-miner.mjs*
