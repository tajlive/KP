# Debug Patterns — 2026-08-03

Nye debug-mønstre fra fakta-verifisering-sesjonen. For eldre mønstre, se `klarpakke-debug-patterns` SKILL.md.

---

## Supabase connection pool exhausted

**Symptom:** `execute_sql` gir "Connection terminated due to connection timeout", men `get_publishable_keys` / `get_project_url` fungerer.

**Diagnose:** Sjekk `get_logs(service="postgres")` — se etter:
- `"canceling statement due to statement timeout"`
- `"could not accept SSL connection: Connection reset by peer"`
- `"could not receive data from client: Connection reset by peer"`
- `"cron job startup timeout"`

**Rotårsak:** Database overbelastet med cron-jobs (pg_cron scheduler for mange samtidige jobs) → connection pool exhausted → nye connections feiler.

**Fiks:** Restart Supabase-prosjektet via Management API:
```bash
curl -X POST "https://api.supabase.com/v1/projects/$PROJECT_REF/restart" \
  -H "Authorization: Bearer $SUPABASE_ACCESS_TOKEN"
```

**Prevensjon:**
- Overvåk `pg_stat_activity` for aktive connections
- Juster `max_connections` (default 100) eller reduser cron-frequency
- Vurder connection pooler (PgBouncer/Supavisor) for høy-trafikk prosjekter

---

## paper_accounts.current_balance ≠ equity

**Symptom:** Dashboard viser 69 864 kr, men korrekt balance er 105 811 kr (eller 199 198 kr med stoppede sesjoner).

**Rotårsak:** Balance-trackeren (`paper_accounts.current_balance`) telte kun cash fra aktive sesjoner, ikke posisjonsverdi eller stoppede sesjoner.

**Fiks:** Beregn korrekt balance fra `trading_sessions`:
```sql
SELECT 
  SUM(current_capital_nok) + 
  SUM(COALESCE((open_position->>'quantity')::numeric, 0) * coin_prices.price)
FROM trading_sessions
WHERE user_id = $1
  AND mode = 'paper'
  AND status IN ('active', 'paused', 'stopped')
```

**Script:** `scripts/repair-paper-account-balances.ts` (TDD, 8/8 tester). 35 brukere reparert.

**Regel:** Balance MÅ alltid inkludere:
1. Cash fra ALLE sesjoner (active, paused, stopped)
2. Posisjonsverdi (open_position.quantity × coin_prices.price)
3. IKKE bare aktive sesjoner — stoppede har fortsatt verdi

---

## P&L-fortegn-bug

**Symptom:** "Total avkastning" viser +175 kr, men DB sier −175,46 kr.

**Rotårsak:** `DashboardPro.tsx` renderte `${totalPnl >= 0 ? "+" : ""}${formatByMode(Math.abs(totalPnl), ...)}` — positiv P&L fikk "+", negativ fikk INGEN "−".

**Fiks:** `"+" : "-"` (1 linje per fil, 2 filer).

**Regel:** Ved `Math.abs(verdi)` med manuelt fortegnsprefiks, sjekk ALLTID begge grenene (+ og −). `"+" : ""` er kun korrekt når råverdien formateres UTEN `Math.abs` (minustegnet kommer da fra tallet selv).

**Verifisering:** `e2e/smoke/pnl-accuracy.spec.ts` sjekker UI mot DB via Supabase RPC.

---

## Beta-justert badge pattern

**Formål:** Transparent UI for balance-korreksjoner uten å forklare tekniske detaljer.

**Implementasjon:**
- `BalanceAdjustmentBadge.tsx` — vises når `paper_accounts.updated_at` < 1 time OG endring > 10%
- `usePreviousBalance` hook — lagrer forrige balance i localStorage
- Tooltip: "Beta-justering: Balansen er korrigert med riktig verdi"
- Forsvinner automatisk etter 1 time

**Fil:** `src/components/BalanceAdjustmentBadge.tsx`

**Bruk:**
```tsx
<BalanceAdjustmentBadge
  updatedAt={stats.accountBalanceUpdatedAt}
  currentBalance={stats.accountBalance}
  previousBalance={previousBalance}
/>
```

---

## Subagent-driven-development med TDD

**Mønster:** Systematisk verifisering av ALLE nettsider mot DB-fakta via parallelle subagenter.

**Prosess:**
1. Lag plan med tasks
2. Dispatch subagenter parallelt (én per task)
3. Hver subagent: TDD → implementasjon → verifisering → commit
4. Parent verifiserer: full test suite + E2E

**Kritiske feller:**
- Subagent går tom for iterasjoner → instruer om å skrive filen TIDLIG
- Balance-reparasjon må inkludere STOPPEDE sesjoner
- E2E-tester mot prod krever deploy før de passerer
- U+00A0 (non-breaking space) i NOK-format — regex må bruke `\s`
- Playwright laster IKKE `.env.local` automatisk — last eksplisitt

**Resultater (2026-08-03):**
- ✅ 35 brukere reparert (balance-bug)
- ✅ Alle språk komplette (i18n)
- ✅ 4 nye E2E-tester (currency, i18n, pnl, all-pages)
- ✅ P&L-fortegn-bug funnet og fikset
- ✅ Dobbel-balanse fikset (én SSoT)
