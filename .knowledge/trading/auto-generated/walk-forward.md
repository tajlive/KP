# walk-forward

**Fil:** `src/lib/trading/walk-forward.ts`
**Tester:** ❌ Nei

## Beskrivelse
═══════════════════════════════════════════════════════════════════════════════
  WALK-FORWARD OPTIMIZATION — Validate strategy parameters against overfitting
  ═══════════════════════════════════════════════════════════════════════════════
 
  Splits historical data into rolling windows of in-sample (IS) for parameter
  optimization and out-of-sample (OOS) for validation. If OOS metrics closely
  track IS metrics, the strategy parameters are robust (not overfit).
 
  Key concept: A strategy that only works on IS data is overfit to noise.
  Walk-forward analysis detects this before real capital is at risk.
 
  @module lib/trading/walk-forward

## Eksporterte funksjoner
- `runWalkForward()`
- `runAnchoredWalkForward()`

## Typer/Interfaces
- `WalkForwardConfig`
- `WalkForwardWindow`
- `WalkForwardMetrics`
- `WalkForwardResult`
- `WalkForwardVerdict`

## Konstanter
*Ingen eksporterte konstanter*

---
*Auto-generert av trading-knowledge-miner.mjs*
