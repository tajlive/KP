# Varig løsning: Automatiske Supabase-migrasjoner

Anbefalinger basert på [Supabase Docs](https://supabase.com/docs/guides/deployment), [GitHub Integration](https://supabase.com/docs/guides/deployment/branching/github-integration), [Managing Environments](https://supabase.com/docs/guides/deployment/managing-environments) og community (forum, GitHub issues).

---

## 1. Anbefalt: Supabase GitHub-integrasjon (native)

**Hvor:** Supabase Dashboard → Project Settings → [Integrations](https://supabase.com/dashboard/project/_/settings/integrations).

**Hva det gir:**

- Supabase leser `supabase/` fra GitHub og kjører **migrasjoner automatisk** ved push/merge til production-branch.
- **Deploy to production:** Slå på for å deploye ved push/merge til f.eks. `main`. Da deployes: nye migrasjoner, Edge Functions (fra config), Storage buckets.
- **Automatic branching (valgfritt):** Hver GitHub-branch kan få en egen Supabase-preview; migrasjoner kjøres der først.

**Fordeler:**

- Én kilde til sannhet: repoet. Ingen manuell `db push` fra lokale maskiner som kan divergere.
- Færre «Remote migration versions not found» fordi kun CI/Supabase kjører migrasjoner mot prod.
- Supabase anbefaler å sette en **required check** for integrasjonen i GitHub, slik at PR ikke kan merges når migrasjon-sjekken feiler.

**Oppsett (kort):**

1. Dashboard → Integrations → Enable GitHub integration.
2. Fyll inn sti til Supabase-mappen (f.eks. `./` eller repo root der `supabase/` ligger).
3. Koble til GitHub-repo og autoriser.
4. Slå på **Deploy to production** (og evt. **Automatic branching**).
5. I GitHub: Settings → Branches → Add rule for `main` → Require status checks → velg «Supabase Preview» / relevant check.

---

## 2. Alternativ: GitHub Actions som eneste motor (uten native integration)

Hvis dere ikke bruker Supabase sin GitHub-integrasjon, bør **kun CI** pushe migrasjoner til produksjon. Da unngår dere at ulike utviklere har ulik migrasjonshistorikk.

**Mønster (fra [Managing Environments](https://supabase.com/docs/guides/deployment/managing-environments)):**

- **Staging:** Push til `develop` → workflow linker mot staging-prosjekt → `supabase db push`.
- **Production:** Push til `main` → workflow linker mot production-prosjekt → `supabase db push`.

**Secrets:** `SUPABASE_ACCESS_TOKEN`, `SUPABASE_PROJECT_REF` (evt. `SUPABASE_DB_PASSWORD` / `SUPABASE_DB_URL` ved behov).

**Regler:**

- Migrasjoner **aldri** kjøres manuelt mot prod fra lokale maskiner; kun via Actions (eller Supabase-integrasjonen).
- Alle schema-endringer går gjennom migrasjonsfiler i repo; ingen (eller minimal) ad-hoc endring i Dashboard. Ved endringer i Dashboard: `supabase db pull` → commit → deretter går alt via migrasjoner igjen.

Dere har allerede noe av dette i **manual-deploy.yml** (db push ved production) og **db-push.yml** (manuell trigger). For full varighet: fjern eller reduser bruk av lokalt `db push` mot prod og la kun CI/Integrasjon gjøre det.

---

## 3. Unngå migrasjonshistorikk-mismatch (single source of truth)

**Årsaker til «Remote migration versions not found» / history mismatch:**

- Migrasjoner kjørt mot remote utenfra (f.eks. annen maskin, annen branch, eller Dashboard).
- Forskjellige migrasjonsfiler lokalt vs. det som ble applied (f.eks. duplikat-versjoner, filer slettet/omdøpt).

**Varige tiltak:**

| Tiltak                              | Beskrivelse                                                                                                                                     |
| ----------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------- |
| **Én kanal til prod**               | Kun Supabase GitHub-integrasjon eller én dedikert CI-job (f.eks. på `main`) kjører `db push` mot produksjon.                                    |
| **Ingen ad-hoc schema i Dashboard** | Unngå å opprette/endre tabeller i Dashboard uten å ta det inn i repo (db pull → commit, eller skriv migrasjon).                                 |
| **Samme repo-tilstand**             | Alle som pusher migrasjoner har pullet siste `main` og har samme sett migrasjonsfiler. Branch protection som krever oppdatert base hjelper.     |
| **Unike migrasjonsversjoner**       | Unngå to filer med samme timestamp/versjon (f.eks. `20260317140000_a.sql` og `20260317140000_b.sql`). Bruk unike timestamps.                    |
| **Repair kun som engangsfiks**      | Bruk `supabase migration repair` når historikk allerede har divergert; deretter la kun CI/Integrasjon kjøre push, så skjer det sjeldnere igjen. |

Kilde: [Supabase CLI migration repair](https://supabase.com/docs/reference/cli/supabase-migration-repair), [Issue #15695](https://github.com/supabase/supabase/issues/15695), community-artikler om history mismatch.

---

## 4. CI: verifisere migrasjoner før merge

Supabase anbefaler å **verifisere migrasjoner i CI** før noen merger til main:

- **Alternativ A (lokal stack):** I PR, kjør `supabase start` og `supabase db reset` (eller liknende) for å applere alle migrasjoner lokalt og kjøre tester. [Managing Environments – CI-eksempel](https://supabase.com/docs/guides/deployment/managing-environments#configure-github-actions).
- **Alternativ B (Supabase Branching):** Med GitHub-integrasjon + Automatic branching får hver PR en preview-branch; Supabase kjører migrasjoner der. Bruk **required check** for den statusen så ingen merger når migrasjon feiler.
- **Alternativ C:** Kjør i CI `supabase migration list` mot et linket prosjekt (f.eks. staging) for å oppdage åpenbare feil; mindre enn full apply, men bedre enn ingenting.

Dere har allerede type-check og lint i PR. Et naturlig neste steg er å enten koble på Supabase-integrasjonen med required check, eller å legge til et steg som verifiserer migrasjoner (lokal eller mot staging).

---

## 5. Oppsummering for Klarpakke

| Mål                            | Anbefaling                                                                                                                                                                                        |
| ------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Varig automatisk migrasjon** | Slå på **Supabase GitHub-integrasjon** med **Deploy to production** på `main`, og la migrasjoner i `supabase/migrations/` være den eneste kilden. Reduser eller fjern manuell `db push` mot prod. |
| **Unngå history mismatch**     | Kun én kanal pusher til prod (Integrasjon eller én CI-job). Ingen schema-endringer i Dashboard uten å ta dem inn i repo. Unike migrasjonsversjoner.                                               |
| **Verifisere før merge**       | Aktiver **required check** for Supabase-integrasjonen, eller legg til CI-steg som kjører migrasjoner (lokal/staging).                                                                             |
| **Når det likevel divergerer** | Bruk `npm run db:repair-history` (eller kommandoene CLI foreslår), deretter `npm run db:push:all` én gang; deretter la kun integrasjonen/CI kjøre push.                                           |

Kort sagt: **Varig løsning = Supabase GitHub-integrasjon som eneste som deployer migrasjoner til prod, med required check og ingen manuell prod-push fra lokale maskiner.** Alternativet er én dedikert GitHub Actions-workflow på `main` som alltid kjører `supabase db push` og som er den eneste som har lov til å endre prod-migrasjonshistorikk.

---

## 6. Løsninger fra forum og nett

Søk på nettet (forum, GitHub, Medium) gir disse konkrete løsningene når «migration history does not match» / «Remote migration versions not found»:

### A) Først prøv: migrations fetch + db pull (GitHub issue #4009)

Flere brukere rapporterer at dette løser feilen ved fresh link eller mismatch:

```bash
npx supabase migrations fetch
npx supabase db pull --linked
```

Kilde: [supabase/cli#4009](https://github.com/supabase/cli/issues/4009) (shulek, xdannyrobertsx).

### B) Repair som CLI foreslår

Når du kjører `db pull` eller `db push`, skriver CLI ofte nøyaktig hva du skal kjøre:

```bash
supabase migration repair --status reverted <timestamp>   # fjerne fra remote-historikk
# eller
supabase migration repair --status applied <timestamp>    # markere som applied
```

Deretter `supabase db pull` eller `supabase db push --include-all`. Kilde: [Supabase CLI migration repair](https://supabase.com/docs/reference/cli/supabase-migration-repair), [Stackademic/Medium](https://medium.com/@salmanazam/fix-remote-databases-migration-history-not-match-local-files-in-supabase-6e61cda9ee53).

### C) Manglende migrasjoner (endret i Dashboard uten migrasjonsfil)

Hvis du har endret schema direkte i Supabase Dashboard og mangler tilsvarende migrasjonsfil:

1. Finn hva som mangler (sammenlign remote schema med lokale filer, evt. med hjelp av AI/LLM som i [Gundeep Singh – Medium](https://medium.com/@gndp/how-to-fix-supabase-migration-history-conflict-45313396661f)).
2. Opprett en ny migrasjonsfil med riktig timestamp og SQL for de manglende endringene.
3. Push med: `supabase db push --include-all`.

Da blir historikk og filer synkronisert. Kilde: [How to fix supabase migration history conflict (Medium, Feb 2026)](https://medium.com/@gndp/how-to-fix-supabase-migration-history-conflict-45313396661f).

### D) Tømme remote migrasjonshistorikk (kun ved fresh start / ny lokal kopi)

**Bare når du vil starte migrasjonshistorikk på nytt** (f.eks. helt ny lokal mappe mot eksisterende prosjekt):

I Supabase Dashboard → SQL Editor:

```sql
DELETE FROM supabase_migrations.schema_migrations;
```

Deretter `supabase db pull` – da får du remote schema som én migrasjon uten historikk-konflikt. **Advarsel:** Bruk ikke dette på prod hvis andre forventer at historikken er uendret. Kilde: [supabase/cli#4009](https://github.com/supabase/cli/issues/4009) (PatoSala), [Answer Overflow](https://www.answeroverflow.com/m/1412447099626328064).

### E) Kun public-schema pull

Noen ganger hjelper det å bare hente public:

```bash
supabase db pull --schema public --linked
```

Kilde: Community-artikler om history mismatch.

### F) Best practice (for å unngå konflikt senere)

Fra community og Supabase: **Gjør alle schema-endringer lokalt** med `supabase migration new <navn>`, skriv SQL i filen, og push med `supabase db push`. Ikke endre schema direkte i Dashboard uten å ta det inn i repo (enten som ny migrasjon eller via `db pull` + commit). Kilde: [Gundeep Singh – Medium](https://medium.com/@gndp/how-to-fix-supabase-migration-history-conflict-45313396661f), Supabase Managing Environments.
