# Supabase – oppdatering og optimalisering

## Gjort automatisk (mars 2026)

- **CLI:** Oppgradert fra 2.75.0 til **2.78.1** (brew upgrade supabase).
- **npm:** `@supabase/ssr` → ^0.9.0, `@supabase/supabase-js` → ^2.99.2.

## Optimalisering etter oppdatering

### 1. Database-lint

**Mot remote (anbefalt – trenger ikke lokalt Supabase):**

```bash
npm run db:lint
```

Kjører `supabase db lint --linked`. Sjekker schema på det linkede prosjektet. Krever `supabase link` og innlogging.

**Mot lokalt** (krever `supabase start`):

```bash
supabase db lint
# eller: supabase db lint --local
```

Uten `--linked` prøver lint å koble til localhost:54322, som gir "connection refused" hvis du ikke har kjørt `supabase start`. **Bruk alltid `npm run db:lint`** (eller `supabase db lint --linked`).

### 2. Inspiser remote database (linked project)

Krever at prosjektet er linket (`supabase link`) og at du er innlogget. Nyttig for å se bloat, indekser og treg SQL:

| Kommando                                   | Beskrivelse                                    |
| ------------------------------------------ | ---------------------------------------------- |
| `supabase inspect db db-stats`             | Cache hit rate, total størrelse, WAL           |
| `supabase inspect db table-stats`          | Tabellstørrelser, indeksstørrelser, radestimat |
| `supabase inspect db index-stats`          | Indeksbruk, ubrukte indekser                   |
| `supabase inspect db bloat`                | Estimert bloat (døde tupler)                   |
| `supabase inspect db outliers`             | Tregste spørringer (pg_stat_statements)        |
| `supabase inspect db long-running-queries` | Spørringer som kjører > 5 min                  |
| `supabase inspect db blocking`             | Låser og ventende spørringer                   |
| `supabase inspect db vacuum-stats`         | Vacuum-statistikk per tabell                   |
| `supabase inspect db traffic-profile`      | Les/skriv-aktivitet per tabell                 |

Eksempel med egen connection string:

```bash
# Hvis DATABASE_URL er satt (percent-encoded)
supabase inspect db table-stats --db-url "$(node -p "encodeURIComponent(process.env.DATABASE_URL)")"
```

### 3. Migrasjoner

- **Status:** `supabase migration list`
- **Push (når historikk er ryddig):** `supabase db push`
- **Tier-migrering (uten push):** `npm run db:migrate-tier` (krever DATABASE_URL i .env.local). Se AGENTS.md.

### 4. Anbefalinger

1. Kjør `supabase inspect db index-stats --linked` periodisk for å finne ubrukte indekser.
2. Kjør `supabase inspect db outliers --linked` for å finne trege spørringer.
3. Ved høyt bloat: vurder `VACUUM ANALYZE` på store tabeller (kan gjøres fra Dashboard eller ved vedlikeholds-vindu).
4. Hold CLI oppdatert: `brew upgrade supabase` (eller sjekk [releases](https://github.com/supabase/cli/releases)).

## Lint-resultat (oppsummering)

`npm run db:lint` kan rapportere mange feil. Vanlige årsaker:

| Feil                                            | Tolkning                                                                                                                                                                               |
| ----------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `relation "profiles" does not exist`            | Funksjoner som bruker gamle `profiles` – appen bruker `user_profiles`. Kan fikses med migrering som oppdaterer funksjoner til `user_profiles` eller VIEW `profiles` → `user_profiles`. |
| `relation "trading_sessions" does not exist`    | Linter ser kanskje ikke alle tabeller (f.eks. search_path). Tabellen finnes i migrasjoner.                                                                                             |
| `relation "user_profiles" does not exist`       | Samme: sjekk at tabellen finnes på remote og at lint kobler til riktig schema.                                                                                                         |
| `type "subscription_tier" does not exist`       | Custom type fjernet eller endret – bruk `text`/tier-slug i stedet.                                                                                                                     |
| `function digest(text, unknown) does not exist` | Mangler extension `pgcrypto` – enable med `CREATE EXTENSION IF NOT EXISTS pgcrypto;`                                                                                                   |
| `extensions.index_advisor` / `hypopg_reset`     | Supabase-extension – kan ignoreres eller følge Supabase-versjon.                                                                                                                       |

For å bare telle feil: `npm run db:lint 2>/dev/null | grep -c '"level":"error"'`.

### Fikser for teknisk gjeld (mars 2026)

- **Migrering `20260318140000_fix_db_lint_functions.sql`**: Fikser (1) pgcrypto for digest(), (2) `decrypt_binance_keys` – kolonnenavn kvalifisert med alias `ds.decrypted_secret`, (3) `can_follow_leader` – bruker `TEXT` for tier og inkluderer `student`.
- **profiles vs user_profiles**: Mange funksjoner refererer fortsatt til tabellen `profiles` som ikke finnes på linked DB (canonical er `user_profiles`). Løsning: enten VIEW `profiles` som mapper fra `user_profiles`, eller oppdatere hver funksjon til å bruke `user_profiles` og riktige kolonnenavn. Dokumentert som gjeld i dette avsnittet.

## Referanser

- [Supabase CLI – Getting the CLI](https://supabase.com/docs/guides/cli/getting-the-cli)
- [Supabase Changelog](https://supabase.com/changelog)
- AGENTS.md (tier-migrering, db:migrate-tier)
