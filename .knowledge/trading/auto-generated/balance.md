# balance

**Fil:** `src/lib/trading/balance.ts`
**Tester:** ❌ Nei

## Beskrivelse
Balance Source of Truth — Unified balance fetcher
 
  ADR: docs/adr/ADR-2026-04-24-BALANCE-SOURCE-OF-TRUTH.md
 
  Rule: trading_sessions.current_capital_nok is the canonical balance.
        user_profiles.paper_balance, wallets.balance, and portfolios.current_balance
        are kept in sync via trigger_update_session_state.
 
  Use these helpers instead of ad-hoc Supabase queries to ensure all pages
  read the same number.

## Eksporterte funksjoner
- `getUserBalance()`
- `getDisplayBalance()`

## Typer/Interfaces
- `UserBalance`

## Konstanter
*Ingen eksporterte konstanter*

---
*Auto-generert av trading-knowledge-miner.mjs*
