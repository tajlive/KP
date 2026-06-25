# GitHub Actions – Feilsøking og optimalisering

> **⚠️ MEST UTDATERT (2026-06-24)**
>
> Tabellen under refererer til den gamle Vercel-baserte stacken. Klarpakke kjører nå på **Cloudflare Workers (OpenNext.js + Wrangler)**. Se `AGENTS.md` og `docs/PRODUCTION_RELEASE_CHECKLIST.md` for gjeldende deploy- og feilsøkingsrutiner.
>
> Siste kjente problem (ikke Vercel-relatert) er dokumentert nederst: **phantom `BuildFailed` workflow (#94)**.

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

## Phantom `BuildFailed` workflow (#94) — 2026-06-24

**Symptom:** Hver push/PR får en ekstra workflow-run med status `startup_failure` fra en slettet `BuildFailed`-workflow (workflow-id `260912064`). Dette blokkerer auto-deploy til Cloudflare Workers.

**Rotårsak:** GitHub Actions har en fastlåst backend-registrering for workflow-filen `.github/workflows/BuildFailed.yml`. Selv om filen er slettet fra `main`, eksisterer registreringen fortsatt — sannsynligvis fordi gamle grener (`feat/dark-fleet-phase1`, `deps/*`, `backup/*`) fremdeles inneholder en `BuildFailed.yml`-fil (eller `archived/BuildFailed.yml`), noe som hindrer GitHub i å fjerne den globale registreringen.

**Forsøkte workaround:**
- Deaktivere/aktivere Actions på nytt.
- Gi default branch nytt navn (`main` → `main-temp` → `main`).
- Legge til en midlertidig dummy `BuildFailed.yml` for å tvinge re-indeksering (fjernet igjen).

**Løsning (2026-06-25):** Slette **alle** workflow-runs for phantom workflow-id `260912064`. Når siste run ble fjernet, forsvant også den fastlåste registreringen fra GitHub's backend (nå 404). Auto-deploy fungerer igjen.

```bash
# List alle runs for phantom workflowen
gh api repos/tajlive/KP/actions/workflows/260912064/runs --paginate

# Slett alle runs (gjentas til ingen gjenstår)
gh api repos/tajlive/KP/actions/runs/<RUN_ID> -X DELETE
```

**Status:** ✅ Løst. Phantom workflow er fjernet og normale workflows kjører på push igjen.

**Verifiser kjørte workflow-runs:**
```bash
gh run list --repo tajlive/KP --limit 10
gh api repos/tajlive/KP/actions/workflows/260912064  # skal gi 404
```

---

Se også: [.github/GITHUB_SETUP.md](../.github/GITHUB_SETUP.md) for full oppsett.
