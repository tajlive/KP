# PortfolioChart Flatness Diagnosis

## Symptom
Portefølje-grafen viser en helt flat linje, mens headeren viser en reell balanse (f.eks. 99 134 kr, -0.9%). Alle datopunkter har samme verdi.

## Root Cause
Grafen bygges fra **to ulike datakilder** som ikke alltid er synkronisert:

| Element | Kilde | Hva det viser |
|---------|-------|---------------|
| **Header** (saldo + endring %) | `paper_accounts.current_balance` — DB | Reell kontobalanse, inkludert urealiserte posisjoner |
| **Kurve** (datapunkter) | `trades.realized_pnl` — akkumulert P&L | Kun REALISERT gevinst/tap fra fullførte handler |

Hvis `trades.realized_pnl` er `null` for alle trades (åpne posisjoner, ufullstendige handler), er akkumulert P&L = 0 → kurven viser startkapital på alle punkter → flat linje.

## Vanlige scenarioer

### 1. Grid trading nettopp aktivert (ingen fullførte sykluser)
Grid-trader kjøper på et nivå og selger på neste. Første kjøp→salg-syklus kan ta 2–8 timer. Frem til da er `realized_pnl = null` for alle grid-åpne posisjoner.

### 2. Bare åpne kjøp, ingen salg
Hvis strategien bare har åpnet posisjoner (BUY uten SELL), er `realized_pnl = null`. Kurven viser ingen endring, men headeren reflekterer markedsverdi (unrealisert).

### 3. Gammel multi-signal strategi med åpne posisjoner
78 trades med `realized_pnl = null` fordi strategien sjelden fullførte kjøp→salg-sykluser.

## Verifisering

```sql
-- Sjekk om trades har realized_pnl
SELECT count(*), count(*) FILTER (WHERE realized_pnl IS NOT NULL) as antall_realisert
FROM trades
WHERE created_at > now() - interval '24 hours';
-- → 9 total, 0 realisert = forklarer flat kurve

-- Sjekk kontobalanse (header-verdien)
SELECT current_balance, initial_balance
FROM paper_accounts
WHERE user_id = '<brukers id>';
-- → current_balance 99 134, initial_balance 100 000 → -0.87% (matcher header)
```

## Når blir grafen normal?
Når grid-strategien fullfører sin første kjøp→salg-syklus og `realized_pnl` settes ≠ null, vil kurven begynne å bevege seg.
