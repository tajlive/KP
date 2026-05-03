# 🤖 KIMI — Pre-loaded Project Context: Klarpakke

> **Bruk:** Lim inn ved session-start, eller referer med `@.kimi/PROJECT_CONTEXT.md`
> **Oppdatert:** 2026-05-01 | **Kontekst-bruk:** ~3k tokens (av 262k tilgjengelig)

---

## 📋 Prosjektoversikt

| | |
|---|---|
| **Navn** | Klarpakke — AI Trading Platform |
| **Stack** | Next.js 15, React 19, TypeScript 5.9 (strict), Supabase, Vercel |
| **Node** | 24.x |
| **URL** | www.klarpakke.no |
| **i18n** | next-intl, no + en (no-base fallback) |
| **Testing** | Vitest (679 tester), Playwright, Allure |

---

## 🔴 Breaking Rules — Aldri bryt

### OAuth Redirect URIs
- **ALLTID** bruk `getCallbackUrl()` fra `@/lib/auth/config` for `redirectTo`
- **FORBUDT** å hardkode `/auth/callback` — bruk `/{locale}/callback` (f.eks. `/no/callback`)
- **FORBUDT** å sende passord-reset til callback — bruk `/no/update-password`
- **ALLTID** kjør `npm run oauth:check` før push av auth-endringer

### PL/pgSQL
- **DECLARE** på toppnivå, aldri nested
- **EXCEPTION WHEN OTHERS** skal ALLTID ha `RAISE WARNING`

### Migrasjoner (Supabase)
- **MÅ** bruke 14-sifret timestamp: `YYYYMMDDHHMMSS_beskrivelse.sql`
- **ALLTID** idempotent: `IF EXISTS` / `OR REPLACE` / `DROP FUNCTION IF EXISTS`
- **FORBUDT:** `ALTER TABLE DROP COLUMN`, `TRUNCATE TABLE`, `DROP TABLE navn;`

---

## 🏗️ Arkitektur — Kritiske Beslutninger

### Auth System
- `@supabase/ssr` (IKKE auth-helpers-nextjs)
- Singleton Supabase-client — aldri instansier ny
- Refresh-token race fikset 2026-04-20 (cross-process file lock)
- RLS policies på ALLE tabeller

### Trading Engine
- **Unified schema** — samme tabellstruktur for paper/live/copy
- **FIFO PnL** — beregnet i database (ikke frontend)
- **Max drawdown**, **Kelly position sizing**, **trailing stop**
- **0.1% fee** i alle moduser
- Paper trading: virtual $10k, full parity med live

### Database (Supabase)
- Postgres 15, pg_cron (14 jobs), pg_net 0.19.5, Vault
- **pg_cron** er primary for cron (IKKE Vercel Crons)
- Cron-konfig i Vault: `VERCEL_APP_URL` + `CRON_SECRET`
- SSL fix: `rejectUnauthorized: false`
- REST: `/rpc/exec_sql` (IKKE `execute_sql`)
- **FORBUDT:** `ALTER DATABASE postgres` i Supabase (permission denied)

### Hosting (Vercel)
- Region: fra1
- Static export (ikke serverless for alt)
- GitHub Actions CI/CD

### CMS (Sanity)
- projectId: `63qn23si`
- Embedded studio på `/studio`
- **basePath** = `/studio`, **productionUrl** = `undefined`
- Webhook cache invalidation via `revalidateTag`

---

## 🛠️ Hurtigkommandoer

```bash
# Utvikling
npm run dev

# Verifisering
npm run verify          # miljø-sjekk
npm run oauth:check     # auth-konfig
npm run lint            # ESLint
npm run type-check      # TypeScript
npm run test:unit       # Vitest

# Database
npm run db:validate-migrations    # valider migrasjoner
npm run db:push                   # push til linked

# Sanity
npm run sanity:verify
npm run sanity:guard

# Cron
npm run cron:verify
npm run cron:watch

# Verifisering etter endringer
node scripts/verify/verify-claims.mjs
node scripts/verify/check-stale-types.mjs
node scripts/verify/run-all.mjs
npm run swarm:review

# Deploy
npm run deploy:prod
```

---

## 🔧 MCP / KIMI — Smart Verktøy

| Kommando | Bruk |
|---|---|
| `kimi-smart-start` | Generer kontekst-brief ved session-start |
| `kimi-suggest-agent` | Foreslå riktig agent basert på git-diff |
| `kimi-mcp minimal` | 7 servere (daglig koding) |
| `kimi-mcp medium` | 10 servere (feature branch) |
| `kimi-mcp full` | 18 servere (production/hotfix) |
| `kimi-mcp auto` | Auto-velg basert på git branch |

### Agenter (YAML)
- `kimi architect` → Lead architect (full kontekst)
- `kimi auth` → Auth-ekspert
- `kimi sanity` → CMS-ekspert
- `kimi mempalace` → Memory-arkitekt
- `kimi verify` → Post-change verification
- `kimi mobile` → Mobil/PWA-sjekk

---

## ⚠️ Kjente Feil-mønstre

| Problem | Løsning |
|---|---|
| pg SSL self-signed cert | `ssl: { rejectUnauthorized: false }` |
| REST exec_sql 404 | Funksjonen heter `exec_sql`, ikke `execute_sql` |
| ALTER DATABASE postgres | Permission denied — bruk Vault i stedet |
| Vercel Crons følger ikke redirects | Pek direkte til `/api/v1/cron/*` |
| ChromaDB segfault på M1 | **FJERNET** — bruk MemPalace v3.1.1 |
| MemPalace M1 timeout | **LØST** — zero-dep in-memory FTS |
| .next/types cache stale | `rm -rf .next` før `tsc --noEmit` |

---

## 📊 Kunnskapsgraf (KG) — Kritiske Entiteter

| Entity | Facts | Domene |
|---|---|---|
| `auth-system` | 7 | OAuth, session, refresh-token, RLS |
| `trading-engine` | 15 | Strategier, risk, PnL, unified schema |
| `supabase-db` | 7 | Postgres 15, pg_cron, pg_net, Vault |
| `cron-system` | 6 | 14 jobs, pg_cron primary |
| `nextjs-framework` | 6 | v15, React 19, TS 5.9 strict |
| `sanity-cms` | 6 | projectId 63qn23si, /studio |
| `deploy-pipeline` | 3 | Lint→typecheck→test→build |
| `mempalace` | 5 | v3.1.1, in-memory FTS, 20 entities |

**Totalt:** 20 entities, 98+ facts

---

## 🔄 Arbeidsflyt (ALLTID)

### FØR kodeendring:
1. `git status` — clean main
2. `npm run verify` — verifiser miljø
3. Les relevante filer — forstå kontekst

### UNDER kodeendring:
1. Gjør **minimal** endring
2. Test lokalt — `npm run test:unit`
3. Verifiser — `npm run lint && npm run type-check`

### ETTER kodeendring:
1. `git add -A`
2. `git commit -m "type: beskrivelse"`
3. `git push origin main`
4. Vent på Vercel deployment (~2-3 min)
5. Verifiser i produksjon

---

*Dette dokumentet er designet for å pre-loades i KIMIs 262k kontekst-vindu ved session-start. Oppdater ved større arkitektur-endringer.*
