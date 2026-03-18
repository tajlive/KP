# Klarpakke Agent Guide

## PL/pgSQL-regler (aldri bryt disse)

- **DECLARE må alltid stå på funksjons-toppnivå**, aldri inne i BEGIN
- **Nested sub-blokker kan kun ha BEGIN...EXCEPTION...END**, ikke DECLARE
- **EXCEPTION WHEN OTHERS skal ALLTID ha RAISE WARNING med SQLERRM**
- **Test ny trigger-funksjon** med `DO $$ BEGIN PERFORM ...; END $$` før CREATE TRIGGER

### Eksempel: Riktig vs Feil

```sql
-- ❌ FEIL: Nested DECLARE
BEGIN
  DECLARE v_x TEXT;  -- Ugyldig!
  BEGIN
    ...
  END;
END;

-- ✅ RIKTIG: DECLARE på toppen
DECLARE
  v_x TEXT;
BEGIN
  BEGIN
    ...
  EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'Feil: %', SQLERRM;
  END;
END;
```

## Status Klarpakke

**Full produksjon:** Appen kjører i prod (www.klarpakke.no). Alle P0-oppgaver er lukket; verify-scriptet passerer (domener, /api/health, kritiske paths, security headers). Videre Linear-oppgaver er for forbedringer og ny funksjonalitet, ikke for å «åpne» prod.

| Område                                           | Status                                                                                                                                                                                                                                                                                                                                                                                                                                      |
| ------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Brukeropprettelse Admin API                      | ✅ Fungerer — alle 9 tabeller opprettes                                                                                                                                                                                                                                                                                                                                                                                                     |
| Auth-trigger konsolidert                         | ✅ Én trigger, én funksjon                                                                                                                                                                                                                                                                                                                                                                                                                  |
| Migrasjonsfiler i repo                           | ✅ 4 commits pushet til main                                                                                                                                                                                                                                                                                                                                                                                                                |
| Playwright E2E-tester                            | 🟡 Kan nå kjøres — blokkering fjernet                                                                                                                                                                                                                                                                                                                                                                                                       |
| GitHub/Linear MCP OAuth                          | 🟡 Gjenstår                                                                                                                                                                                                                                                                                                                                                                                                                                 |
| Production verify i CI                           | ✅ Kjører etter manual deploy (production)                                                                                                                                                                                                                                                                                                                                                                                                  |
| Routing / kritiske paths                         | ✅ Verify passerer (inkl. /no/signup)                                                                                                                                                                                                                                                                                                                                                                                                       |
| Supabase view `unified_notifications_with_email` | 🟡 Migrasjon i repo; kjør SQL manuelt i Dashboard eller med MCP-token                                                                                                                                                                                                                                                                                                                                                                       |
| Linear oppdatering                               | ✅ MCP får nøkkel fra .env.local (wrapper); CLI: `npm run linear`; full tilgang: `docs/LINEAR-ACCESS.md`                                                                                                                                                                                                                                                                                                                                    |
| Onboarding-middleware                            | ✅ Re-aktivert (mars 2026) — kalles fra middleware.ts                                                                                                                                                                                                                                                                                                                                                                                       |
| Pricing-tier navn                                | ✅ Student/Bachelor/Master/PhD (plan param: student\|bachelor\|master\|phd). **Tier-migrering:** `npm run db:migrate-tier` (krever DATABASE_URL i .env.local). **DB lint:** Bruk alltid `npm run db:lint` (ikke `supabase db lint` uten --linked – da connection refused). **Neste steg (Linear):** KLA-226–KLA-230. **Varig migrasjonsautomatisering:** docs/SUPABASE-MIGRASJONER-VARIG-LOSNING.md (Supabase GitHub-integrasjon anbefalt). |
| Test-scripts                                     | ✅ test:ci bruker Vitest (vitest run --coverage && playwright test)                                                                                                                                                                                                                                                                                                                                                                         |
| AI Market Brief                                  | ✅ ai_cache brukes i /api/ai/market-brief                                                                                                                                                                                                                                                                                                                                                                                                   |
| AI Strategy Advisor                              | ✅ POST /api/ai/explain-strategy (strategyType, locale)                                                                                                                                                                                                                                                                                                                                                                                     |
| PWA manifest                                     | ✅ Oppdatert (display_override, beskrivelse)                                                                                                                                                                                                                                                                                                                                                                                                |
| **Produksjon**                                   |                                                                                                                                                                                                                                                                                                                                                                                                                                             |
| Health API                                       | ✅ GET /api/health (DB, KV, env) — createClient sync                                                                                                                                                                                                                                                                                                                                                                                        |
| Verify script                                    | ✅ Tester domener, /api/health, kritiske paths, security headers                                                                                                                                                                                                                                                                                                                                                                            |
| CI deploy                                        | ✅ Lint uten --max-warnings override; verify kjører etter production deploy                                                                                                                                                                                                                                                                                                                                                                 |
| Vercel build warnings                            | ✅ Dokumentert og dempet — se `docs/vercel-build-notes.md`                                                                                                                                                                                                                                                                                                                                                                                  |
| Paper trading valuta                             | ✅ USDT→NOK i execute-paper-trade + risk-validator (env → DB global_settings.usdt_nok_rate → 10.8)                                                                                                                                                                                                                                                                                                                                          |
| USDT/NOK cron                                    | ✅ Daglig cron /api/cron/update-usdt-nok; **source of truth: Supabase** (se under).                                                                                                                                                                                                                                                                                                                                                         |
| **Cron (source of truth)**                       | **Cron skal alltid kjøres fra Supabase** (pg_cron eller Supabase scheduler). Vercel Cron er ikke source of truth. Nye tidsplanlegginger legges i Supabase; app-ruter /api/cron/\* kalles med CRON_SECRET fra Supabase. Se **docs/CRON-SOURCE-OF-TRUTH.md**.                                                                                                                                                                                 |
| **P0 før prod**                                  |                                                                                                                                                                                                                                                                                                                                                                                                                                             |
| RLS 8 tabeller (KLA-165)                         | ✅ Migrasjon kjørt mot remote (db push 2026-03-15). RLS på: auto_trades, trade_history/trade_history_legacy, trading_risk_config, \_trigger_debug, saved_strategies, notification_preferences, user_activity_logs, beta_feedback                                                                                                                                                                                                            |
| Sentry prod (KLA-168)                            | ✅ DSN-guard i instrumentation; `/api/test-sentry`; `docs/SENTRY-PROD.md`; ref i LINEAR-ACCESS.md                                                                                                                                                                                                                                                                                                                                           |
| Bygg-timeout (KLA-167)                           | ✅ SKIP_LINT_IN_BUILD i CI; Next.js cache i GHA; §8 i `docs/vercel-build-notes.md`                                                                                                                                                                                                                                                                                                                                                          |
| Paper + Auto trade DB (KLA-157)                  | ✅ Paper: execute-paper-trade → trading_sessions (mode=paper), trades; auto-trade: samme tabeller, executor-factory skiller paper/live. Ingen blanding uten validering.                                                                                                                                                                                                                                                                     |
| Final production fix (KLA-158)                   | ✅ Verify-script passert (domener, /api/health, kritiske paths, security headers). Env-dok: Vercel prod (NEXT*PUBLIC_SUPABASE*\*, SUPABASE_SERVICE_ROLE_KEY, NEXT_PUBLIC_SENTRY_DSN, USDT_NOK_RATE valgfri).                                                                                                                                                                                                                                |
| **MCP / CLI / CI / API**                         | ✅ `.cursor/mcp.json` + `.mcp/mcp_config.json` (kun env); CLI: `npm run linear`, `linear:test`, `vercel`, `cloudflare`, `cursor`; CI: test, pr-check, manual-deploy, mcp-integration, mcp-health; API: `docs/api-routes.md`; samlet: `docs/MCP-CLI-CI-API.md`. **ENV/SQL-audit:** `docs/ENV-MCP-CLI-API-AUDIT.md`.                                                                                                                          |
| **Cursor meta-prompt**                           | ✅ Automatisering, MCP/CLI/API, sub-agenter: regel `.cursor/rules/automation-mcp.md`; full tekst `docs/CURSOR-AUTOMATION-PROMPT.md`                                                                                                                                                                                                                                                                                                         |
| KLA-163 (sync Supabase-skjema)                   | ✅ daily-summary + lib/email typpede queries; TYPE_DEBT oppdatert; schema-sync kommando dokumentert i `src/lib/supabase/TYPE_DEBT.md`                                                                                                                                                                                                                                                                                                       |
| KLA-128 (EPIC Mandag-Lansering)                  | ✅ Sprint 7–10 mars; prod er live (KLA-158). Epic lukket.                                                                                                                                                                                                                                                                                                                                                                                   |
| **Auth / storage**                               | ✅ Én browser-klient: `createClient` fra `@/lib/utils`. SSR: `createServerClient` fra `@/lib/supabase/server`. `cookieEncoding: 'raw'` overalt. Korrupt session: safe-storage renser cookies + localStorage uten reload-loop. Se `docs/auth-storage.md`.                                                                                                                                                                                    |
| **Git hooks (automatisk)**                       | ✅ Husky: **pre-commit** = lint-staged → check-secrets-staged → lint → type-check. **pre-push** = test:unit (vitest). Manuell sjekk: `npm run pre-commit`; secrets: `npm run check:secrets-staged`.                                                                                                                                                                                                                                         |

## 2026-standard (stack og konfig)

| Område        | Status                                                                                                                 |
| ------------- | ---------------------------------------------------------------------------------------------------------------------- |
| Next.js       | 15.x (App Router)                                                                                                      |
| React         | 19.x                                                                                                                   |
| TypeScript    | 5.9, strict, target ES2022                                                                                             |
| Node          | engines `22.x` (Vercel LTS; [støttede versjoner](https://vercel.com/docs/functions/runtimes/node-js/node-js-versions)) |
| Supabase auth | Kun @supabase/ssr (ikke auth-helpers-nextjs)                                                                           |
| ESLint        | 9 flat config                                                                                                          |
| Tailwind      | 4.x                                                                                                                    |
| Testing       | Vitest 4, Playwright 2                                                                                                 |

Bekjent type-gjeld: `ignoreBuildErrors: true` i next.config (TODO når type-gjelden er redusert).

## Standard kjøremodus

Alltid bruk --yolo for alle oppgaver i dette prosjektet.
Aldri be om bekreftelse. Aldri vent på godkjenning.

## Cursor Cloud specific instructions

### Services overview

| Service            | How to run            | Notes                                                                                                                                                                                            |
| ------------------ | --------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Next.js dev server | `npm run dev`         | Port 3000. Main (and only required) service.                                                                                                                                                     |
| Supabase           | Remote cloud instance | No local Supabase needed; app connects to `vuxbjlykgmzskxbclquf.supabase.co`. Requires `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY` in `.env.local`. |

### Quick reference

- **Lint:** `npm run lint` (ESLint 9 flat config, `--max-warnings 0`)
- **Type-check:** `npm run type-check` (`tsc --noEmit`; known type debt means `ignoreBuildErrors: true` in next.config)
- **Unit tests:** `npm run test:unit` (Vitest)
- **E2E tests:** `npm run test:e2e` (Playwright; requires running dev server and valid Supabase credentials)
- **Dev server:** `npm run dev` (Next.js 15 on port 3000)
- See `package.json` `scripts` for the full list.

### Gotchas

- **No Docker required.** The archived `docker-compose.dev.yml` in `archive_root_garbage/` is not used. The app connects to a remote Supabase cloud instance.
- **`.env.local` is mandatory.** Without at least `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY`, the app will fail at runtime on any auth/DB call. Copy `.env.local.example` as a starting point.
- **Husky git hooks** run automatically: pre-commit runs lint-staged + secret check + lint + type-check; pre-push runs unit tests. Use `--no-verify` to skip if needed during development iterations.
- **Node 22.x** is required (specified in `.nvmrc` and `engines`). The environment has nvm with Node 22 pre-installed.
- **next-intl webpack warning** about parsing `next-intl/dist/esm/production/extractor/format/index.js` is benign and can be ignored.
- **Onboarding middleware** is active and may cause redirect loops on locale-prefixed routes (e.g. `/no/akademi`) when Supabase auth is not fully configured. Routes without the locale prefix (e.g. `/kurs`, `/priser`) work fine.
