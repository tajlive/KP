# INC-2026-08-12 — Paper Balance Inflation

> **Severity:** SEV-2 (1 bruker inflatert, 35 ok)
> **Status:** ANALYSERT — venter på reparasjonsgodkjenning

---

## Root Cause

1. **`syncPaperAccountBalance`** (kjørt av tick engine hvert 5. min) summerte `current_capital_nok` for aktive/paused paper-sesjoner.
2. Tom-brukerens paper-sesjoner hadde arvet inflaterte `current_capital_nok`-verdier fra tidligere stoppede sesjoner (samme bug-klasse: stoppede sesjoner ble talt med i kapitalsummering før 2026-08-10-fiksen).
3. Summen ble ~188 909 kr — skrevet til `paper_accounts.current_balance`.
4. DB-trigger `trigger_sync_paper_balance` kopierte verdien til `user_profiles.paper_balance`.
5. Dashboard `/api/user/profile` leste `paper_balance` = 188 909 → vist som "~200 000 kr".

## Omfang

| Metrikk | Verdi |
|---|---|
| Paper accounts totalt | 36 |
| Inflaterte (>10% over initial) | 1 (Tom) |
| Korrekte | 35 |

**Berører én enkelt bruker — Tom Arne Jensen.**

## Sikring utført

| Tiltak | Status |
|---|---|
| Pauset 3 paper-sesjoner | ✅ |
| Unscheduled `klarpakke_hourly_balance_sync` (job 1108) | ✅ |
| DB-trigger midlertidig IKKE deaktivert | ⚠️ (trengs ikke hvis reparasjon er atomisk) |
| Live OKX-sesjon uberørt | ✅ |

## Reparasjons-SQL (IKKE KJØRT — venter på godkjenning)

```sql
-- Reparer Tom sin paper_accounts: tilbakestill til initial_balance + PnL
UPDATE paper_accounts
SET current_balance = initial_balance + COALESCE(total_profit_loss, 0),
    updated_at = NOW()
WHERE user_id = '0dd08529-b8a8-4fd3-9806-275e2d0135dd'
  AND current_balance > initial_balance * 1.1;

-- Verifiser at paper_accounts og user_profiles er i sync
-- (trigger sync_paper_balance vil automatisk oppdatere user_profiles ved UPDATE over)
```

## Rollback

```sql
-- Hvis reparasjonen må reverseres: gjenskap fra backup
-- paper_accounts har ikke backup — men initial_balance er uendret.
-- Ved feil: sett current_balance = initial_balance (100 000).
```

## Regresjonstest

Etter reparasjon, legg til test som verifiserer:
1. `paper_accounts.current_balance` ≤ `initial_balance × 1.5` for alle brukere
2. `syncPaperAccountBalance` kaller IKKE for stopped sessions
3. DB-trigger kopierer korrekt verdi

## Kommunikasjon til berørt bruker

> "Hei! Vi oppdaget en feil som gjorde at lekepengesaldoen din viste
> et for høyt beløp (~188 000 kr i stedet for ~100 000 kr). Feilen er
> rettet — din faktiske saldo er uendret. Du har fortsatt 100 000 kr
> i lekepenger. Ingen ekte penger er berørt."

---

**Forfatter:** Hermes · 2026-08-12 · VENTER PÅ GODKJENNING