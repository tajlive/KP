# paper_accounts.current_balance Sync Bug (2026-07-28)

## Symptom

Bruker ser "100 000 kr" på dashboard og trade-side, men har aktive sessions
med tap. Tallene stemmer ikke.

## Rotårsak

`paper_accounts.current_balance` oppdateres IKKE når trades utføres.
Sessions sporer egen kapital korrekt via `trading_sessions.current_capital_nok`,
men den globale kontobalansen forblir på initialverdien.

| Tabell | Verdi | Oppdateres |
|--------|-------|-----------|
| paper_accounts.current_balance | 100 000 kr | ❌ Frosset |
| trading_sessions.current_capital_nok | 94 264 kr | ✅ Live |

## Deteksjon

```sql
-- Sammenlign paper_accounts vs sum av aktive sessions
SELECT
  pa.current_balance,
  COALESCE(SUM(ts.current_capital_nok), 0) as sessions_sum
FROM paper_accounts pa
LEFT JOIN trading_sessions ts ON ts.user_id = pa.user_id
  AND ts.status = 'active'
WHERE pa.user_id = '<user_id>'
GROUP BY pa.current_balance;
```

Hvis `current_balance` ≠ `sessions_sum`: buggen er aktiv.

## Konsekvenser

- Dashboard / portfolio viser feil P&L (0% når det burde være -5.7%)
- WalletBalance-komponenten (ny 2026-07-28) henter sessions-data og viser
  riktig, men paper_accounts-baserte visninger er feil
- Brukeren forstår ikke tallene — "hvorfor står det 100k når jeg taper?"

## Fiks (TODO)

1. **DB-trigger**: Oppdater `paper_accounts.current_balance` når
   `trading_sessions.current_capital_nok` endres
2. **Eller**: Applikasjonsnivå — oppdater paper_accounts etter hver trade.execute()
3. **Verifikasjon**: Etter fiks, kjør detect-SQL over og bekreft at verdiene samsvarer
