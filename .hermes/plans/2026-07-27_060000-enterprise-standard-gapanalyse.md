# 2026 Enterprise Standard — Gapanalyse og Optimaliseringsplan

> **For Hermes:** Utfør steg for steg. Prioritet 1 = nå, 2 = denne uken, 3 = neste sprint.

**Mål:** Løfte Klarpakke til 2026 enterprise-standard på tvers av sikkerhet, ytelse, observability og DevOps.

**Arkitektur:** Next.js 16 + Cloudflare Workers + Supabase + 6 MCP-servere. Prosjektet er allerede godt over gjennomsnittet (CSP, HSTS, React Compiler, 1449 tester, 8-stegs pre-commit). Denne planen adresserer de gjenværende gapene.

---

## 🟢 Allerede enterprise-klasse (bekreftet)

| Område | Status |
|---|---|
| Security headers (CSP, HSTS, COOP, COEP, CORP) | ✅ Ikke-basert CSP, HSTS 2 år + preload |
| TypeScript strict mode | ✅ `strict: true` |
| React Compiler | ✅ Autmatisk memo |
| Testing | ✅ 1449 pass, 6 skip, 0 fail |
| i18n | ✅ no/en locale prefixes |
| Image optimization | ✅ AVIF/WebP, Cloudflare Images loader |
| Bundle optimization | ✅ splitChunks, optimizePackageImports, filesystem cache |
| Pre-commit pipeline | ✅ 8 steg med AST-verifisering |
| Rate limiting | ✅ Middleware-basert |
| Error tracking | ✅ GlitchTip/Sentry via `@sentry/nextjs` |

---

## 🔴 Prioritet 1 — Kritiske gap

### 1.1 Fjern `ignoreBuildErrors: true`

**Nå:** `next.config.mjs:54` — TypeScript-feil ignoreres under `next build`.

**Risiko:** Runtime-feil som burde vært fanget i bygget slippes gjennom til produksjon.

**Mål:** `ignoreBuildErrors: false`

```typescript
typescript: {
  ignoreBuildErrors: false,  // Endret fra true
}
```

**Steg:**
1. Kjør `npx tsc --noEmit` — bekreft 0 feil (allerede verifisert ✅)
2. Endre `ignoreBuildErrors: true` → `false` i `next.config.mjs:54`
3. Kjør `npm run build` for å verifisere

**Fil:** `next.config.mjs:54`

### 1.2 TypeScript enterprise-strenge modus

**Nå:** `noUnusedLocals: false`, `noUnusedParameters: false`, `noImplicitReturns: false`

**Mål:** Full strictness for å fange død kode og manglende returns.

```json
"noUnusedLocals": true,
"noUnusedParameters": true,
"noImplicitReturns": true,
```

**Steg:**
1. Aktiver `noUnusedLocals: true` → fiks ubrukte variabler → commit
2. Aktiver `noUnusedParameters: true` → fiks ubrukte parametere → commit
3. Aktiver `noImplicitReturns: true` → fiks manglende returns → commit

**Fil:** `tsconfig.json:32-34`

### 1.3 CI/CD — GitHub Actions-rensing + minimal pipeline

**Nå:** 13 aktive workflows (mingen kjører pga budsjett), 20 disabled workflows (= 33 totalt). Dependabot satt til `open-pull-requests-limit: 0`.

**Mål:** Rens ned til 5 essensielle workflows. Aktiver Dependabot med `open-pull-requests-limit: 5`.

**Behold:**
- `pre-merge-gates.yml` — lint + tsc + test
- `deploy-production.yml` — manuell deploy-trigger
- `e2e-lighthouse-qa.yml` — E2E + Lighthouse
- `health-monitor.yml` — helsesjekk
- `deploy-staging.yml` — staging-miljø

**Slett/arkiver:** Alle 20 `workflows-disabled/*` + resterende aktive workflows.

**Fil:** `.github/workflows/*`, `.github/dependabot.yml`

---

## 🟡 Prioritet 2 — Observability og DevOps

### 2.1 Strukturert logging

**Nå:** `console.log/error/warn` spredt i kodebasen.

**Mål:** JSON-strukturert logging med korrelasjons-IDer.

```typescript
// src/lib/logger.ts — utvid eksisterende
export function log(level: 'info'|'warn'|'error', msg: string, ctx?: Record<string, unknown>) {
  const entry = {
    ts: new Date().toISOString(),
    level,
    msg,
    correlationId: getCorrelationId(), // fra request header
    ...ctx,
  };
  console[level](JSON.stringify(entry));
}
```

**Steg:**
1. Legg til `correlationId` i middleware (`src/middleware.ts`)
2. Oppdater `src/lib/logger.ts` med JSON-format
3. Bytt ut `console.log` → `logger.info()` i kritiske paths (API routes)

**Fil:** `src/lib/logger.ts`, `src/middleware.ts`

### 2.2 Health-check dashboard (read-only)

**Nå:** Cron-basert helsesjekk + `src/app/api/cron/health-check/route.ts`

**Mål:** `/admin/health` — read-only dashboard som viser:
- Worker-status (Cloudflare MCP → `worker_get`)
- DB-status (Supabase MCP → `execute_sql`)
- Siste deploy-tid
- Siste 10 trades
- Error rate (siste 24t)

**Steg:**
1. Lag `src/app/api/admin/health/route.ts` — aggregerer data
2. Lag `src/app/[locale]/admin/health/page.tsx` — read-only dashboard
3. Beskytt med admin-auth

**Fil:** `src/app/api/admin/health/route.ts`, `src/app/[locale]/admin/health/page.tsx`

### 2.3 Automatisk backup-strategi

**Nå:** Ingen automatisk DB-backup.

**Mål:** Daglig pg_dump via Supabase MCP + cron.

```sql
-- Backup-cron (kjør daglig 03:00)
SELECT cron.schedule('backup-daily', '0 3 * * *', 
  $$SELECT pg_cron.backup_to_s3()$$  -- eller tilsvarende
);
```

**Steg:**
1. Aktiver pg_cron backup (hvis tilgjengelig på Supabase-plan)
2. Alternativt: cron-jobb som eksporterer via `mcp__supabase__execute_sql`
3. Lagre backups i Cloudflare R2

**Verktøy:** `mcp__supabase__execute_sql`, `mcp__cloudflare__r2_put` (når Cloudflare MCP er aktivert)

---

## 🔵 Prioritet 3 — Kvalitet og dokumentasjon

### 3.1 API-versjonering

**Nå:** API-ruter uten versjonering — `/api/trades`, `/api/cron/tick` osv.

**Mål:** `/api/v1/*` prefix på alle ruter.

**Steg:**
1. Flytt alle API-ruter til `src/app/api/v1/`
2. Legg til redirects fra `/api/*` → `/api/v1/*` (midlertidig)
3. Legg til `Deprecation` header på legacy endpoints

### 3.2 OpenAPI/Swagger-dokumentasjon

**Mål:** `src/app/api/v1/openapi.json` — autogenerert API-dokumentasjon.

**Steg:**
1. Installer `next-swagger-doc` eller `@asteasolutions/zod-to-openapi`
2. Generer OpenAPI 3.1 spec fra Zod-schemaer
3. Eksponer på `/api/v1/openapi.json`

### 3.3 Load-testing

**Mål:** k6-script som tester kritiske paths under last.

```javascript
// scripts/load-test.js
import http from 'k6/http';
export default function() {
  http.get('https://www.klarpakke.no/no');
  http.get('https://www.klarpakke.no/no/dashboard');
}
```

### 3.4 PWA-deploy

**Nå:** Capacitor klar, App Store avventer.

**Mål:** Send inn til App Store review.

**Steg:**
1. Verifiser PWA fungerer offline
2. Bygg iOS-app via Capacitor
3. Send til App Store Connect

---

## Implementasjonsrekkefølge

```
1.1 ignoreBuildErrors → false (5 min)
1.2 TypeScript enterprise-strict (15 min per flagg → 45 min)
1.3 Rens GitHub workflows (15 min)
2.1 Strukturert logging (30 min)
2.2 Health dashboard (60 min)
2.3 Backup-strategi (30 min)
3.1 API-versjonering (60 min)
3.2 OpenAPI docs (30 min)
3.3 Load testing (30 min)
3.4 PWA deploy (60 min)
```

**Totalt: ~6 timer**

---

## Forventet effekt

| Metrikk | Nå | Etter |
|---|---|---|
| TypeScript-feil ignorert i bygg | `ignoreBuildErrors: true` | `false` (0 feil) |
| TypeScript strict-flagg | 3/6 (strict + fallthrough + casing) | 6/6 (alle) |
| GitHub workflows | 33 (13 aktive + 20 disabled) | 5 (essensielle) |
| Dependabot PR-limit | 0 (avslått) | 5 (aktivert) |
| API-versjonering | Ingen | `/api/v1/*` |
| API-dokumentasjon | Ingen | OpenAPI 3.1 |
| Strukturert logging | `console.log` tekst | JSON med correlationId |
| Health dashboard | Cron-basert tekst | Read-only web-dashboard |
| Automatisk backup | Nei | Daglig pg_dump → R2 |
| Load testing | Nei | k6 script |
