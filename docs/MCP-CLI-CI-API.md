# MCP, CLI, CI og API — oversikt

> Én plass for tilgang (MCP/CLI), pipelines (CI) og app-API.  
> Oppdatert: 2026-03-15

---

## 1. MCP (Cursor / AI-verktøy)

### Konfigurasjon

| Fil | Bruk |
|-----|------|
| `.cursor/mcp.json` | Cursor IDE: hvilke MCP-servere som startes og med hvilke args/env |
| `.mcp/mcp_config.json` | Generell MCP-konfig (kun env-referanser, ingen hemmeligheter) |

**Hemmeligheter:** Aldri committe tokens. Bruk miljøvariabler:

- **Cursor:** Linear bruker `scripts/run-linear-mcp.mjs`, som leser `LINEAR_API_KEY` fra `.env.local`. For GitHub, Supabase, Vercel, Stripe, Sentry, Resend: sett variablene i Cursor / shell (f.eks. `GITHUB_TOKEN`, `SUPABASE_ACCESS_TOKEN`, `VERCEL_TOKEN`, osv.).
- **Referanse:** `docs/COMMON-SECRETS.md`, `.env.local.example`, `docs/MCP-SECRETS-SETUP.md`

### Servere i `.cursor/mcp.json`

| Server | Kommando / notater |
|--------|---------------------|
| github | `npx -y @modelcontextprotocol/server-github` — env: `GITHUB_TOKEN` |
| linear | `node scripts/run-linear-mcp.mjs` — nøkkel fra `.env.local` |
| supabase | `npx -y @supabase/mcp-server-supabase@latest` — `SUPABASE_ACCESS_TOKEN`, project-ref |
| playwright | `npx -y @playwright/mcp@latest` |
| resend | `npx -y resend-mcp@latest` — env: `RESEND_API_KEY` |

### Verifisere MCP

```bash
npm run linear:test   # Linear API (leser .env.local)
npm run test:mcp      # test-mcp-connections.sh (Supabase, Stripe, Vercel, Resend)
```

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
npm run vercel:env    # npx vercel env pull .env.local
npm run deploy:prod   # npx vercel --prod
```

### Test og verify

```bash
npm run lint
npm run type-check
npm run test:unit     # vitest
npm run test:e2e:smoke
npm run verify        # node scripts/verify-production.mjs
npm run verify:prod   # smoke mot prod-URL
```

---

## 3. CI (GitHub Actions)

### Viktige workflows

| Workflow | Trigger | Hovedsteg |
|----------|---------|-----------|
| **test.yml** | push/PR til main, develop | Lint → type-check → i18n audit → build (SKIP_LINT_IN_BUILD) → E2E smoke |
| **pr-check.yml** | PR mot main | Lint → build (SKIP_LINT_IN_BUILD) → artifact |
| **manual-deploy.yml** | workflow_dispatch | Build → deploy til Vercel → verify mot prod |
| **mcp-integration.yml** | push/PR ved endring av MCP-filer | Valider .cursor/mcp.json + .mcp/mcp_config.json (gyldig JSON), sikkerhetssjekk |
| **mcp-health.yml** | Schedule + dispatch | Sjekk Supabase REST, Stripe, Vercel, Resend (bruker secrets) |

### Nødvendige secrets (CI)

- `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` (eller vars/secrets som brukes i build)
- `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` (mcp-health)
- `STRIPE_SECRET_KEY`, `VERCEL_TOKEN`, `RESEND_API_KEY` (mcp-health)
- For deploy: Vercel-prosjekt knyttes via `VERCEL_ORG_ID`, `VERCEL_PROJECT_ID` og token

Bygg bruker `SKIP_LINT_IN_BUILD=true` slik at lint kjører én gang; build skipper ESLint. Se **docs/vercel-build-notes.md** §8.

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
  - **Supabase CLI:** `supabase db push` (ev. `supabase migration repair --status reverted <version>` først hvis remote har divergert).  
  - **Supabase MCP:** Når MCP er tilkoblet, bruk verktøyet `apply_migration` med name `enable_rls_eight_tables` og query = innholdet i migrasjonsfilen.  
  - **Manuelt:** Lim inn SQL i Supabase Dashboard → SQL Editor.
- **Detaljer:** **docs/RLS-AUDIT-2026-03-13.md** (se «Løsning (KLA-165)»).

---

## 6. Hurtigreferanse

| Ønske | Handling |
|-------|----------|
| Linear i Cursor | `.env.local` med `LINEAR_API_KEY` → omstart Cursor → `npm run linear:test` |
| Linear uten MCP | `npm run linear issues` / `create` / `update` |
| Sentry prod | Sett `NEXT_PUBLIC_SENTRY_DSN` i Vercel prod → **docs/SENTRY-PROD.md** |
| Bygg raskere i CI | Allerede satt: SKIP_LINT_IN_BUILD + cache (§8 vercel-build-notes) |
| API-dokumentasjon | **docs/api-routes.md** |
| Alle secrets | **docs/COMMON-SECRETS.md**, **docs/MCP-SECRETS-SETUP.md** |
