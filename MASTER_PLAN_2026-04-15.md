# Klarpakke Master Plan — 15. april 2026

> **Agent:** Claude OPUS-syntese etter full codebase audit, MCP-databaseanalyse, MemPalace-kontekst og multi-agent utforskning.  
> **Status:** GO (med forbehold om P0-blokkere).  
> **Tidsramme:** 2–3 arbeidsdager for P0+P1.

---

## 1. Hva er levert i dag (15. april)

| # | Leveranse | Fil(er) / Verktøy | Status |
|---|---|---|---|
| 1 | **OAuth redirect fix** | `next.config.mjs`, Google Cloud Console, Supabase Auth | ✅ Live (302 verified) |
| 2 | **Auth agent** | `.kimi/auth-agent.yaml`, `npm run oauth:check` | ✅ Dokumentert |
| 3 | **Auto-trading DB bug** | `src/lib/supabase/auto-trading.ts` | ✅ risk_profile mapping fixed |
| 4 | **User data seed** | Supabase SQL | ✅ auto_trade_settings + wallets + demo-trade for tomarnejensen@gmail.com |
| 5 | **Sanity migrering** | `scripts/migrate-to-sanity.ts` | ✅ landingContent, strategies, tradeExplanations, FAQs migrated |
| 6 | **SanityHeroSection live** | `src/app/[locale]/page.tsx` | ✅ Byttet fra hardkodet HeroSection |
| 7 | **Server-side design tokens** | `src/app/[locale]/layout.tsx`, `src/lib/sanity/tokens.ts` | ✅ FOUC eliminert, client provider fjernet |
| 8 | **Sanity webhook + ISR** | `/api/webhooks/sanity`, `/api/draft`, `/api/disable-draft` | ✅ Implementert, krever dashboard-config |
| 9 | **Portfolio fallback** | `src/app/[locale]/(user)/dashboard/portfolio/page.tsx` | ✅ Spør både `wallets` og `portfolios` |
| 10 | **Studio auth** | `src/app/studio/[[...tool]]/page.tsx` | ✅ Krever nå Supabase-login |
| 11 | **Bilingual error/404** | `error.tsx`, `not-found.tsx` (root + locale) | ✅ Fikset |
| 12 | **~20 hardkodede UI-tekster** | Diverse komponenter | ✅ Fikset med `useLocale()` / `usePathname()` |

---

## 2. Kritiske funn fra audit

### 2.1 Auto-trading pipelinen er 100 % blokkert

**Rotårsaker (verifisert i kode + DB + vercel.json):**

1. **`vercel.json` mangler 5+ cron-schedules** — kun `keepalive` og `update-usdt-nok` er planlagt. `ai-engine`, `auto-trade`, `tick`, `health-check`, `signal-health-selfcheck`, `daily-summary` kjører aldri automatisk på Vercel.
2. **`signal-engine` Edge Function skriver IKKE til `ai_decision_log`** — den skriver til `trading_signals` og `trades`. `ai_decision_log` forblir tom.
3. **Kolonne-bug: `.gte("confidence", ...)`** — `ai_decision_log` har ingen `confidence`-kolonne. Korrekt: `sentiment_score`. Gjelder både `src/lib/supabase/auto-trading.ts:244` og `supabase/functions/auto-trade/index.ts:193`.
4. **Manglende env-variabler:** `CRON_SECRET` og `CRON_API_KEY` finnes ikke i `.env.local` eller Vercel. Resultat: selv manuell cron-trigger returnerer 401/500.
5. **Tabell-split:** Next.js koden leser `auto_trade_settings`, mens Edge Function leser `auto_trading_configs`. Bruker som skrur på auto-trading i UI blir usynlig for Edge Function.
6. **Schema mismatch på `ai_decision_log`:** Ingen migration i repo matcher dagens `database.types.ts`. Tabellen ser ut til å være manuelt endret i produksjon.
7. **`user_id` er NOT NULL, men settes betinget** i `confluent-signal-engine.ts:299` → insert kræsjer.

**DB pg_cron-status (bekreftet live):**
```
signal-engine-5min           */5 * * * *
signal-fallback-seed-5min    */5 * * * *
signal-health-selfcheck-10min */10 * * * *
taj-trade-engine-15min       */15 * * * *
trading-engine-tick          * * * * *
```
> Konklusjon: Signal-generering skjer, men **not via `ai_decision_log`**. Next.js-ai-motoren er helt død.

### 2.2 i18n er systematisk ødelagt for th/zh

- **~660** manuelle `locale === "no"` / `isEn` ternaries i koden. Disse knekker thai og kinesisk fullstendig.
- **~130** rene hardkodede norske strenger uten locale-håndtering i det hele tatt.
- **~15** rene hardkodede engelske strenger på norske sider.
- **Versting-filer:** `ClientInteressetest.tsx` (47), `BinanceGuideContent.tsx` (34), `SpeedOnboarding.tsx` (28), `FundingArbitrageDashboard.tsx` (27), `kurs/[moduleSlug]/page.tsx` (26), `BotWizard.tsx` (25).

### 2.3 Sanity er satt opp, men nesten ubrukt

| Schema | Brukes? | Hvor |
|---|---|---|
| `landingContent` | ✅ Ja | `SanityHeroSection.tsx` |
| `designTokens` | ✅ Ja | `layout.tsx` (server-side CSS) |
| `faq` | ❌ Nei | Hardkodet `FAQSection.tsx` |
| `testimonial` | ❌ Nei | Hardkodet `Testimonials.tsx` |
| `strategy` | ❌ Nei | Dashboard henter fra Supabase |
| `page` | ❌ Nei | Ingen `[[...slug]]` catch-all route |
| `tradeExplanation` | ❌ Nei | Ikke koblet til UI |

---

## 3. Faseplan

### FASE 0 — Miljøvariabler (15 min)
**Blokkering for P0.** Må gjøres FØRST.

| Variabel | Hvor | Verdi |
|---|---|---|
| `CRON_SECRET` | Vercel + `.env.local` | Sterk tilfeldig streng |
| `CRON_API_KEY` | Vercel + `.env.local` | Samme eller separat |
| `SANITY_WEBHOOK_SECRET` | Vercel + `.env.local` | Sterk tilfeldig streng |
| `SANITY_PREVIEW_SECRET` | Vercel + `.env.local` | Sterk tilfeldig streng |
| `SANITY_API_READ_TOKEN` | Vercel | Read-token fra Sanity Manage |

---

### FASE 1 — Auto-trading pipeline (P0) ~3–4 timer
**Mål:** Få `ai_decision_log` til å motta nye signaler og la cron eksekvere trades.

1. **Fiks `vercel.json`**
   - Legg til:
     - `/api/cron/ai-engine` → `schedule: "0 * * * *"`
     - `/api/cron/auto-trade` → `schedule: "*/5 * * * *"`
     - `/api/cron/tick` → `schedule: "*/5 * * * *"`
     - `/api/cron/health-check` → `schedule: "*/15 * * * *"`
     - `/api/cron/signal-health-selfcheck` → `schedule: "*/10 * * * *"`
     - `/api/cron/daily-summary` → `schedule: "0 6 * * *"`

2. **Fiks kolonne-buggen**
   - `src/lib/supabase/auto-trading.ts:244`: `.gte("confidence", ...)` → `.gte("sentiment_score", ...)`
   - `supabase/functions/auto-trade/index.ts:193`: samme fix

3. **Unified config table**
   - Anbefaling: **Endre Edge Function til å lese `auto_trade_settings`** (ikke `auto_trading_configs`).
   - Eller opprett en DB-trigger som speiler radene mellom tabellene.

4. **Sikre `user_id` på inserts**
   - `src/lib/trading/confluent-signal-engine.ts:299`: alltid send `user_id`.
   - `src/app/api/cron/ai-engine/route.ts`: assign system-user eller hent fra session.

5. **Schema audit / migration for `ai_decision_log`**
   - Sjekk produksjonsskjemaet mot `src/types/database.types.ts`.
   - Lag en idempotent migration hvis det mangler kolonner (`symbol`, `decision_type`, `sentiment_score`, etc.).
   - **Alternativ:** Hvis `trading_signals` er ment å være canonical source, refactor app-koden til å lese derfra i stedet for `ai_decision_log`.

6. **Manuell test**
   - `curl -H "Authorization: Bearer $CRON_SECRET" https://klarpakke.no/api/cron/ai-engine`
   - Verifiser ny rad i `ai_decision_log`.
   - `curl -H "Authorization: Bearer $CRON_SECRET" https://klarpakke.no/api/cron/tick`
   - Verifiser at trades eksekveres for aktive sessions.

---

### FASE 2 — i18n hurtigfiks (P1) ~2–3 timer
**Mål:** Fjerne de verste språkblandingene i høytrafikkerte flyter.

1. **Onboarding-flyt**
   - `SpeedOnboarding.tsx` (28 ternaries)
   - `OnboardingStep1.tsx`, `OnboardingStep2.tsx`, `OnboardingStep3.tsx`
   - `InteractiveOnboardingWizard.tsx` (47 instanser)
   - **Fix:** Lag `messages/{locale}/onboarding.json` keys og erstatt ternaries med `t()`.

2. **Auth-sider**
   - `login/page.tsx`, `register/page.tsx`, `reset-password/page.tsx`, `update-password/page.tsx`
   - Mange hardkodede norske/engelske strenger.

3. **Dashboard-kjerne**
   - `PortfolioSection.tsx`, `TradingModeToggle.tsx`, `PaperTradeButton.tsx`, `RiskSlider.tsx`
   - `ClientVarsler.tsx` (varsler-side)

4. **Landing P0-seksjoner**
   - `FeaturesBentoGrid.tsx` (hardkodet norsk)
   - `SocialProofSection.tsx`
   - `PricingSection.tsx`

> **Regel:** Ingen nye `locale === "no"` ternaries. Bruk `t()` eller `getTranslations()`.

---

### FASE 3 — Sanity full aktivering (P1) ~2–3 timer
**Mål:** Marketing kan endre innhold uten deploy.

1. **FAQ**
   - Lag `SanityFAQSection.tsx` som wrapper `FAQSection.tsx` med `allFaqsQuery` + `safeFetch`.
   - Bytt i `page.tsx`. Fallback til hardkodet array hvis Sanity er tom.

2. **Testimonials**
   - Lag `SanityTestimonials.tsx` med `activeTestimonialsQuery`.
   - Bytt i `page.tsx`. Bruk `urlFor()` for avatar-bilder.

3. **Dynamic CMS pages**
   - Lag `src/app/[locale]/[...slug]/page.tsx`.
   - Fetch `dynamicPageQuery` med slug.
   - Render `@portabletext/react` for `content[]`.
   - Fallback til 404 hvis ingen dokument.

4. **LandingContent-utvidelse**
   - Utvid `landingContent`-skjemaet med:
     - `features[]` (allereie i skjema, men ubrukt)
     - `kltTeaser`
     - `socialProof`
     - `pricingHeader`
   - Koble disse til `KLTTeaser.tsx`, `SocialProofSection.tsx`, `PricingSection.tsx`.

---

### FASE 4 — Teknisk gjeld og robustgjøring (P2) ~1–2 timer

1. **i18n-linting**
   - Vurder ESLint-regel som forbyr hardkodede ASCII-norske ord i `.tsx`/`.ts`.
   - Eller minst: code-review sjekkliste.

2. **Død kode-rydding**
   - `HeroSection.tsx` (gammel hardkodet hero) → slett hvis ikke referert.
   - `src/lib/design/useSanityTokens.ts` → allerede slettet i dag.
   - Sanity `strategy` / `tradeExplanation` schemas → **avgjør:** bruk eller fjern.

3. **Portfolio data-modell**
   - Dagens løsning (wallets + portfolios fallback) er OK som plaster.
   - Langsiktig: én kilde til sannhet. Enten:
     - Sync `portfolios` → `wallets` via DB-trigger, eller
     - Fjern `portfolios` og la appen alltid operere på `wallets`.

4. **Observability**
   - `bot_health` tabellen har pg_cron-heartbeat.
   - Vurder Sentry-alerts på cron-feil eller tom `ai_decision_log` > 1 time.

---

## 4. Avhengighetsgraf

```
FASE 0 (env vars)
    │
    ▼
FASE 1 (auto-trading cron + bugs)
    │
    ├── avhenger av: CRON_SECRET, CRON_API_KEY
    └── output: fungerende ai_decision_log + trade execution
    │
    ▼
FASE 2 (i18n onboarding/auth/dashboard)
    │
    └── avhenger ikke av FASE 1, kan kjøres parallelt
    │
    ▼
FASE 3 (Sanity FAQ/testimonials/dynamic pages)
    │
    ├── avhenger av: SANITY_PREVIEW_SECRET, SANITY_WEBHOOK_SECRET
    └── output: redaktørstyrt landingsside
```

---

## 5. Risikoer og contingency

| Risiko | Sannsynlighet | Mitigering |
|---|---|---|
| `ai_decision_log` schema i prod er alt for rotete til å fikses med migration | Middels | Pivot til `trading_signals` som canonical source |
| Vercel cron 15-min jobs får timeout på kalde start | Lav | `maxDuration: 300` er allerede satt i `vercel.json` |
| th/zh-markeder klager før i18n er 100 % | Middels | Fokuser P1 på onboarding/auth; resten kan komme etterpå |
| Sanity webhook feiler pga signature mismatch | Lav | Test med `curl -X POST` etter konfigurasjon |

---

## 6. GO / NO-GO for produksjon

| Sjekkpunkt | Status |
|---|---|
| TypeScript bygger | ✅ Grønt |
| OAuth fungerer | ✅ Verifisert |
| Auto-trading DB insert fungerer | ✅ Verifisert |
| Sanity hero rendres | ✅ Verifisert |
| Portfolio viser data | ✅ Verifisert (med fallback) |
| Auto-trading pipeline genererer signaler | ❌ **STOPPET** — krever FASE 1 |
| th/zh i18n er konsistent | ❌ **STOPPET** — krever FASE 2 |

> **Anbefaling:** Ikke kjør markedsføringskampanjer mot th/zh eller auto-trading før FASE 1 og FASE 2 er fullført.

---

## 7. Hva du skal gjøre neste gang vi møtes

Velg ÉN av disse to retningene:

### A) "Fiks auto-trading nå" (P0)
> Jeg implementerer FASE 1 i sin helhet: cron schedules, kolonne-bug, env-var-sjekk, tabell-unifisering, og manuell trigger-test.

### B) "Fiks i18n i onboarding og auth" (P1)
> Jeg gjør en systematisk sweep av `SpeedOnboarding.tsx`, `InteractiveOnboardingWizard.tsx`, og auth-pages for å erstatte alle hardkodede/ternary strings med `next-intl`.

### C) "Begge deler — start med A, deretter B"
> Rekkefølge: FASE 1 → FASE 2. Estimert total tid: 5–7 timer arbeid.

---

*Plan skrevet av: Claude OPUS-syntese (Kimi Code CLI)*  
*Dato: 2026-04-15*  
*MemPalace referanse: `klarpakke/critical_decisions/drawer_klarpakke_critical_decisions_b224b4b7ea0077d4`*
