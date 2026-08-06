# Prod-skjema → idempotent migrasjon (KLA-rydding 2026-07-25)

Spillebok for «tabellen finnes i prod men mangler CREATE i repo» — gjør databasen
reproduserbar uten å røre prod-data. Brukt på user_klt_balances, klt_transactions,
trading_logs, ai_cache (migrasjon `20260726000001_kla_missing_tables.sql`).

## Steg 1 — Verifiser eksistens (aldri stol på repo-alene)

Repo-skanning tar feil begge veier: denne runden antok kartleggingen at
`unified_trading_sessions` og `klt_spending_options` var «stille døde» — begge
finnes i prod (1010 resp. 6 rader). Sjekk ALLTID mot prod:

```sql
SELECT table_name FROM information_schema.tables
WHERE table_schema='public' AND table_name IN (<kandidater>);
```

## Steg 2 — Hent skjema 1:1 (5 objekttyper per tabell)

```sql
-- Kolonner (navn, udt, nullable, default):
SELECT column_name, udt_name, is_nullable, column_default
FROM information_schema.columns
WHERE table_schema='public' AND table_name='<t>' ORDER BY ordinal_position;

-- Constraints (PK, UNIQUE, CHECK, FK + ON DELETE):
SELECT conname, pg_get_constraintdef(oid) FROM pg_constraint
WHERE connamespace='public'::regnamespace AND conrelid='<t>'::regclass;

-- RLS-policyer (MED definisjoner — qual = USING, with_check = CHECK):
SELECT policyname, cmd, qual, with_check FROM pg_policies
WHERE schemaname='public' AND tablename='<t>';

-- Indekser (indexdef gir komplett CREATE):
SELECT indexname, indexdef FROM pg_indexes
WHERE schemaname='public' AND tablename='<t>';

-- Triggere + RLS-status (relrowsecurity!):
SELECT trigger_name, action_timing, event_manipulation, action_statement
FROM information_schema.triggers WHERE event_object_table='<t>';
SELECT relname, relrowsecurity FROM pg_class c
JOIN pg_namespace n ON n.oid=c.relnamespace
WHERE n.nspname='public' AND c.relname='<t>';
```

Alle via Management API: `write_file` payload → `curl -d @fil` (heredoc feiler stille).
Merk: `pg_policies` krever kolonnene `policyname/cmd/qual/with_check` — `polname/polcmd`
(fra eldre dokumentasjon) gir stille feil i noen Postgres-versjoner.

## Steg 3 — Skriv migrasjonen IDEMPOTENT

Tabellen finnes i prod → alt må kunne kjøres uten effekt:

- `CREATE TABLE IF NOT EXISTS` (hele statementet hoppes over — inkl. inline PK/FK.
  Delvis-tilstand repareres ikke, men prod har allerede riktig skjema; målet er fresh-DB)
- `CREATE INDEX IF NOT EXISTS`
- `DROP POLICY IF EXISTS "<navn>"` FØR hver `CREATE POLICY` (policyer har ikke IF NOT EXISTS)
- `ALTER TABLE ... ENABLE ROW LEVEL SECURITY` (idempotent, ingen feil om allerede på)
- Policy-funksjoner (f.eks. `is_service_role()`): verifiser at de finnes i en KANONISK
  migrasjon før du refererer dem — ellers må funksjonen med i din migrasjon
- Seed-data: `INSERT ... ON CONFLICT DO NOTHING`

## Regel: gjenskap AS-IS, ikke «forbedre»

Prod-skjemaet er sannheten selv når det ser rart ut. Eksempel:
`unified_trading_sessions` har INGEN PK, INGEN RLS, INGEN indekser i prod — migrasjonen
skal reprodusere akkurat det, ikke legge til PK «fordi det burde ha det». Schema-endringer
er en egen beslutning (DB er hellig-regelen), ikke en bieffekt av reproduksjon.

## Steg 4 — Valider + diff-gate

```bash
git add supabase/migrations/<fil>.sql
node scripts/validate-migrations.mjs --staged   # kun staged filer, flatt i supabase/migrations/
```

Vis KOMPLETT diff til Tom FØR commit (DB er hellig). Vent på eksplisitt OK.

## Felle: duplikat migrasjonsversjon knekker fresh-replay

`node scripts/validate-migrations.mjs` (full kjøring, uten --staged) fanger
duplikate timestamp-prefiks — Supabase CLI bruker prefikset som PK i
`supabase_migrations.schema_migrations`, så to filer med samme prefiks = fresh
deploy stopper på den andre. Funnet i repo: `20260709000000` × 2 (pre-eksisterende).

Sjekk hva prod faktisk har applied før du renamer (repo-historikk ≠ prod-historikk):

```sql
SELECT version FROM supabase_migrations.schema_migrations
WHERE version LIKE '<prefiks>%' ORDER BY version;
```

Rename av en allerede-applied migrasjon er trygt når innholdet er idempotent —
den «nye» versjonen kjører en gang som no-op. Repo har 4 versjoner i prod som aldri
har eksistert i repo (20260725005815 m.fl.) — direkte SQL-editor-kjøringer.

**Duplikat-håndtering (Toms regel, 2026-07-25):** Er de to filene innholdsmessig
IDENTISKE (`diff` tom) → SLETT den ene i stedet for rename. Er de forskjellige →
rename én til neste ledige suffiks (`…000001`) og KRAV: det rena­mede innholdet må
være idempotent, fordi prod allerede har kjørt den delte versjonen (patch inn
`DROP POLICY IF EXISTS` etc. — `course_seed_data` viste seg allerede idempotent,
da holdt rename alene). Validatoren stopper på FØRSTE duplikat — re-kjør FULL
`node scripts/validate-migrations.mjs` etter hver fiks; denne runden lå det en
andre duplikat (`20260710110000`) bak den første.

## Toms seed-regel (2026-07-25) — brukerdata ALDRI i migrasjoner

Seed kun KONFIG-data (f.eks. `klt_spending_options` sine 6 produkt-rader).
BRUKERDATA seedes aldri — `unified_trading_sessions` hadde 1010 rader i prod,
men migrasjonen fikk KUN skjema. Tom korrigerte dette eksplisitt; anta aldri at
«tabellen har data» impliserer «seed dem».

**Felle — aldri gjett seed-verdier:** Hent ALLE kolonner og rader FØR du skriver
seed (`SELECT jsonb_agg(row_to_json(t)) …`). Trunkert tool-output frister til å
ekstrapolere — denne runden ble 2 av 6 seed-rader skrevet med gjettede
beskrivelser fra avkuttet JSON og måtte korrigeres mot faktisk innhold.

## Variant B — tabellen finnes IKKE i prod («stille døde kall»)

Da finnes intet prod-skjema å kopiere. Prosedyre:
1. `grep -rln "\"<tabell>\"\|'<tabell>'" src` — finn alle kallsteder. NULL kallere
   utenfor selve ruten (f.eks. `api/leads`) → anbefal SLETTING av ruten, ikke tabell.
2. Utled skjema fra verifisert kodebruk: kolonner fra `.select()`/`.insert()`/
   `.upsert()`-payloads; `onConflict: 'a,b'` → UNIQUE(a,b)-constraint kreves;
   `.eq('symbol', …)` → kolonne + sannsynlig PK/kandidatnøkkel.
3. Cache-tabeller: `symbol text PK + <payload> jsonb + created_at` holder.
4. Presenter tabell-for-tabell med anbefaling (opprett ELLER fjern kode) og la
   Tom avgjøre — ikke gjett (scope-disiplin).
