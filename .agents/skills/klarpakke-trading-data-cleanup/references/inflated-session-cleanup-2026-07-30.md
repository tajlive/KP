# Inflated session cleanup — 2026-07-30

## Bakgrunn

Tick-kvantum-bugen skapte paper-sesjoner med inflert kapital og PnL. Noen ble markert `archived=true` men fortsatt `status='active'`. Andre trades fikk negativ kvantitet.

## Funn før fiks

| Problem | Antall |
|---|---|
| Inflerte aktive sesjoner (>1M kapital/PnL) | 1 |
| `archived=true` + `status='active'` | 3 |
| Trades med `quantity < 0` | 4 |
| Brukere med >1 aktiv paper-sesjon | 0 |
| `paper_accounts` vs `user_profiles` mismatch | 0 |

## SQL-migrasjon

Se `supabase/migrations/20260730220000_cleanup_inflated_sessions_and_invalid_trades.sql` i repoet.

Hovedpunkter:
1. `UPDATE trading_sessions SET status='stopped' WHERE archived=true AND status='active'`
2. `DELETE FROM trades WHERE quantity < 0`
3. CTE med `ROW_NUMBER()` for å sikre maks én aktiv paper-sesjon per bruker
4. Preventive:
   - `CHECK (quantity > 0)` på `trades`
   - Partial unique index `idx_one_active_paper_session_per_user`
   - Trigger `trg_prevent_archived_active`

## Verifisering etter fiks

```sql
SELECT COUNT(*) FROM trading_sessions WHERE archived = true AND status = 'active';
-- 0

SELECT COUNT(*) FROM trades WHERE quantity < 0;
-- 0

SELECT COUNT(*) FROM (
  SELECT user_id FROM trading_sessions
  WHERE mode='paper' AND status='active'
  GROUP BY user_id HAVING COUNT(*) > 1
) x;
-- 0
```

## Lærdom

- Inflerte sesjoner påvirker ikke live trading, men vises i dashboard/leaderboard hvis de er aktive.
- Arkivert + aktiv er en logisk selvmotsigelse — alltid fiks data først, deretter constraint/trigger.
- Negativ kvantitet kommer fra corrupt fill-model og bør slettes, ikke repareres, hvis sesjonen allerede er arkivert/stoppet.
