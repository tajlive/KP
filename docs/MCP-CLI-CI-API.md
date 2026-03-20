# MCP, CLI, CI og API — oversikt

> Én plass for tilgang (MCP/CLI), pipelines (CI) og app-API.  
> Oppdatert: 2026-03-15

**Full automasjon (forhåndsoppsett):** [FULL-AUTOMATION-PLAYBOOK.md](./FULL-AUTOMATION-PLAYBOOK.md) — MCP/CLI/CI/API, `CRON_SECRET`, GitHub secrets, `npm run auto:preflight`.

---

## 1. MCP (Cursor / AI-verktøy)

### Konfigurasjon

| Fil                    | Bruk                                                              |
| ---------------------- | ----------------------------------------------------------------- |
| `.cursor/mcp.json`     | Cursor IDE: hvilke MCP-servere som startes og med hvilke args/env |
| `.mcp/mcp_config.json` | Generell MCP-konfig (kun env-referanser, ingen hemmeligheter)     |

**Hemmeligheter:** Aldri committe tokens. Bruk miljøvariabler:

- **Cursor:** Linear bruker `scripts/run-linear-mcp.mjs`, som leser `LINEAR_API_KEY` fra `.env.local`. For GitHub, Supabase, Vercel, Stripe, Sentry, Resend: sett variablene i Cursor / shell (f.eks. `GITHUB_TOKEN`, `SUPABASE_ACCESS_TOKEN`, `VERCEL_TOKEN`, osv.).
- **Referanse:** `docs/COMMON-SECRETS.md`, `.env.local.example`, `docs/MCP-SECRETS-SETUP.md`

### Servere i `.cursor/mcp.json`

| Server          | Kommando / notater                                                                                                                      |
| --------------- | --------------------------------------------------------------------------------------------------------------------------------------- |
| github          | `npx -y @modelcontextprotocol/server-github` — env: `GITHUB_TOKEN`                                                                      |
| linear          | `node scripts/run-linear-mcp.mjs` — nøkkel fra `.env.local`                                                                             |
| supabase        | `npx -y @supabase/mcp-server-supabase@latest` — `SUPABASE_ACCESS_TOKEN`, project-ref                                                    |
| **supabase-db** | `node scripts/run-supabase-mcp.mjs` — **DATABASE_URL** fra `.env.local`; 100 % uten Management API-token. Se `docs/MCP-SUPABASE-DB.md`. |
| playwright      | `npx -y @playwright/mcp@latest`                                                                                                         |
| resend          | `npx -y resend-mcp@latest` — env: `RESEND_API_KEY`                                                                                      |
| **vercel**      | `url: https://mcp.vercel.com` — offisiell remote MCP (OAuth i Cursor). Se `docs/VERCEL-MCP-CLI.md`.                                     |
| **cloudflare**  | `url: https://mcp.cloudflare.com/mcp` — offisiell remote MCP (OAuth i Cursor). Se `docs/CLOUDFLARE-MCP-CLI.md`.                         |

**Merk:** Cursor er selv MCP-klient; prosjektets MCP-er står i `.cursor/mcp.json`. Full oversikt for Cursor (MCP-oppsett, CLI, API): **docs/CURSOR-MCP-CLI-API.md**.

### Pre-prod (én kommando)

```bash
npm run preprod:gate
```

Kjører: **lint** → **type-check** → **Vitest med coverage** → **`verify`** (prod-sjekk) → **build** (`SKIP_LINT_IN_BUILD`) → **Lighthouse CI** mot `www.klarpakke.no` (/, priser, innlogging) → **full Playwright** → **Allure-rapport** (`allure-report/`).

Krever: nettverk, Playwright-browsere (`npm run playwright:install`), `.env.local` for E2E mot localhost der det trengs, og ev. `.auth/user.json` fra setup for innloggede prosjekter.

### Playwright (lokal E2E)

- **Nettlesere:** Første gang etter `npm ci` / oppgradering: `npm run playwright:install` (eller `npx playwright install chromium` for kun smoke).
- **Supabase + Next:** Middleware og klient krever **`NEXT_PUBLIC_SUPABASE_URL`** og **`NEXT_PUBLIC_SUPABASE_ANON_KEY`**. `vercel env pull` kan gi `SUPABASE_URL` uten `NEXT_PUBLIC_*` — da feiler `next dev` under Playwright. Synk fra Vercel/Dashboard eller bruk Supabase MCP **get_project_url** + **get_publishable_keys** (legacy `anon` JWT) og legg inn i `.env.local` (se `.env.local.example`).

### Verifisere MCP

```bash
npm run auto:preflight      # Cloud readiness (agent) — start her for «alt på plass»
npm run auto:preflight:full # + test:mcp + linear:test
npm run cloud:bootstrap # Fyller kritiske cloud-keys i .env.local automatisk
npm run cloud:ready   # Sjekk kritiske cloud-env (Linear + Vercel)
npm run cloud:ready:deploy # Sjekk deploy-krav (Vercel) + auto-resolve av ORG_ID
npm run cloud:ready:manual:prod # Sjekk manuell production deploy-krav (inkl. Supabase)
npm run linear:test   # Linear API (leser .env.local)
npm run test:mcp      # test-mcp-connections.sh (Supabase, Stripe, Vercel, Resend, Cloudflare API)
npm run cursor:config # MCP-server-navn + .cursor/rules (uten API-nøkkel)
npm run vercel:test   # Vercel API (VERCEL_TOKEN)
npm run cloudflare:test # Cloudflare API (CLOUDFLARE_API_TOKEN)
npm run stripe:test   # Stripe API (STRIPE_SECRET_KEY)
npm run vipps:test    # Vipps API (VIPPS_CLIENT_ID/SECRET)
npm run cursor:test   # Cursor Cloud Agents API (CURSOR_API_KEY)
```

**Full ENV/MCP/CLI/API/SQL-audit:** **docs/ENV-MCP-CLI-API-AUDIT.md**

---

## 2. CLI (terminal / skript)

### Linear

```bash
npm run linear:test   # Test tilkobling + teams + issues + CLI
npm run linear teams
npm run linear issues [limit]
npm run linear create "Tittel" "Beskrivelse"
npm run linear update <issueId> --status "Done"
```

Detaljer: **docs/LINEAR-ACCESS.md**

### Supabase

```bash
npm run db:push       # supabase db push --linked
npm run db:status     # supabase migration list --linked
npm run db:diff       # supabase db diff --linked
```

### Vercel

```bash
npm run vercel:test   # Test Vercel API (VERCEL_TOKEN fra .env.local)
npm run vercel projects
npm run vercel deployments [limit]
npm run vercel project [projectId]
npm run vercel:env    # npx vercel env pull .env.local
npm run deploy:prod   # npx vercel --prod
```

MCP: I Cursor brukes offisiell Vercel MCP (`https://mcp.vercel.com/klarpakke/klarpakke`). Ved første bruk: klikk «Needs login» og autoriser. **Vercel env:** Agenten har tilgang til Vercel env via MCP og via `npm run vercel:env` (pull til .env.local). Full oversikt: **docs/VERCEL-MCP-CLI.md**. Dashboard-sjekkliste: **docs/VERCEL-SETTINGS.md**.

### Cloudflare

```bash
npm run cloudflare:test   # Test Cloudflare API (CLOUDFLARE_API_TOKEN fra .env.local)
npm run cloudflare zones
npm run cloudflare dns [zoneName]
npm run cloudflare account
npm run cloudflare pages
```

MCP: I Cursor brukes offisiell Cloudflare MCP (`https://mcp.cloudflare.com/mcp`). Ved første bruk: OAuth mot Cloudflare. Full oversikt: **docs/CLOUDFLARE-MCP-CLI.md**.

### Stripe

```bash
npm run stripe:test   # Test Stripe API (STRIPE_SECRET_KEY fra .env.local)
npm run stripe test
npm run stripe prices # Hent pris-IDer fra env og vis Stripe-priser
```

CLI: `scripts/stripe-api.mjs`. MCP: Bruk Stripe MCP (Cursor plugin) eller denne CLI.

### Vipps

```bash
npm run vipps:test    # Test Vipps OAuth-token (VIPPS_CLIENT_ID/SECRET fra .env.local)
npm run vipps test
```

CLI: `scripts/vipps-api.mjs`. MCP: `scripts/run-vipps-mcp.mjs` (vipps i .cursor/mcp.json).

### Cursor (IDE / Cloud Agents)

```bash
npm run cursor:test        # Test Cursor Cloud Agents API (CURSOR_API_KEY)
npm run cursor config      # Vis MCP-server-navn + .cursor/rules (uten API-nøkkel)
npm run cursor me          # API-nøkkelinfo
npm run cursor agents      # List cloud-agenter
npm run cursor agent <id>  # Hent én agent
npm run cursor models      # List modeller
npm run cursor:agent       # Start Cursor CLI agent (krever cursor.com/install)
npm run cursor:agent-ls    # agent ls
npm run cursor:agent-resume # agent resume
```

Cursor er MCP-klient; MCP-er konfigureres i `.cursor/mcp.json`. Cloud Agents API brukes via `scripts/cursor-api.mjs`. Full oversikt: **docs/CURSOR-MCP-CLI-API.md**.

### Test og verify

```bash
npm run lint
npm run type-check
npm run test:unit     # vitest
npm run test:e2e:smoke
npm run verify        # node scripts/verify-production.mjs
npm run verify:prod   # smoke mot prod-URL
npm run verify:automation  # lint + type-check + test:unit + verify + test:mcp (samlet MCP/CLI/API/CI)
```

---

## 3. CI (GitHub Actions)

### Viktige workflows

| Workflow                | Trigger                          | Hovedsteg                                                                         |
| ----------------------- | -------------------------------- | --------------------------------------------------------------------------------- |
| **test.yml**            | push/PR til main, develop        | Lint → type-check → i18n audit → build (SKIP_LINT_IN_BUILD) → E2E smoke           |
| **pr-check.yml**        | PR mot main                      | Lint → build (SKIP_LINT_IN_BUILD) → artifact                                      |
| **manual-deploy.yml**   | workflow_dispatch                | Build → deploy til Vercel → verify mot prod                                       |
| **mcp-integration.yml** | push/PR ved endring av MCP-filer | Valider .cursor/mcp.json + .mcp/mcp_config.json (gyldig JSON), sikkerhetssjekk    |
| **mcp-health.yml**      | Schedule + dispatch              | Sjekk Supabase REST, Stripe, Vercel, Resend, Cloudflare (valgfri; bruker secrets) |

### Nødvendige secrets (CI)

- `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` (eller vars/secrets som brukes i build)
- `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` (mcp-health)
- `STRIPE_SECRET_KEY`, `VERCEL_TOKEN`, `RESEND_API_KEY` (mcp-health)
- `CLOUDFLARE_API_TOKEN` (mcp-health, valgfri – sjekk hoppes over hvis ikke satt)
- For deploy: Vercel-prosjekt knyttes via `VERCEL_ORG_ID`, `VERCEL_PROJECT_ID` og token

Bygg bruker `SKIP_LINT_IN_BUILD=true` slik at lint kjører én gang; build skipper ESLint. Se **docs/vercel-build-notes.md** §8.

`cloud-readiness.mjs` forsøker automatisk å resolve `VERCEL_ORG_ID` fra Vercel API når `VERCEL_PROJECT_ID` og `VERCEL_TOKEN` er satt.

---

## 4. API (app-ruter)

### Oversikt

- **Admin:** `/api/admin/*` — krever innlogging + admin-rolle
- **Linear:** `/api/linear/*` — krever admin (bruker `LINEAR_API_KEY` fra env)
- **Beskyttet:** `/api/onboarding/*`, `/api/referral`, `/api/risk-profiles`, `/api/trading/*`, osv.
- **Offentlig:** `/api/health`, `/api/status`, `/api/pricing`, `/api/sentry`, `/api/test-sentry`, `/api/stripe/*`, `/api/webhooks/*`

Full tabell og sikkerhet: **docs/api-routes.md**

### Sentry (prod)

- `GET /api/test-sentry` — sender server-side test-event når `NEXT_PUBLIC_SENTRY_DSN` er satt i prod.
- Konfigurasjon og verifikasjon: **docs/SENTRY-PROD.md**

### Health

- `GET /api/health` — sjekk DB, KV og env (brukes av verify-script og overvåking).

---

## 5. RLS-migrasjon (KLA-165)

Migrasjon som aktiverer RLS på 8 tabeller:

- **Fil:** `supabase/migrations/20260315100000_enable_rls_eight_tables.sql`
- **Kjøring:**
  - **Supabase CLI:** `supabase db push` (ev. `supabase migration repair --status reverted <version>` først hvis remote har divergert). **Automatisering:** **docs/AUTOMATISERE-DB-OG-MIGRASJONER.md**. **Varig løsning:** **docs/SUPABASE-MIGRASJONER-VARIG-LOSNING.md** (Supabase GitHub-integrasjon / én CI-kanal). Workflow «DB push»: `.github/workflows/db-push.yml`.
  - **Supabase MCP:** Når MCP er tilkoblet, bruk verktøyet `apply_migration` med name `enable_rls_eight_tables` og query = innholdet i migrasjonsfilen.
  - **Manuelt:** Lim inn SQL i Supabase Dashboard → SQL Editor.
- **Detaljer:** **docs/RLS-AUDIT-2026-03-13.md** (se «Løsning (KLA-165)»).

---

## 6. Cron (source of truth)

Cron kjøres alltid fra **Supabase** (pg_cron/scheduler), ikke fra Vercel Cron. Se **docs/CRON-SOURCE-OF-TRUTH.md**.

---

## 7. SQL / PSQL – kanonisk flyt

| Behov                   | Kommando / verktøy                                                                                                                                                |
| ----------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Kjøre migrasjoner       | `npm run db:push` (supabase db push --linked)                                                                                                                     |
| Migrasjonsstatus        | `npm run db:status` (supabase migration list --linked)                                                                                                            |
| Diff mot remote         | `npm run db:diff` (supabase db diff --linked)                                                                                                                     |
| Ad-hoc SQL (fra Cursor) | MCP **supabase-db** → execute_sql / list_tables / apply_migration (krever DATABASE_URL i .env.local). **Notis for Supabase MCP:** **docs/SUPABASE-MCP-NOTIS.md**. |
| Ad-hoc SQL (terminal)   | `scripts/run-sql-rest.mjs` eller `scripts/exec-sql-remote.mjs`; eller `psql $DATABASE_URL -f fil.sql`                                                             |

Se **docs/MCP-SUPABASE-DB.md** for supabase-db MCP. Full audit: **docs/ENV-MCP-CLI-API-AUDIT.md** §5.

---

## 8. Release-flow (push → deploy)

**Automatisert:** Push til `main` trigger Deploy-workflow → build → Vercel prod. Ingen manuell deploy nødvendig.

| Steg                | Kommando                                                       | Beskrivelse                                 |
| ------------------- | -------------------------------------------------------------- | ------------------------------------------- |
| 1. Valider før push | `npm run release`                                              | Lint + type-check + build (samme som CI)    |
| 2. Commit & push    | `git add -A && git commit -m "..." && git push -u origin main` | Trigger Deploy workflow                     |
| 3. Følg deploy      | `gh run watch` (valgfritt)                                     | Venter på at Deploy fullfører               |
| 4. Verifiser prod   | `npm run verify`                                               | Tester domener, /api/health, kritiske paths |

**Manuell Vercel-deploy (CLI):** `npm run deploy:prod` — nyttig hvis CI ikke brukes.

---

## 9. Hurtigreferanse

| Ønske              | Handling                                                                                                                     |
| ------------------ | ---------------------------------------------------------------------------------------------------------------------------- |
| Linear i Cursor    | `.env.local` med `LINEAR_API_KEY` → omstart Cursor → `npm run linear:test`                                                   |
| Linear uten MCP    | `npm run linear issues` / `create` / `update`                                                                                |
| Sentry prod        | Sett `NEXT_PUBLIC_SENTRY_DSN` i Vercel prod → **docs/SENTRY-PROD.md**                                                        |
| Bygg raskere i CI  | Allerede satt: SKIP_LINT_IN_BUILD + cache (§8 vercel-build-notes)                                                            |
| Release til prod   | `npm run release` → `git push origin main` → Deploy workflow                                                                 |
| API-dokumentasjon  | **docs/api-routes.md**                                                                                                       |
| Alle secrets / ENV | **docs/COMMON-SECRETS.md**, **docs/MCP-SECRETS-SETUP.md**, **docs/ENV-MCP-CLI-API-AUDIT.md**                                 |
| Release-flow       | `npm run release` → `git push origin main` → Deploy workflow kjører automatisk → Vercel prod. Se **.github/GITHUB_SETUP.md** |
