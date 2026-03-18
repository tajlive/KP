# Automatisere DB-migrasjoner og tier

Hva som allerede er automatisert, og hva du må gjøre for full automatisering.

**Varig løsning (anbefaling):** Se **docs/SUPABASE-MIGRASJONER-VARIG-LOSNING.md** for å få migrasjoner helt automatisk og unngå migrasjonshistorikk-mismatch. Kort fortalt: bruk **Supabase GitHub-integrasjon** med «Deploy to production» som eneste kanal for db push mot prod, eller én dedikert CI-job på `main`.

---

## 1. Allerede automatisert

| Del                               | Hvor                                                             | Merk                                                                                                                                                                                         |
| --------------------------------- | ---------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **db push automatisk ved merge**  | `.github/workflows/db-push-on-merge.yml`                         | **Varig løsning.** Kjører `supabase db push` automatisk ved push til `main` når `supabase/` endres. Krever: `SUPABASE_PROJECT_REF`, `SUPABASE_ACCESS_TOKEN`.                                  |
| **db push ved production-deploy** | `.github/workflows/manual-deploy.yml`                            | Når du velger "production" og kjører Manual Deploy, kjøres `supabase link` + `supabase db push` før build og Vercel-deploy. Krever secrets: `SUPABASE_PROJECT_REF`, `SUPABASE_ACCESS_TOKEN`. |
| **Migrasjonsvalidering på PR**     | `pr-check.yml` → `validate-migrations`                          | Validerer migrasjonsfiler (unike versjoner, filnavn) når `supabase/migrations/` endres. Lokalt: `npm run db:validate-migrations`.                                                            |
| **Type-check**                    | `pr-check.yml`                                                   | `npm run type-check` kjører på hver PR.                                                                                                                                                      |
| **Tier-migrering som migrasjon**  | `supabase/migrations/20260318120000_tier_slug_single_source.sql` | Tier-oppdateringen er en vanlig Supabase-migrasjon. Den kjører automatisk når `db push` kjører – du trenger **ikke** `DATABASE_URL` eller `npm run db:migrate-tier` i CI.                    |

---

## 2. Hva du må gjøre for full automatisering

### 2.1 Fikse migrasjonshistorikk én gang (når "Remote migration versions not found")

Hvis `npm run db:push` eller `npm run db:push:all` feiler med at remote har versjoner som ikke finnes lokalt:

**Rask løsning (når CLI anbefaler revert 20260313 og 20260317140000):**

```bash
npm run db:repair-history
npm run db:push:all
```

(svar **Y** når CLI spør om å pushe migrasjoner)

**Alternativ (fra forum/GitHub):** Prøv først `npx supabase migrations fetch` deretter `npx supabase db push --linked --include-all` (eller `db pull --linked` ved pull-feil). Se [supabase/cli#4009](https://github.com/supabase/cli/issues/4009). Flere løsninger: **docs/SUPABASE-MIGRASJONER-VARIG-LOSNING.md** §6.

**Hvis push fortsatt sier «Remote migration versions not found» (f.eks. 20260313):** Sjekk at `supabase/migrations/20260313_terminal_jobs.sql` finnes. Prøv deretter `npx supabase migrations fetch` og deretter `npm run db:push:all` igjen. Hvis det fortsatt feiler, kjør **kun** de migrasjonene som mangler manuelt i Supabase Dashboard → SQL Editor (fra 20260318120000 og utover), deretter `supabase migration repair --status applied <versjon>` for hver – se **docs/SUPABASE-MIGRASJONER-VARIG-LOSNING.md** §6.

**Manuelt:** Reparer med de versjonene feilmeldingen eller `supabase db pull` nevner, f.eks.:

```bash
npx supabase migration repair --status reverted 20260313 --linked
npx supabase migration repair --status reverted 20260317140000 --linked
```

Deretter: `npm run db:push:all` (svar **Y**).  
**Viktig:** Når CLI foreslår «supabase migration repair --status applied» for flere versjoner – **ikke** bruk det for å «synce» uten å kjøre SQL. Bruk kun de to **revert**-kommandoene over, deretter **db:push:all** slik at migrasjonene faktisk kjøres.

Alternativt: `supabase db pull` for å hente remote-skjema og deretter justere lokale migrasjoner (mer arbeid). Se **docs/08-TROUBLESHOOTING.md** og **docs/runbooks/database-migration.md**.

### 2.2 Kjøre migrasjoner uten full deploy (valgfritt)

For å kjøre **kun** migrasjoner (uten build og Vercel-deploy):

- **Alternativ A:** Bruk workflow **«DB push»** (se under) – manuell trigger som kun kjører `supabase db push`.
- **Alternativ B:** Kjør lokalt: `npm run db:push` (krever at du er logget inn: `npx supabase login` og at prosjektet er linket).

### 2.3 Tier-migrering uten db push (kun hvis nødvendig)

`npm run db:migrate-tier` trenger `DATABASE_URL` i `.env.local` (eller `klarpakke-mcp-server/.env`). Bruk det bare hvis du vil kjøre **kun** tier-SQL mot prod uten å pushe andre migrasjoner. For normal automatisering: la tier-migreringen kjøre som del av `db push` (den ligger allerede i `supabase/migrations/`).

---

## 3. Workflow: kun DB push

Workflow-filen **`.github/workflows/db-push.yml`** (opprettet under) kan trigges manuelt for å kjøre kun migrasjoner. Da trenger du ikke å kjøre full Manual Deploy for å få pushet nye migrasjoner.

- **Trigger:** `workflow_dispatch`.
- **Secrets:** Samme som manual-deploy: `SUPABASE_PROJECT_REF`, `SUPABASE_ACCESS_TOKEN`.
- Ved feil: sjekk feilmeldingen og bruk §2.1 over (repair) før du kjører på nytt.

---

## 4. Oppsummering

| Oppgave                                        | Automatisert? | Hvordan                                                                 |
| ---------------------------------------------- | ------------- | ----------------------------------------------------------------------- |
| **Migrasjoner ved merge til main**             | **Ja**        | `db-push-on-merge.yml` kjører `supabase db push` automatisk.            |
| Migrasjoner (inkl. tier) ved production-deploy | Ja            | Manual Deploy → production → db push kjører.                            |
| Migrasjoner uten deploy                        | Valgfritt     | Kjør workflow «DB push» eller `npm run db:push` lokalt.                  |
| Validering av migrasjonsfiler på PR            | Ja            | `validate-migrations` job i pr-check; lokalt: `npm run db:validate-migrations`. |
| Fikse divergert migrasjonshistorikk            | Nei (én gang) | Manuell repair eller pull (se §2.1).                                    |
| Type-check                                     | Ja            | pr-check på PR.                                                         |
| Linear-oppgaver                                | Nei           | Opprettes manuelt eller via MCP/CLI.                                    |

**Varig løsning:** Etter merge til main kjøres migrasjoner automatisk via `db-push-on-merge.yml`. Du trenger ikke lenger å manuelt trigge DB push.

---

## 5. Bruke PSQL eller API i stedet for CLI

Du kan kjøre migrasjoner og SQL uten Supabase CLI (`db push`).

### PSQL (direkte mot DB)

- **Connection string:** Supabase Dashboard → Project Settings → Database → Connection string (Session pooler eller Direct). Legg i `.env.local` som `DATABASE_URL`.
- **Kjøre én migrasjonsfil:**
  ```bash
  ./scripts/sql.sh file supabase/migrations/20260318120000_tier_slug_single_source.sql
  ```
  eller med psql direkte:
  ```bash
  psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f supabase/migrations/20260318120000_tier_slug_single_source.sql
  ```
- **Historikk:** PSQL oppdaterer ikke `supabase_migrations.schema_migrations`. Hvis du vil at historikken skal matche, må du etterpå kjøre:
  ```sql
  INSERT INTO supabase_migrations.schema_migrations(version, name, statements)
  VALUES ('20260318120000', 'tier_slug_single_source', ARRAY['...']::text[]);
  ```
  (eller bruke `supabase migration repair --status applied 20260318120000 --linked` etter at SQL er kjørt.)

### Dashboard SQL Editor

- Supabase Dashboard → SQL Editor → lim inn innholdet fra en migrasjonsfil → Run.
- Samme som PSQL: historikk oppdateres ikke automatisk. Bruk **repair applied** for den versjonen etterpå hvis du vil synce med CLI.

### API / MCP

- **Supabase MCP** (Cursor): Verktøyene **execute_sql** og **apply_migration** kjører SQL mot prosjektet (krever tilkobling/token). `apply_migration` tar migrasjonsnavn og SQL-innhold og kan brukes for DDL.
- **Egen backend:** En API-route eller Edge Function som bruker `createClient` med service role og kjører SQL (f.eks. via `pg` eller Supabase sin connection) – samme effekt som PSQL, men trigges via HTTP.
- Supabase har ikke en offisiell REST-API for «kjør denne migrasjonsfilen»; du kjører SQL via DB-tilkobling eller MCP.
