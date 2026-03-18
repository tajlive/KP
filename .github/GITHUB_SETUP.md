# GitHub-oppsett for KP (Klarpakke)

**Repo:** [https://github.com/tajlive/KP](https://github.com/tajlive/KP)

Denne filen beskriver anbefalt oppsett i GitHub-websiden for å få full optimalisering og sikkerhet.

---

## 1. Repo-innstillinger (Settings → General)

| Innstilling                            | Anbefalt verdi                                                              |
| -------------------------------------- | --------------------------------------------------------------------------- |
| **Repository name**                    | `KP` (eller beholde nåværende)                                              |
| **Description**                        | `Norges første krypto-trading skole. Next.js, Supabase, Vercel.`            |
| **Website**                            | `https://www.klarpakke.no`                                                  |
| **Topics**                             | `nextjs`, `supabase`, `vercel`, `crypto`, `trading`, `norway`, `typescript` |
| **Default branch**                     | `main`                                                                      |
| **Allow merge commits**                | Valgfritt (squash anbefales for ren historikk)                              |
| **Allow squash merging**               | ✅ Anbefalt                                                                 |
| **Allow rebase merging**               | ✅ Valgfritt                                                                |
| **Automatically delete head branches** | ✅ Anbefalt (ryddigere repo)                                                |

---

## 2. Branch protection (Settings → Branches → Add rule)

**Merk:** For **private** repo krever branch protection GitHub Pro (eller gjør repoet offentlig). For offentlige repo er det gratis.

**Branch name pattern:** `main`

- ✅ **Require a pull request before merging**
  - Required approvals: 0 eller 1 (etter behov)
- ✅ **Require status checks to pass before merging**
  - Required checks: `quick-check` (fra PR Check workflow) – eller de du faktisk bruker
- ✅ **Require branches to be up to date before merging**
- ✅ **Do not allow bypassing the above settings** (unntatt for admins om ønskelig)
- Valgfritt: **Require conversation resolution before merging**
- Valgfritt: **Restrict who can push to matching branches** (kun maintainers)

---

## 3. Actions (Settings → Secrets and variables → Actions)

### Nødvendige secrets

| Secret                          | Bruk                                   |
| ------------------------------- | -------------------------------------- |
| `NEXT_PUBLIC_SUPABASE_URL`      | Build + Preview/Production             |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Build + Preview/Production             |
| `VERCEL_TOKEN`                  | Manual Deploy (og ev. Vercel CLI i CI) |
| `SENTRY_AUTH_TOKEN`             | Build (source maps til Sentry)         |

**Slik setter du SENTRY_AUTH_TOKEN (manuelt):**  
Sentry MCP støtter ikke token-oppretting. Prosjektet **klarpakke-production** ligger i org **elbatt-chatbot**.

1. Gå til [elbatt-chatbot → Auth Tokens](https://elbatt-chatbot.sentry.io/settings/auth-tokens/).
2. Opprett ny token med scopes **project:releases** og **org:read**.
3. Kjør:  
   `gh secret set SENTRY_AUTH_TOKEN --repo tajlive/KP`  
   og lim inn token når du blir bedt om det.

### Valgfrie secrets

| Secret                                 | Bruk                           |
| -------------------------------------- | ------------------------------ |
| `SNYK_TOKEN`                           | Security Audit workflow (Snyk) |
| `E2E_USER_EMAIL` / `E2E_USER_PASSWORD` | E2E-tester mot innlogging      |
| `LHCI_GITHUB_APP_TOKEN`                | Lighthouse CI (hvis brukt)     |

### Variables (Settings → Secrets and variables → Variables)

| Variable      | Bruk                                                               |
| ------------- | ------------------------------------------------------------------ |
| `PREVIEW_URL` | Valgfritt: base URL for E2E/Lighthouse (f.eks. Vercel preview-URL) |

---

## 4. CODEOWNERS

Fil `.github/CODEOWNERS` er inkludert i repoet. Standard: hele repo eies av `@tajlive`.  
For å kreve review fra code owners: aktiver det i branch protection under "Require review from Code Owners".

---

## 5. Dependabot

Konfigurasjon ligger i `.github/dependabot.yml`:

- Månedlig oppdateringer (mandag 09:00 Oslo)
- Kun patch/minor (ingen major automatisk)
- Maks 3 åpne PRs
- Labels: `dependencies`, `automated`

Sikkerhetsvarsler håndteres alltid av GitHub uavhengig av schedule.

---

## 6. Workflows (Actions) — konsolidert mars 2026

### Kjerne-workflows (alltid aktive)

| Workflow       | Fil              | Trigger                                   | Formål                                                                                                                                |
| -------------- | ---------------- | ----------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------- |
| **PR Check**   | `pr-check.yml`   | PR mot `main`                             | Lint, type-check, unit tests, build. Auto-fix lint + PR-kommentar ved feil. **Required status check.**                                |
| **Deploy**     | `deploy.yml`     | Push til `main` (auto) + manuell dispatch | Lint, build, Vercel deploy, verify, Cloudflare purge. Erstatter `manual-deploy.yml` + deploy-jobs fra `test.yml`.                     |
| **Auto-merge** | `auto-merge.yml` | Dependabot PR                             | Auto-approve + squash-merge patch/minor Dependabot PRs etter CI passerer.                                                             |
| **Auto-label** | `auto-label.yml` | PR opened/sync                            | Labels PR basert på endrede filer (frontend, backend, trading, auth, ci, database, i18n, docs, tests). Config: `.github/labeler.yml`. |

### Støtte-workflows

| Workflow             | Fil                    | Trigger                                     | Formål                                                                   |
| -------------------- | ---------------------- | ------------------------------------------- | ------------------------------------------------------------------------ |
| **E2E Critical**     | `e2e-critical.yml`     | Push/PR til `main`, daglig 06:00, manuell   | Playwright kritiske flows (Chromium + Firefox). Slack-varsling ved feil. |
| **Security Audit**   | `security-audit.yml`   | Mandager 09:00, manuell                     | npm audit, secret-scan, valgfritt Snyk                                   |
| **Dependency Check** | `dependency-check.yml` | 1. i måneden, manuell                       | depcheck, knip                                                           |
| **MCP Health**       | `mcp-health.yml`       | Hverdager 06:00, manuell                    | Sjekker Supabase, Stripe, Vercel, Resend, Cloudflare                     |
| **MCP Integration**  | `mcp-integration.yml`  | Push/PR med MCP-config-endringer            | Validerer MCP-konfigurasjon                                              |
| **Schema Dump**      | `schema-dump.yml`      | Push til `main` (migrasjoner), daglig 05:00 | Dumper DB-skjema til docs                                                |
| **DB Push**          | `db-push.yml`          | Manuell                                     | Kjører `supabase db push`                                                |

### Deaktiverte workflows (`workflows-disabled/`)

Gamle/overlappende workflows beholdes som referanse: `test.yml`, `manual-deploy.yml`, `e2e-tests.yml`, `typescript-check.yml`, m.fl.

### PR-flyt (komplett)

```
PR opprettet → auto-label → pr-check (lint, type-check, test, build)
                                ↓ feil?
                         auto-fix lint + PR-kommentar
                                ↓ OK?
                         merge til main → deploy (auto) → verify → Cloudflare purge
```

### Dependabot-flyt

```
Dependabot PR → auto-merge (approve + squash) → pr-check → merge → deploy
```

---

## 7. Feilretting når CI feiler

Når **PR Check** (eller andre workflows) feiler på en PR:

1. **Se status:** Åpne PR-en og sjekk at **quick-check** (PR Check) er rød, eller gå til [Actions](https://github.com/tajlive/KP/actions) og åpne den feilede kjøringen.
2. **Krav for merge:** `quick-check` må være grønn for å kunne merge til `main`. Branch protection blokkerer merge inntil CI er grønn.
3. **Finn feilen:** I den feilede kjøringen, klikk på jobben **quick-check** og se hvilket steg som er rødt (Lint, Type Check, Unit Tests, eller Build).
4. **Fix lokalt:** Kjør de samme kommandoene lokalt:
   - `npm run lint -- --quiet`
   - `npm run type-check`
   - `npm run test:coverage`
   - `npm run build`
5. **Failure summary:** Ved feil skriver PR Check en **Failure summary** øverst i jobbloggen med de samme kommandoene. Ved type-check-feil kan du laste ned **typecheck**-artifactet (3 dager) for full feiloutput.
6. **TypeScript-feil:** Ofte løses type-feil med `npm run type-check` lokalt; rett typene og push på nytt.

7. **Auto-fix for lint:** Hvis **kun** Lint-feilet, prøver CI å kjøre `npm run lint -- --fix` og pushe en commit til PR-branchen. Da starter en ny kjøring automatisk. Hvis feilen var type-check eller build, skjer ingen auto-push.

---

## 8. Hurtigsjekkliste

- [ ] Description og topics satt på repo
- [ ] Default branch er `main`
- [ ] Branch protection på `main` med status checks
- [ ] Secrets satt: `NEXT_PUBLIC_SUPABASE_*`, `VERCEL_TOKEN`, `SENTRY_AUTH_TOKEN`
- [ ] CODEOWNERS aktiv hvis du vil bruke review-krav
- [ ] Squash merge eller merge strategy valgt
- [ ] Automatisk sletting av head branches (valgfritt)

---

_Sist oppdatert: mars 2026_
