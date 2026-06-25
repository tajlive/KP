# GitHub Actions – Feilsøking og optimalisering

> **⚠️ MEST UTDATERT (2026-06-24)**
>
> Tabellen under refererer til den gamle Vercel-baserte stacken. Klarpakke kjører nå på **Cloudflare Workers (OpenNext.js + Wrangler)**. Se `AGENTS.md` og `docs/PRODUCTION_RELEASE_CHECKLIST.md` for gjeldende deploy- og feilsøkingsrutiner.
>
> Siste kjente problem (ikke Vercel-relatert) er dokumentert nederst: **phantom `BuildFailed` workflow (#96)**.

**Sist oppdatert:** 2026-03-19

---

## Feilanalyse (mars 2026)

| Workflow                | Feil                                                                                     | Løsning                                                                                                                                                                                       |
| ----------------------- | ---------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **🚀 Deploy**           | `Project names cannot contain ---` (400)                                                 | Legg til `VERCEL_ORG_ID` og `VERCEL_PROJECT_ID` i Settings → Secrets. Finn i Vercel Dashboard: Org ID under Team Settings → General; Project ID under Project Settings.                       |
| **🚀 Deploy**           | `Project not found`                                                                      | Feil `VERCEL_ORG_ID` eller `VERCEL_PROJECT_ID`. Kjør `vercel link` lokalt, sjekk `cat .vercel/project.json` for riktige verdier. Sjekk at VERCEL_TOKEN tilhører samme team. Oppdater secrets. |
| **📋 Auto-create PR**   | `GitHub Actions is not permitted to create or approve pull requests (createPullRequest)` | Gå til **Settings → Actions → General → Workflow permissions** → velg **Read and write permissions** (ikke bare Read). Lagre.                                                                 |
| **🗄️ DB push on merge** | `Mangler SUPABASE_PROJECT_REF`                                                           | Legg til `SUPABASE_PROJECT_REF` og `SUPABASE_ACCESS_TOKEN`. Kjører kun ved endring i `supabase/**` eller `db-push*.yml`. Bruker `continue-on-error` – feil blokkerer ikke andre workflows.    |
| **E2E Critical**        | Firefox feil / timeouts                                                                  | Workflow bruker kun Chromium i CI (Firefox hoppes over). Sett `E2E_USER_EMAIL` og `E2E_USER_PASSWORD` for auth-tester.                                                                        |

---

## Påkrevde secrets (full liste)

```
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY
VERCEL_TOKEN
VERCEL_ORG_ID          # Vercel Team/Org Settings → General
VERCEL_PROJECT_ID      # Vercel Project Settings
SENTRY_AUTH_TOKEN
SUPABASE_PROJECT_REF   # eller SUPABASE_PROJECT_ID (vuxbjlykgmzskxbclquf)
SUPABASE_ACCESS_TOKEN # For db push og Supabase CLI
```

---

## Slik henter du Vercel IDs

1. **VERCEL_ORG_ID:** Gå til [vercel.com/account](https://vercel.com/account) → Team Settings → General → **Team ID**
2. **VERCEL_PROJECT_ID:** Åpne prosjektet → Settings → **Project ID** (i URL eller under General)

Eller via CLI:

```bash
vercel link  # lenker til prosjekt
cat .vercel/project.json  # viser orgId og projectId
```

---

## Hurtigfix med gh CLI

```bash
# Sett alle secrets (etter å ha verdi klar)
gh secret set VERCEL_ORG_ID --repo tajlive/KP
gh secret set VERCEL_PROJECT_ID --repo tajlive/KP
gh secret set SUPABASE_PROJECT_REF --repo tajlive/KP
gh secret set SUPABASE_ACCESS_TOKEN --repo tajlive/KP
```

---

## Verifiser at workflows kjører

```bash
gh run list --repo tajlive/KP --limit 10
gh run view <RUN_ID> --repo tajlive/KP --log-failed  # Se kun feilede steg
```

---

## Phantom `BuildFailed` workflow (#96) — 2026-06-24 (oppdatert 2026-06-25)

**Symptom:** Hver push/PR/schedule/dependabot-event får en workflow-run med status `startup_failure` fra en slettet `BuildFailed`-workflow (workflow-id `260912064`). Ingen andre workflows kjører. Dette blokkerer auto-deploy til Cloudflare Workers.

**Rotårsak:** Dette er en **korrupt backend-registrering i GitHub Actions**, ikke noe som kan repareres fra repo-siden. Registreringen har:
- `id`: `260912064`
- `name`: `""` (tom)
- `path`: `"BuildFailed"`
- `state`: `"deleted"`
- `html_url`: `https://github.com/tajlive/KP/blob/main/BuildFailed`

Filen `BuildFailed` finnes ikke i noen branch (`git log --all -- BuildFailed` er tom), men registreringen trigger fortsatt runs på alle events. Dette samsvarer med flere kjente GitHub-community-rapporter (f.eks. `community/discussions/197048`, `194540`, `190193`) der samme type phantom workflow blokkerer hele Actions-oppsettet.

**Forsøkte workaround (ingen fungerte):**
1. Slette alle workflow-runs for phantom workflow-id `260912064` (791+ runs slettet).
2. Fjerne `BuildFailed.yml` fra alle remote grener (fant den i `fix/pr1-stop-bleeding`).
3. Deaktivere/aktivere Actions på nytt.
4. Gi default branch nytt navn (`main` → `main-temp` → `main`, deretter `production`, og tilbake til `main`).
5. Legge til en midlertidig dummy `.github/workflows/BuildFailed.yml` for å tvinge re-indeksering (fjernet igjen).
6. Teste `repository_dispatch` som alternativ trigger — phantom workflowen fanger også denne event-typen.
7. Slette `production`-branch som var opprettet som workaround.

**Konklusjon:** Ingen repo-side operasjon fjerner phantom workflowen. `PUT /repos/tajlive/KP/actions/workflows/260912064/disable` returnerer `403 "Unable to disable a workflow that is not active"` fordi state allerede er `deleted`.

**Påkrevd handling:** Kontakte **GitHub Support** og be om at workflow-registrering `260912064` purges manuelt fra GitHub's backend. Se `docs/GITHUB-SUPPORT-PHANTOM-WORKFLOW.md` for ferdig support-henvendelse.

**Midlertidig workaround:** Bruk manuell deploy til Cloudflare Workers:
```bash
npm run cf:build && npx wrangler deploy --minify --var APP_VERSION:$(git rev-parse HEAD)
```

**Verifiser status:**
```bash
# Phantom workflow (fortsatt fastlåst)
gh api repos/tajlive/KP/actions/workflows/260912064

# Aktive workflows i repoet
gh api repos/tajlive/KP/actions/workflows --paginate | jq '.workflows[] | {id, name, path, state}'
```

**Status:** 🔴 **Blokkert av GitHub backend-bug**. Auto-deploy fungerer ikke før GitHub Support fjerner registreringen.

---

Se også: [.github/GITHUB_SETUP.md](../.github/GITHUB_SETUP.md) for full oppsett.
