# Automatisk DB-push og type-sync (operasjonsplan)

**Formål:** Én repeterbar flyt for agenter, utviklere og CI: migrasjoner ut på remote og `src/types/supabase-generated.ts` i synk med skjema — uten manuelle «husk å kjøre gen types»-steg der det er unngåelig.

**Linear:** **KLA-233** (migrasjon + typer), **KLA-238** (copy-trading discover som case).

---

## 1. Hva som kjører automatisk i dag

| Trigger                                                                     | Hva skjer                                                                                                                                                                                                                                   |
| --------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Push til `main`** med endring i `supabase/**` (eller denne workflow-fila) | [`.github/workflows/db-push-on-merge.yml`](../../.github/workflows/db-push-on-merge.yml): `supabase link` + `db push`, deretter **`npm run db:gen-types`** og sjekk at `src/types/supabase-generated.ts` matcher (feiler jobben hvis ikke). |
| **PR mot `main`** med endring i `supabase/**`                               | [`.github/workflows/db-lint.yml`](../../.github/workflows/db-lint.yml): `db lint --linked --fail-on error` (warnings stopper ikke). Valgfritt som required check i branch protection.                                                       |
| **Lokal / agent**                                                           | `npm run db:ship` — samme push + gen-types (se nedenfor). `npm run db:lint:ci` — samme lint som CI.                                                                                                                                         |

**GitHub-secrets (produksjon):** `SUPABASE_ACCESS_TOKEN` + `SUPABASE_PROJECT_REF` (eller `SUPABASE_PROJECT_ID`). Mangler de, hopper workflow over push (varsel) og kjører ikke types-verifisering.  
**Synk fra lokal `.env.local`:** `npm run secrets:sync:github` (se [.github/SETUP_SECRETS.md](../../.github/SETUP_SECRETS.md)).

---

## 2. Lokalt og i Cursor-agenter

```bash
npm run db:ship
```

**Forutsetning (én av disse):**

- `SUPABASE_ACCESS_TOKEN` + `SUPABASE_PROJECT_REF` (eller `SUPABASE_PROJECT_ID`) i miljøet, **eller**
- allerede `supabase link` mot riktig prosjekt (`supabase db push --linked`).

Etter kjøring: hvis `git status` viser endring i `src/types/supabase-generated.ts`, **commit i samme PR** som migrasjonen — da passer CI på `main`.

---

## 3. Supabase cron — **ikke** for skjema-migrasjoner

Per [CRON-SOURCE-OF-TRUTH.md](../CRON-SOURCE-OF-TRUTH.md) brukes **pg_cron / Supabase scheduler** til **gjentakende oppgaver** (HTTP mot `/api/cron/*` med `CRON_SECRET`, e.l.).

- **DDL / migrasjoner** hører hjemme i **GitHub Actions** (`db-push-on-merge`) eller **Supabase → GitHub-integrasjon** (se [SUPABASE-MIGRASJONER-VARIG-LOSNING.md](../SUPABASE-MIGRASJONER-VARIG-LOSNING.md)).
- Det finnes **ingen meningsfull pg_cron-jobb** som erstatter `db push`; cron løser ikke «migrasjon ligger i repo men ikke på remote».

Hvis automatisk push «ikke går» (mangler secrets / integrasjon):

1. Sett secrets i GitHub **eller** aktiver Supabase native GitHub-deploy til prod.
2. Midlertidig: kjør `npm run db:ship` fra maskin med tilgang, eller kjør migrasjon-SQL kontrollert i Dashboard (siste utvei — ta inn i repo etterpå).

---

## 4. Sjekkliste (kort)

1. Ny migrasjon under `supabase/migrations/`.
2. `npm run db:ship` (eller la CI på `main` pushe — da **må** typer allerede være committet, eller jobben feiler).
3. Commit både `.sql` og oppdatert `supabase-generated.ts`.
4. Lukk **KLA-233** / deloppgave når remote og typer er verifisert.

---

## 5. Relaterte dokumenter

- [SUPABASE-MIGRASJONER-VARIG-LOSNING.md](../SUPABASE-MIGRASJONER-VARIG-LOSNING.md)
- [COPY-TRADING-SOURCE-OF-TRUTH.md](../trading/COPY-TRADING-SOURCE-OF-TRUTH.md)
- [FULL-AUTOMATION-PLAYBOOK.md](../FULL-AUTOMATION-PLAYBOOK.md)
