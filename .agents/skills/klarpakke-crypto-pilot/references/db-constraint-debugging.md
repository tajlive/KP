# DB Constraint Debugging — trades-tabellen

## Symptom

`executeTrade()` returnerer: `"Failed to record trade: new row violates check constraint 'trades_xyz'"` eller `"...column X is NOT NULL"`.

## Diagnose

```sql
-- NOT NULL-kolonner (kan IKKE utelates i INSERT):
SELECT column_name, is_nullable, column_default
FROM information_schema.columns
WHERE table_name = 'trades' AND is_nullable = 'NO'
ORDER BY ordinal_position;

-- CHECK constraints:
SELECT conname, pg_get_constraintdef(oid)
FROM pg_constraint
WHERE conrelid = 'trades'::regclass AND contype = 'c';
```

## Vanlige feil

| Kolonne | Problem | Fiks |
|---------|---------|------|
| `is_copy` | NOT NULL, mangler i INSERT | Legg til `is_copy: false` |
| `is_mock` | NOT NULL + CHECK `IS NOT TRUE` | `is_mock: false` (paper = false!) |
| `idempotency_scope` | NOT NULL | Legg til `idempotency_scope: "trade"` |
| `executed_at` | NOT NULL | Formater ISO 8601 med tidssone |

## JokerTrade v4 fix (2026-07-29)

`execute-trade.ts` manglet `is_copy` og `is_mock` i tradeInsert-objektet.
La til:
```typescript
is_copy: false,
is_mock: false, // CHECK constraint: is_mock IS NOT TRUE
```

## Dobbelt balansevisning — pausede sesjoner

**Symptom:** Dashboard viser ~2× faktisk balanse.

**Rotårsak:** `getAccountBalance()` + `syncPaperAccountBalance()` inkluderte `paused` sessions.

**Fiks:** `.eq("status", "active")` — kun aktive sesjoner. Pausede har egen kapital som IKKE skal summeres.
