# DB-objekt-kartlegging (KLA-rydding 2026-07-25)

**Metode:** Full skan av repo (411 SQL-filer, ~800 src-filer).
176 `CREATE TABLE` i migrasjoner → 173 gyldige etter drop/rename.
25 tabell-referanser i kode peker på objekter som ikke kan gjenskapes fra kanoniske migrasjoner.

---

## 🔴 KATEGORI 1 — Kritisk prod-drift (4 tabeller)

Disse **virker i prod**, men har ingen `CREATE TABLE` noe sted i repoet.
De ble opprettet manuelt (r4-transaksjonen 25.07) → en fresh deploy eller
nytt dev-miljø knekker. **Migrasjoner må skrives nå.**

| Tabell | Brukes av | Status i prod |
|---|---|---|
| `user_klt_balances` | `/api/klt/balance`, `/api/user/klt-wallet`, `lib/gamification/klt.ts`, `actions/admin/users.ts` | ✅ Verifisert (r7: 10 000 KLT) |
| `klt_transactions` | `klt-wallet`, `lib/gamification/klt.ts`, `lib/courses/actions.ts`, `actions/admin/users.ts` | ⚠️ Sannsynligvis manuelt opprettet |
| `trading_logs` | `/api/cron/tick`, `/api/user/trading-logs`, `/api/ai/autopilot/rebalance`, `tick-guardrails.ts` | ⚠️ Ukjent |
| `ai_cache` | `/api/ai/insight`, `/api/ai/market-brief` | ⚠️ Ukjent |

**Tiltak:** Hent faktisk skjema fra prod og commit som migrasjon:

```sql
-- Kjør i Supabase SQL Editor (prod) per tabell:
select column_name, data_type, is_nullable, column_default
from information_schema.columns
where table_schema = 'public' and table_name = 'user_klt_balances'
order by ordinal_position;

-- Sjekk også RLS-policyer og indekser:
select policyname, cmd, qual from pg_policies where tablename = 'user_klt_balances';
select indexdef from pg_indexes where tablename = 'user_klt_balances';
```

Kjent om `user_klt_balances` fra kodebruk: `user_id`, `balance`, `total_earned`, `total_spent`, `created_at`, `updated_at`.

---

## 🟡 KATEGORI 2 — Stille døde kall (9 tabeller)

Ingen `CREATE TABLE` noe sted. Koden kaller dem, men de finnes
sannsynligvis ikke i prod heller → stille feil som aldri vises.

| Tabell | Filer | Anbefaling |
|---|---|---|
| `leads` | `/api/leads/route.ts` | Opprett (lead-fangst er verdifull) eller fjern ruten |
| `market_data` | `/api/market-intelligence`, `lib/auto-trading/market-regime.ts` | Opprett eller fjern |
| `market_ohlcv_cache` | `/api/market-intelligence/route.ts` | Opprett eller fjern |
| `regime_cache` | `/api/market-intelligence/route.ts` | Opprett eller fjern |
| `backtest_cache` | `lib/trading/backtestEngine.ts` | Opprett (ytelse) eller fjern |
| `auto_trading_reviews` | `lib/auto-trading/performance-review.ts` | Opprett eller fjern |
| `unified_trading_sessions` | `src/store/bot-store.ts` | Opprett eller fjern |
| `klt_spending_options` | `/api/klt/spending-options/route.ts` | Opprett eller fjern |
| `campaign_clicks` | `/api/admin/stats/route.ts` | Opprett eller fjern |

**Verifiser først (prod SQL Editor):**
```sql
select table_name from information_schema.tables
where table_schema = 'public' and table_name in (
  'leads','market_data','market_ohlcv_cache','regime_cache','backtest_cache',
  'auto_trading_reviews','unified_trading_sessions','klt_spending_options','campaign_clicks'
);
-- Tomt resultat = bekreftet stille død → velg opprett ELLER fjern per tabell
```

---

## 🟠 KATEGORI 3 — Migrasjons-drift (12 tabeller)

Finnes i SQL, men KUN i `_historical/`, `_archive/`, `v3_0/` eller
`scripts/` — ikke i kanoniske migrasjoner. En ny deploy fra scratch
mangler disse:

`paper_accounts`, `paper_trades`, `leaderboard_entries` (← `_archive/kla-53/`),
`api_keys`, `beta_applications`, `client_errors`, `course_progress`, `orders` (← `_historical/`),
`beta_signups` (← `supabase/sql-scripts/`),
`campaign_contacts`, `email_tracking` (← `scripts/email-campaign/`),
`european_tax_reports` (← `v3_0/`)

**Tiltak:** Bekreft at disse er kjørt i prod (de virker å være det),
og konsolider dem inn i kanoniske migrasjoner slik at DB kan gjenskapes.

---

## ✅ Verifisert OK underveis

- `ModulePage.metadataTitle` / `LessonPage.metadataTitle` ("{title} | Klarpakke") er
  **legitim ICU-interpolasjon** — kalles med `{ title }`-parameter. Ikke bugs.
- `kursPage.metadataTitle` var den eneste placeholder-buggen (fikset i PR #117).
- `public/jokertrade-landing.html` + `public/icons/jokertrade/*` har **null referanser**
  → slettet i denne PR-en (løser rapportens åpne beslutning).

## Prioritert handlingsliste

1. **Skriv migrasjoner for kategori 1** (kritisk — prod kan ikke reproduseres)
2. Kjør verifikasjons-SQL for kategori 2, velg opprett/fjern per tabell
3. Konsolider kategori 3 inn i kanoniske migrasjoner
4. Merge denne PR-en (kartlegging + sletting av døde landingsside-filer)
