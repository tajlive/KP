# Phantom-Kapital — Rotårsak & Permanent Fiks

**Sesjon:** 2026-07-29 kveld  
**Alvorlighetsgrad:** 🔴 KRITISK — regnskapsfeil som påvirker ALLE brukere

---

## Fenomen

Tom Arne Jensen (`0dd08529`) hadde paper-balance på 94 689,55 kr, men totalt investert over alle sessions var 244 054 kr (fra 100 000 kr startkapital). Dette ga 144 054 kr i «phantom-kapital» — penger som ble brukt men aldri fantes.

Dashboardet viste 3-4 krasjede sessions med handler — hver session hadde fått «friske» 94 689 kr.

---

## Rotårsak

`ensureActiveSession()` i `src/app/api/jokertrade/route.ts` hentet `paper_accounts.current_balance` og brukte dette som `current_capital` for nye sessions:

```typescript
const capital = account?.current_balance ?? DEFAULT_CAPITAL;
```

Problemet: `paper_accounts.current_balance` reflekterer KUN den aktive sessionens kapital (via DB-trigger). Når en session kræsjer, «fryses» kapitalen i den krasjede sessionen. Paper-balance synkroniseres IKKE tilbake — den forblir på forrige verdi. Neste gang `ensureActiveSession` kjører, får den nye sessionen FULL paper-balance, uten å vite at det allerede er kapital låst i tidligere sessions.

**Eksempel:**
1. Session A: 100 000 kr → handler for 50 000 → kræsjer (saldo 50 000, men paper viser 100 000)
2. Session B: 100 000 kr → handler for 47 000 → kræsjer (saldo 53 000, paper viser fortsatt ~100 000)
3. Session C: 100 000 kr → handler for 45 000 → aktiv (saldo 55 000)

→ Totalt investert: 142 000 kr fra 100 000 kr kapital (phantom: 42 000)

---

## Permanent fiks

Implementert `getRealAvailableCapital()` i `ensureActiveSession`:

```
Reell disponible kapital =
  paper_accounts.current_balance
  − SUM(total_value av ALLE åpne kjøp på tvers av ALLE sessions)
  + SUM(total_value av ALLE åpne salg på tvers av ALLE sessions)
```

Dette gir sessionen KUN de pengene som faktisk er disponible — ikke phantom-penger.

Minimum garantert: 100 kr (`Math.max(realCapital, 100)`).

---

## Engangskorreksjon

For alle brukere: `paper_accounts` tilbakestilt til `100 000 + total_realized_pnl` (fjerner phantom-kapital):

```sql
UPDATE paper_accounts pa SET current_balance = subquery.corrected
FROM (
  SELECT t.user_id,
    GREATEST(100000 + COALESCE(SUM(t.realized_pnl) FILTER (WHERE t.realized_pnl IS NOT NULL), 0), 1000) AS corrected
  FROM trades t GROUP BY t.user_id
) subquery
WHERE pa.user_id = subquery.user_id;
```

---

## Verifisering

```sql
-- For en gitt bruker: sjekk at total_invested ≈ paper_balance (ikke >> paper_balance)
SELECT 
  (SELECT SUM(total_value) FROM trades WHERE user_id = 'X' AND side = 'buy') AS spent,
  (SELECT SUM(total_value) FROM trades WHERE user_id = 'X' AND side = 'sell') AS recovered,
  (SELECT current_balance FROM paper_accounts WHERE user_id = 'X') AS balance;
```

---

## ⚠️ Oppdatering 2026-07-29 (v4.1): `getRealAvailableCapital()` er FJERNET

Den opprinnelige fiksen med `getRealAvailableCapital()` skapte et nytt problem: for brukere med åpne posisjoner (f.eks. 16 åpne kjøp verdt 234k), ble reell disponible kapital ~100 kr. Dashboardet viste "Tilgjengelig saldo: 100 kr" for en konto med 99 485 kr i paper_accounts. Dette var verre UX enn originalen.

**Nåværende approach (v4.1):**
- `ensureActiveSession()` bruker `paper_accounts.current_balance` DIREKTE — ingen subtraksjon
- Åpne posisjoner håndteres av triggeren (`GREATEST(..., 0)`) — kapital kan ikke gå under 0
- Sessions gjenbrukes — én session per bruker, ingen phantom-duplisering
- Paper_accounts oppdateres via trigger og er source of truth

