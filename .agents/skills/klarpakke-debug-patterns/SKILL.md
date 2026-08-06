---
name: klarpakke-debug-patterns
description: 'Gjenbrukbare debug-mønstre for Klarpakke. Systematisk feilsøking: rotårsak
  → repro → varig fiks → lagre som pattern.'
version: 1.0.0
author: Hermes Agent
license: MIT
platforms:
- macos
metadata:
  hermes:
    tags:
    - klarpakke
    - debugging
    - patterns
    - troubleshooting
whenToUse: Når bruker rapporterer feil eller ber om systematisk feilsøking.
---

# Klarpakke Debug Patterns

## 📚 Referanser (les når du trenger det)

| Fil | Les når... |
|---|---|
| `references/frontend-errors.md` | Du feilsøker React/frontend-feil |
| `references/backend-errors.md` | Du feilsøker API/backend-feil |
| `references/database-errors.md` | Du feilsøker database-feil |
| `references/misc.md` | Diverse andre debug-mønstre |

---

## 1. TypeError: `.toFixed()` on undefined

**Symptom:** `TypeError: Cannot read properties of undefined (reading 'toFixed')` i dashboard

**Rotårsak:** En komponent kaller `.toFixed()` på en verdi som er `undefined`/`null`. Dette skjer oftest når API-data ikke er lastet ennå (initial render) eller når et felt mangler.

**Finn stedet:**
```bash
grep -rn "\.toFixed(" src/features/dashboard/ src/features/portfolio/
```

**Fiks:** Bruk `?? 0` eller `?? ""` før `.toFixed()`:
```tsx
// FØR (kræsjer hvis undefined):
{activeSessions[0].totalPnl.toFixed(0)}

// EITER (guard):
{(activeSessions[0]?.totalPnl ?? 0).toFixed(0)}
```

**Prevensjon:** Søk etter alle `.toFixed()`-kall hver gang nye widgets legges til.

---

## 2. WidgetErrorBoundary som ikke rapporterer

**Symptom:** Dashboard viser "Dashboard-widgeten kunne ikke lastes" men ingen feil i Sentry.

**Rotårsak:** `WidgetErrorBoundary.componentDidCatch()` kalte bare `console.error()` — aldri `captureException()`.

**Fiks:**
```tsx
import { captureException } from "@/lib/sentry";

componentDidCatch(error: Error, errorInfo: ErrorInfo) {
  console.error("[WidgetErrorBoundary] Widget crashed:", error, errorInfo);
  captureException(error, { extra: { componentStack: errorInfo.componentStack ?? "" } });
}
```

**Prevensjon:** ALDRI bruk `console.error()` alene i error boundaries — alltid send til Sentry.

---

## 3. Sentry CSP blokkering

**Symptom:** Sentry-rapportering blir stille blokkert. Console viser:
```
Connecting to 'https://*.ingest.de.sentry.io/...' violates Content Security Policy
```

**Rotårsak:** CSP i `src/middleware/csp.ts` mangler Sentry DSN-host.

**Fiks:**
```tsx
// Legg til i connect-src i csp.ts:
"https://*.ingest.de.sentry.io",
```

**Prevensjon:** Ved deploy av ny DSN, sjekk alltid CSP. Eller bruk wildcard.

---

## 4. K3 krever temperature=1

**Symptom:** HTTP 400 "invalid temperature: only 1 is allowed for this model"

**Rotårsak:** K2.7 bruker `temperature: 0.6`, K3 krever `temperature: 1`. Begge fungerer med `1`.

**Fiks:**
```bash
hermes config set model.temperature 1
```

**Prevensjon:** Sjekk temperature-krav ved modelbytte.

---

## 5. opennextjs-cloudflare TS-byggfeil

**Symptom:** `npm run cf:build` feiler med TypeScript-feil i pre-eksisterende kode.

**Rotårsak:** `opennextjs-cloudflare build` kjører full type-check som feiler på eksisterende feil.

**Fiks:**
```bash
# 2-steg bygg:
SKIP_LINT_IN_BUILD=true npx next build
SKIP_LINT_IN_BUILD=true npx opennextjs-cloudflare build --skipNextBuild
npx wrangler deploy --env ""
```

**Prevensjon:** Bruk alltid 2-steg, aldri enkelt-kommando `npm run cf:build`.

---

## 6. Cloudflare Workers IP blokkert av Binance

**Symptom:** Binance API returnerer 403 fra Workers.

**Rotårsak:** Cloudflare Workers IP-range er blokkert.

**Fiks:** Ruting via Supabase Edge Function `binance-proxy` (publicApi action). Fallback til direkte API.

**Prevensjon:** Sjekk om proxy-secret er satt med `npx wrangler secret list | grep BINANCE_PROXY_SECRET`.

---

## 7. i18n split-filer fungerer ikke i Worker

**Symptom:** Dashboard viser rå nøkkelnavn som `profile.title`.

**Rotårsak:** next-intl i Cloudflare Worker kan kun laste én konsolidert JSON-fil per locale.

**Fiks:** Alle nøkler i `messages/no.json` / `messages/en.json`. Aldri split-filer.

---

## 8. null/undefined guards — checklist

Ved rendering av dynamiske data, bruk ALLtid:

| Pattern | Eksempel |
|---------|----------|
| Optional chaining | `obj?.prop?.subprop` |
| Nullish coalescing | `value ?? defaultValue` |
| Array guard | `arr?.[0]?.prop ?? default` |
| Ternery for optional | `val != null ? fn(val) : fallback` |
| Number guard | `(num ?? 0).toFixed(2)` |

---

## 13. i18n — Workflow for nye nøkler

**ALLTID når du legger til `t("key")` i en komponent:**

1. Legg til nøkkelen i `messages/no.json` SAMTIDIG som du skriver komponenten
2. Legg til nøkkelen i `messages/en.json` (samme struktur)
3. Kjør `npm run i18n:validate` (sjekker no↔en synk)
4. Kjør `npm run i18n:usage` (sjekker kode↔messages synk)
5. Kjør `npm run lint`
6. Deploy

**VALIDERINGSGAP (hvorfor vi fant feil):**
- `validate-i18n.js` sjekker bare no↔en (struktur)
- `validate-i18n-usage.js` sjekker kode↔no.json (innhold) — NY i pre-commit gate 1
- Begge må passere før deploy. Pre-commit blokkerer hvis noen mangler.

## 14. Pre-commit gates (oppdatert)

Pre-commit kjører 5 gates:

| Gate | Hva | Blokkerer? |
|------|-----|-----------|
| 1 | Type check + ESLint + i18n:validate + **i18n:usage** | ✅ Ja |
| 2 | Vitest (changed) | ✅ Ja |
| 3 | Cloudflare build | ✅ Ja |
| 4 | Mobile fast-check | ✅ Ja |
| 5 | E2E smoke | Valgfri (--smoke) |

Kjør manuelt: `node scripts/pre-push.mjs`

Før enhver commit, KJØR ALLTID:
```bash
npm run i18n:validate    # Sjekker at no.json og en.json matcher
npm run lint             # 0 errors
npm run test:unit        # bestått
```

**Ved nye i18n-nøkler:** Når du legger til `t("key")` i en komponent, MÅ du samtidig legge til nøkkelen i `messages/no.json` under riktig namespace. Split-filer finnes ikke lenger — det er kun konsolidert JSON.

**Sjekkliste for nye features:**
1. ✅ Legg til `t()`-kall i komponenten
2. ✅ Legg til nøkkelen i `messages/no.json`
3. ✅ Legg til nøkkelen i `messages/en.json`
4. ✅ Kjør `npm run i18n:validate`
5. ✅ Kjør `npm run lint`
6. ✅ Deploy

## 10. Sentry 400 Bad Request på /store/

**Symptom:** `POST https://*.ingest.de.sentry.io/api/*/store/ 400 (Bad Request)`

**Rotårsak:** Sentry `/store/`-endepunktet krever `sentry_key` som query-parameter i URL for nyere versjoner.

**Fiks:**
```typescript
const url = `${host}/api/${projectId}/store/?sentry_key=${publicKey}`;
```

**Sjekk om det fungerer:** Kall `testSentry()` i nettleserkonsollen på produksjon og sjekk at eventen dukker opp i Sentry dashboard.

## 11. toFixed på undefined — bredt søk

**Symptom:** `TypeError: Cannot read properties of undefined (reading 'toFixed')` i minifisert chunk

**Finn alle steder:**
```bash
grep -rn "\.toFixed(" src/features/ | grep -v "__tests__" | grep -v "??\|?."
```

**Fiks (2 alternativer):**
```tsx
// Alternativ 1 — inline guard:
{(value ?? 0).toFixed(2)}
{value != null ? value.toFixed(2) : "—"}

// Alternativ 2 — hjelpefunksjon:
function safeFixed(val: number | null | undefined, digits = 2, fallback = "—") {
  return val != null ? val.toFixed(digits) : fallback;
}
```

**Prevensjon:** Bruk alltid `?? 0` eller `!= null` sjekk før `.toFixed()` på data fra API.

```typescript
import { testSentry } from "@/lib/sentry";
testSentry();
```

Kall denne manuelt i devtools-konsollen på produksjon:
```js
fetch("/api/health/sentry")
```

Sjekk at eventen dukker opp i Sentry dashboard innen 1 minutt.

## N. DB-trigger med feil kolonnenavn blokkerer ALLE trade-inserts (2026-07-20)

**Symptom:** `executeTrade` returnerer `success: false, error: "Failed to record trade"` og Postgres-feil `42703: record "follow" has no field "max_trade_size"`. ALLE paper/live trades feiler — både via API og smart-trader-v3 cron.

**Rotårsak:** Trigger-funksjonen `trigger_copy_trade_fanout()` på `trades` refererte til `follow.max_trade_size`, men kolonnen i `copy_trading_follows` heter `max_trade_amount`. Sannsynlig kolonne-rename uten å oppdatere triggeren. Siden triggeren kjører AFTER INSERT på hver trade-rad, feilet hver eneste trade-insert.

**Diagnose:**
```sql
-- Finn funksjoner som refererer til kolonnen:
SELECT p.proname FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
WHERE n.nspname='public' AND pg_get_functiondef(p.oid) ILIKE '%max_trade_size%';
-- Sammenlign med faktiske kolonner:
SELECT column_name FROM information_schema.columns
WHERE table_name='copy_trading_follows';
```

**Fiks:** `CREATE OR REPLACE FUNCTION trigger_copy_trade_fanout()` med `max_trade_amount` (migrasjon `fix_copy_trade_fanout_max_trade_amount_column`).

**Skann-regel:** Ved "record X has no field Y" (42703) fra en trade-insert — sjekk ALLTID triggere på tabellen FØR frontend/API-kode. Trigger-feil rammer alle kodeveier samtidig. Bivirkning: smart-trader-v3-cron hadde vært stille brutt; da triggeren ble fikset, kjørte neste 15-min tick umiddelbart trades for alle aktive sessions.

## N+1. executeTrade lokalt: CONCURRENT_TRADE_BLOCKED uten Redis (2026-07-20)

**Symptom:** Kjøring av `executeTrade` fra tsx-script feiler med `CONCURRENT_TRADE_BLOCKED` selv for første trade.

**Rotårsak:** `acquireLock` → `getKvRedisAdapter()` (null utenfor Cloudflare) → `getRiskStateStore().redis`. I produksjons-modus (NODE_ENV unset) og død Upstash-instans → `FailClosedRedisClient`: `get()` returnerer null, `set()` kaster → lock "feiler" som busy.

**Fiks:** Kjør script med `NODE_ENV=development` → MockRedis (in-memory) brukes. Trygt for sekvensielle scripts.

## N+2. Browser-supabase er ALLTID anon — falsk «utlogget»/«ingen data» (2026-07-24)

**Symptom:** Innlogget bruker redirectes til /innlogging, eller ser «Ingen profil funnet»/tomme lister til tross for at data finnes.

**Rotårsak:** Auth-cookien er httpOnly → `createClient()` (browser) har ingen session → `supabase.auth.getUser()` = null og `.from(tabell)` kjører som **anon** → RLS gir 0 rader. Komponenter som bruker dette til auth-guard (f.eks. ProfileTab → `router.push('/innlogging')`) lager redirect-loops (innloggingssiden sender innlogget bruker til /dashboard). Komponenter som bruker det til data (f.eks. useProfile) viser falsk «ingen data».

**Fiks:** Auth + brukerdata KUN via /api-ruter (`createServerClient` + `getUser()` + eksplisitt `user_id`-filter). ALDRI `router.push` basert på browser-`getUser()`. 49 filer med browser-klient i backlog — samme bugklasse.

**Diagnose:** Playwright `response.request().redirectedFrom()`-kjeden viser hele loopen (307 /login → /dashboard).

## N+3. Fantom-kolonner + RLS upsert-felle (2026-07-24)

**Symptom A:** PostgREST 500 «column X does not exist» på en select som «alltid har virket» — kolonnen finnes i `database.types.ts` men IKKE i DB.

**Fiks A:** `database.types.ts` ≠ ground truth. Verifiser ALLTID mot `information_schema.columns` (Mgmt API). Funnet: `user_profiles.risk_preference` fantes ikke — ekte kolonner var `default_risk_level` (enum) og `risk_tolerance` (text, CHECK low/medium/high). UI-verdier (safe/normal/advanced) mappes i API-ruten begge veier.

**Symptom B:** `upsert()` på eksisterende rad feiler med «new row violates row-level security policy» selv om UPDATE-policyen passer.

**Rotårsak B:** Postgres evaluerer INSERT-policyens WITH CHECK på den nye raden FØR ON CONFLICT-løsning. Policyen `user_id = auth.uid()` krever at `user_id` er med i payload — selv ved ren update. Uten `user_id` i upsert-payload: NULL ≠ uid → RLS-violation.

**Fiks B:** Ta ALLTID med alle kolonner RLS-policyer sjekker (her: `user_id: user.id`) i upsert-payload.

## N+4. Total trading-stopp: pg_cron 401 — CRON_SECRET borte fra Worker (2026-07-31)

**Symptom:** ALL trading stopper brått (siste trades timer gamle), men pg_cron-jobbene kjører "succeeded" hvert minutt. `cron_job_runs` (app-nivå-logg) har ingen nye rader. Ingen feil i Sentry.

**Rotårsak:** `CRON_SECRET` manglet i Cloudflare Worker-secrets (aldri satt / forsvunnet ved deploy — `scripts/deploy.sh` hadde ingen secret-håndtering). `validateCronSecret` (`src/lib/auth/cron.ts`) returnerer false når `process.env.CRON_SECRET` er tom → 401 på ALLE `klarpakke_trigger_cron()`-kall. pg_cron rapporterer likevel "succeeded" fordi `net.http_post` er asynkront fire-and-forget.

**Diagnosekjede (3 spørringer, 2 min):**
```sql
-- 1. App-logg tom, men pg_cron "kjører"? → sjekk HTTP-svarene:
SELECT status_code, count(*), max(created) FROM net._http_response
WHERE created > now() - interval '1 hour' GROUP BY 1;
-- 401 overalt → secret-mismatch. 200 → appen lever, se videre i kode.
-- 2. Sammenlign vault vs .env.local (sha, ikke klartekst):
SELECT left(encode(digest(decrypted_secret,'sha256'),'hex'),16)
FROM vault.decrypted_secrets WHERE name='CRON_SECRET';
-- 3. Worker: npx wrangler secret list | grep CRON_SECRET (mangler = funnet)
```

**Fiks:** `grep '^CRON_SECRET=' .env.local | cut -d= -f2- | tr -d '\n' | npx wrangler secret put CRON_SECRET` — verifiser med curl Bearer → 200 (kan trenge ~20 s propagasjon). Neste minutt-tick skal logge rad i `cron_job_runs`.

**Prevensjon (varig):** deploy.sh MÅ verifisere `wrangler secret list` inneholder CRON_SECRET (sett fra .env.local hvis ikke) + post-deploy curl av /api/cron/tick med Bearer — exit 1 ved 401. Dette var ANDRE gang secret-drift stoppet trading (første: vault-mismatch 2026-07-30).

## N+5. Drawdown-guard på kontanter ≠ equity — feil-deaktivering (2026-07-31)

**Symptom:** "GUARD: Drawdown > 20 % — auto-deaktivert" på friske sesjoner; 23 sesjoner deaktivert samtidig, men reell P&L var ~−1 %.

**Rotårsak:** Guard sammenlignet `current_capital_nok` (KUN kontanter) mot startkapital. Når boten kjøper BTC for 20 % av kapitalen, faller kontantbeholdningen under 80 % → falsk drawdown. Verdien av åpne posisjoner ble ignorert. I tillegg var guarden tannløs: `status` forble 'active' → tick fortsatte å kjøpe etter "deaktivering".

**Fiks:** Migrasjon `20260731193000_guard_equity_fix_and_enforcement.sql`: equity = kontanter + Σ(netto kvantum × `coin_prices.price` NOK) fra trade-ledger; guard setter `status='stopped'`; feil-deaktiverte sesjoner reaktiveres idempotent (kun eksakt feilmelding-match + ekte equity-sjekk). Sesjoner med manglende prisdata hoppes over (aldri feil-deaktiver).

**Regel:** Enhver guard på kapital MÅ regne på equity (cash + posisjonsverdi), og håndheving MÅ endre status — aldri bare sette en tekstmelding.
