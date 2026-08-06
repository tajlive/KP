# Klarpakke Enterprise QA — Kvalitetssikring 2026

> **For Hermes:** Plan-only. Bygger på konkurrent-forskning (Coinbase, Stripe, Kraken, Vercel) og fintech QA standarder 2026.

**Goal:** Etablere en enterprise-grade kvalitetskultur i Klarpakke — fra commit til produksjon, med målbare kvalitetsporter, automatisert testing, produksjonsovervåkning, og finansiell korrekthet som absolutt krav.

**Arkitektur:** 6-lags kvalitetsmodell: pre-commit → CI-pipeline → pre-produksjon → utrulling → produksjonsovervåkning → kontinuerlig forbedring. Basert på Coinbase (observability-first, PRR, SRE), Stripe (kontrakt-testing, secrets management), og SRE-prinsipper (SLO/SLI/error budgets).

---

## Hva gjør de ledende konkurrentene? (Forskningsoppsummering)

### Coinbase

- **Blue/green deploy + ingen SSH i prod** — all interaksjon via observability (metrics/logs/traces)
- **3-pillar observability:** tracing, metrics, logs — nyansatte deployer dag 1 (sikkerhetskultur)
- **Production Readiness Review (PRR):** Gjennomgang av alle tjenester før prod — ikke et gate, men en rådgivning. Scorecard med rød/gul/grønn.
- **Sikkerhetspipeline inline:** SAST-skanning på commit FØR den deployeres. "Fail fast on security"
- **Forlot full CD pga. finans-domene:** Ledger-invarianter, kryptografisk nøkkelhåndtering, irreversible settlementer, og umulighet av å speile mainnet i staging → kontrollerte, reviderbare utrullinger
- **Observert svakhet:** Manglende cross-zone failover → 3t global trading outage (2025). Lærdom: infrastruktur-basics MÅ på plass.
- **Glass box first:** Observability er grunnmur, ikke en ettertanke. Alle features instrumenteres FØR de når prod.

### Stripe

- **Kryptografisk nøkkelutveksling** for secrets — ingen manuell kopiering av API-nøkler
- **Kontrakt-testing:** Alle API-endepunkter har eksplisitte kontrakter som testes i CI
- **Programmatisk credential management** på tvers av dev/preview/prod
- **«Bug in payments = real money»** — ekstrem fokus på finansiell korrekthet. Hver transaksjon må være idempotent og reviderbar.

### Generelle fintech QA-standarder (2026)

- **SLO/SLI/Error Budgets:** Google SRE-modellen. 99,9% oppetid = 43 min/mnd feilbudsjett. Over budsjett → feature-freeze.
- **Chaos Engineering for fintech:** Test systemet under reelle feilmoduser — idempotens, konsistens, gjenoppretting. Spesielt viktig for betalingssystemer.
- **DORA-metrikker:** Deployment Frequency, Lead Time, Change Failure Rate, MTTR
- **Feature flags + gradual rollouts:** A/B-testing, canary deploys, umiddelbar rollback
- **PRR-scorecard:** Strukturert produksjonsgjennomgang med 10-15 sjekkpunkter
- **SAST + DAST:** Statisk og dynamisk sikkerhetsskanning i pipeline
- **Performance testing under volatilitet:** Trading-plattformer må tåle 10x trafikkøkning på minutter

---

## Klarpakkes nåværende kvalitetsstatus

| Område | Nåværende | Mål |
|---|---|---|
| **Enhetstester** | 1 977 tester, vitest, 1 feil (pre-eksisterende) | 2 000+ tester, 0 feil, TDD for all ny kode |
| **Type-sikkerhet** | tsc --noEmit = 0 (TypeScript strict) | ✅ Allerede på nivå |
| **CI/CD** | Manuell deploy (npm run cf:build → wrangler deploy) | Automatisert pipeline med kvalitetsporter |
| **E2E-tester** | Playwright smoke-tester finnes (få scenarier) | Omfattende E2E for kritiske flyter (auth, trading, payment) |
| **Ytelsestesting** | Ingen | Lighthouse CI + k6 lasttesting ved deploy |
| **Sikkerhetsskanning** | Ingen automatisert | SAST i CI (CodeQL), secrets-skanning (detect-secrets) |
| **Produksjonsovervåkning** | Sentry/GlitchTip + Cloudflare Analytics | SLO/SLI dashboards + error budgets + alarmeringspolicy |
| **Secrets management** | .env.local (manuell) | Cloudflare Secrets + programmatisk key exchange |
| **PRR** | Ingen formell prosess | Scorecard-basert PRR for alle prod-deployer |
| **Chaos engineering** | Ingen | Kontrollerte feilinjeksjoner for kritiske stier (auth, trading API) |
| **Kodekvalitet** | ESLint + Prettier | ✅ Allerede på nivå. Legg til auto-format on commit (husky) |

---

## 6-lags kvalitetsmodell

### Lag 1: Pre-commit (utviklerens maskin)

**Mål:** Fang 80% av feil før de når CI.

| Sjekk | Verktøy | Handling ved feil |
|---|---|---|
| TypeScript strict | `tsc --noEmit` | Blokker commit |
| Linting | `eslint --max-warnings 0` | Blokker commit |
| Formatering | `prettier --check` | Auto-fiks via `lint-staged` |
| Enhetstester (endrede filer) | `vitest related --run` | Blokker commit |
| Secrets-skanning | `detect-secrets` / `git-secrets` | Blokker commit |

**Implementering:**
```bash
npx husky add .husky/pre-commit "npx lint-staged && npx tsc --noEmit --incremental"
```

**lint-staged.config.js:**
```js
export default {
  "*.{ts,tsx}": ["prettier --write", "eslint --fix --max-warnings 0"],
  "*.{json,md,yaml}": ["prettier --write"],
};
```

### Lag 2: CI-pipeline (GitHub Actions → Cloudflare Workers)

**Mål:** Full automatisert verifisering på hver PR.

**Pipeline-stadier (fra raskeste til tregeste):**

```
1. TypeScript sjekk (30s)    → tsc --noEmit
2. Linting (20s)              → eslint --max-warnings 0
3. Enhetstester (60s)         → vitest run (parallell)
4. Integrasjonstester (90s)   → vitest run med Supabase local
5. SAST-skanning (60s)        → CodeQL / Semgrep
6. Bygg (120s)                → next build (verifiser at prod-bygg fungerer)
7. E2E smoke (120s)           → Playwright mot staging-miljø
8. Bundle-analyse (30s)       → @next/bundle-analyzer (varsle ved >10% økning)
```

**Quality Gates (alle MÅ passere):**

| Gate | Terskel | Konsekvens ved brudd |
|---|---|---|
| TypeScript | 0 feil | Blokker merge |
| Linting | 0 warnings | Blokker merge |
| Enhetstester | 0 feil, coverage ≥ 80% | Blokker merge |
| SAST | 0 critical/high | Blokker merge |
| Bundle size | ≤ +10% vs main | Advarsel → review påkrevd |
| E2E smoke | 100% pass | Blokker merge |

### Lag 3: Pre-produksjon (staging-validering)

**Mål:** Verifisere at endringen fungerer i et prod-lignende miljø.

**Staging-miljø:**
- Cloudflare Workers preview (`wrangler dev --remote` eller preview-URL)
- Supabase staging-database (klone av prod, uten sensitiv data)

**Pre-deploy sjekkliste (PRR-light):**

| Sjekkpunkt | Eier | Status |
|---|---|---|
| Alle CI-gates grønne | Pipeline | ✅/❌ |
| Playwright E2E på staging | QA | ✅/❌ |
| Lighthouse score ≥ 90 (mobil) | Dev | ✅/❌ |
| Sikkerhetsgjennomgang (nye API-er) | Security | ✅/❌ |
| DB-migrasjoner testet på staging | Dev | ✅/❌ |
| Rollback-plan dokumentert | Dev | ✅/❌ |
| Feature-flag konfigurert (hvis relevant) | Dev | ✅/❌ |

**PRR Scorecard (for høyrisiko-endringer — f.eks. trading, auth, payment):**

| Sjekkpunkt | Vekt | Score (0-10) |
|---|---|---|
| Testdekning av endret kode | 2x | /10 |
| E2E-tester for kritiske stier | 2x | /10 |
| Finansiell korrekthet (idempotens, avrunding, valuta) | 3x | /10 |
| Sikkerhet (ingen nye secrets, ingen injection, RLS) | 3x | /10 |
| Ytelse (≤ 200ms p95 for API, ≤ 3s LCP) | 1x | /10 |
| Rollback-klar (feature-flag, ingen DB-breaking change) | 2x | /10 |
| Observability (metrics, logs, alerts lagt til) | 1x | /10 |
| **Total (max 140)** | | **/140** |

**Terskler:**
- ≥ 120/140 → GO for deploy
- 100–119 → GO med waiver (dokumentert risiko)
- < 100 → NO GO — fiks svakheter før deploy

### Lag 4: Utrulling (deploy-strategi)

**Mål:** Trygg, reversibel utrulling med minimal risiko.

**Strategi (tilpasset Cloudflare Workers):**

Cloudflare Workers har innebygd canary/gradual rollout via `--env` og versjonsbytte. Workers deployer atomisk — ingen nedetid.

**Utrullingsprosedyre:**

```
1. Feature-flag: ALL ny funksjonalitet bak flagg (GRID_DEFAULT_ROUTING mønsteret)
2. Staging-verifisering: PRR scorecard ≥ 120
3. Deploy til prod: npx wrangler deploy (atomisk, <60s)
4. Smoke-test prod: curl health + E2E smoke (30s)
5. Aktiver feature-flag: gradvis → 10% → 50% → 100% over 24t
6. Overvåk: error rate, latency, trading volume (48t)
7. FULL ROLLBACK: feature-flag OFF → umiddelbar (ett sekund)
```

**Rollback-kapasitet:**
- Feature-flag OFF = umiddelbar (sett env-var, ingen re-deploy nødvendig)
- Full worker rollback: `npx wrangler rollback` (forrige versjon, <60s)
- DB-rollback: Supabase point-in-time recovery (PITR, siste 7 dager)

### Lag 5: Produksjonsovervåkning

**Mål:** Oppdage feil FØR brukerne gjør det. Datadrevet forbedring.

**Overvåkningsstakk:**

| Lag | Verktøy | Hva vi måler |
|---|---|---|
| **Feilovervåkning** | Sentry/GlitchTip | Alle JS-feil, API-feil, trading-fejl |
| **Ytelsesovervåkning** | Cloudflare Analytics + Web Vitals | LCP, FCP, TTFB, CLS, INP |
| **API-overvåkning** | Cloudflare Workers metrics | Request rate, error rate, p50/p95/p99 latency |
| **Infrastruktur** | Cloudflare Status + Supabase health | Oppetid, database-tilkoblinger, cache-hit rate |
| **Forretningsmetrikker** | Supabase SQL queries | Trading-volum, aktive brukere, konverteringsrate |
| **Syntetisk overvåkning** | Cron health-sjekker (finnes) | /api/health, /api/kraken/status, /api/pilot |

**SLO/SLI-definisjoner:**

| Tjeneste | SLI | SLO | Error Budget (30d) |
|---|---|---|---|
| **Hjemmeside** | HTTP 200-rate | 99,9% | 43 min/mnd |
| **API (/api/*)** | HTTP 200-rate, p95 < 500ms | 99,5% | 3,6t/mnd |
| **Trading API** | Korrekt respons (ikke bare 200), p95 < 1000ms | 99,9% | 43 min/mnd |
| **Auth (login)** | Vellykket innlogging | 99,9% | 43 min/mnd |
| **Payment (Stripe)** | Vellykket betaling | 99,95% | 21 min/mnd |

**Alarmeringspolicy (basert på error budget burn rate):**

| Burn rate | Tid for å bruke hele budsjett | Varsling |
|---|---|---|
| 14,4x (rask) | 1 time | **Kritisk** — side/telefon (ikke relevant for vår skala — PagerDuty for 2027) |
| 1x (normal) | 30 dager | **Advarsel** — melding til Tom (Hermes cron: hvert 15. min sjekk) |
| 0,5x (langsom) | 60 dager | **Info** — daglig digest |

**Klarpakke-tilpasset alarmering:**
- Hermes cron "klarpakke-health-monitor" (hvert 30. min) + "prod-auth-smoke" (hvert 15. min) = eksisterende
- Legg til: `error-budget-burn` cron (hvert 15. min) — sjekker Cloudflare Workers analytics for feilrate > 0,5%
- Kill-switch alarm (når drawdown_kill utløses for EN bruker)
- Grid-manager-alarm (når 2+ påfølgende kjøringer feiler)

### Lag 6: Kontinuerlig forbedring

**Mål:** Systematisk læring fra produksjonshendelser.

**Post-incident review (PIR) — for alle P1/P2-hendelser:**

```
1. Tidslinje: Hva skjedde, når?
2. Rotårsak: Hvorfor skjedde det? (5 whys)
3. Påvirkning: Hvor mange brukere/transaksjoner ble påvirket?
4. Oppdagelse: Hvor lang tid tok det å oppdage? (MTTD)
5. Responstid: Hvor lang tid tok det å fikse? (MTTR)
6. Forebygging: Hva endres for å forhindre gjentakelse?
7. Action items: Konkrete tasks med eier og deadline
```

**PIR-template (lagres i `.hermes/postmortems/`):**
```markdown
# PIR-[dato]-[slug]

**Severity:** P1 (trading stoppet) / P2 (degradert ytelse) / P3 (kosmetisk)
**MTTD:** 4 min  **MTTR:** 12 min  **Users affected:** 0
**Root cause:** [konkret]
**Prevention:** [endring i kode/prosess/infra]
```

---

## Implementasjonsplan (Tasks)

### Fase 1: Pre-commit + CI-pipeline (grunnmur)

| # | Task | Verktøy | Estimat |
|---|---|---|---|
| 1.1 | Installer husky + lint-staged | `npx husky-init` | 10 min |
| 1.2 | Konfigurer pre-commit hooks (tsc, eslint, prettier, vitest related) | `.husky/pre-commit`, `lint-staged.config.js` | 15 min |
| 1.3 | GitHub Actions workflow for CI (alle 8 stadier) | `.github/workflows/ci.yml` | 45 min |
| 1.4 | Legg til CodeQL SAST-skanning | `.github/workflows/codeql.yml` | 15 min |
| 1.5 | Vitest coverage-gate (≥80%) + rapport | `vitest.config.ts` (coverage thresholds) | 15 min |
| 1.6 | Bundle-analyzer-varsling | `next.config.js` + CI-steg | 15 min |

### Fase 2: Staging + PRR

| # | Task | Verktøy | Estimat |
|---|---|---|---|
| 2.1 | Staging-miljø (Cloudflare Workers preview + Supabase staging) | `wrangler.toml` staging-env | 30 min |
| 2.2 | PRR-scorecard-mal + sjekkliste | `.github/prr-scorecard.yml` eller Hermes-kommando | 20 min |
| 2.3 | Automatisk staging-deploy på PR (preview URL) | `wrangler.toml` preview env | 20 min |
| 2.4 | Playwright E2E på staging i CI | `.github/workflows/e2e-staging.yml` | 30 min |
| 2.5 | Lighthouse CI (ytelse + a11y) | `lighthouserc.js` + CI-steg | 15 min |

### Fase 3: Produksjonsovervåkning

| # | Task | Verktøy | Estimat |
|---|---|---|---|
| 3.1 | SLO/SLI-dashboards (via Cloudflare Analytics API) | Hermes cron → daglig SLO-rapport | 30 min |
| 3.2 | Error budget burn rate cron | Hermes cron hvert 15. min | 15 min |
| 3.3 | PIR-template + prosess | `.hermes/postmortems/` | 10 min |
| 3.4 | Forretningsmetrikk-dashbord (trading-volum, aktive brukere) | Supabase SQL → cron-rapport | 20 min |
| 3.5 | Syntetisk overvåkning: utvid til 5+ endpoints | Eksisterende health-cron utvidelse | 15 min |

### Fase 4: Avansert (2027-mål)

| # | Task | Verktøy | Estimat |
|---|---|---|---|
| 4.1 | Chaos engineering for trading API (idempotens-tester) | K6 + feilinjeksjon | 2t |
| 4.2 | Kontrakt-testing for alle API-endepunkter | Vitest + zod schemas | 1t |
| 4.3 | Secrets rotation automation | Cloudflare API + cron | 30 min |
| 4.4 | A/B-testing rammeverk (utover feature-flags) | Statsig / LaunchDarkly / egen | 2t |
| 4.5 | Belastningstesting (10x normal trafikk) | k6 + Cloudflare Workers | 1t |

---

## Prinsipper (Klarpakkes kvalitetsmanifest)

1. **Finansiell korrekthet TRUMFER ytelse.** Hell dead enn feil — stopp trading heller enn å handle feil.
2. **Observability før features.** Hver ny feature instrumenteres med metrics/logs FØR den når prod.
3. **Feature-flag på ALT nytt.** Gir umiddelbar rollback uten re-deploy.
4. **TDD for all forretningslogikk.** Ren funksjon = testbar = trygg.
5. **Pipeline stopper ved usikkerhet.** CI-feil blokkerer merge — ingen "force merge" for å omgå feilende tester.
6. **Post-mortems er skyldfrie.** Fokus på systemforbedring, ikke person.
7. **Error budgets styrer prioritet.** Over budsjett = feature-freeze → fiks stabilitet.
8. **Små, hyppige deployer.** 1 commit = 1 deploy (når CI grønn). Store deployer = stor risiko.

---

## Sammenligning: Klarpakke vs. Konkurrenter

| Kapabilitet | Coinbase | Stripe | Kraken | Klarpakke NÅ | Klarpakke MÅL |
|---|---|---|---|---|---|
| Blue/green deploy | ✅ | ✅ | ✅ | ❌ | ✅ (Cloudflare atomisk) |
| PRR/scorecard | ✅ (advisory) | ✅ | ❓ (ukjent) | ❌ | ✅ (scorecard ≥ 120) |
| SLO/Error Budget | ✅ | ✅ | ❓ | ❌ | ✅ (5 tjenester) |
| Chaos engineering | ✅ | ✅ | ❌ | ❌ | ✅ (Fase 4) |
| SAST i CI | ✅ | ✅ | ❓ | ❌ | ✅ (CodeQL) |
| Feature flags | ✅ | ✅ | ❓ | ✅ (grunnleggende) | ✅ (gradual rollout) |
| E2E automatisert | ✅ | ✅ | ❓ | ✅ (smoke) | ✅ (full suite) |
| Kontrakt-testing | ❓ | ✅ | ❌ | ❌ | ✅ (Fase 4+) |
| Secrets rotation | ✅ | ✅ | ❓ | ❌ | ✅ (Fase 4+) |
| Observability (3 pillars) | ✅ | ✅ | ❓ | ✅ (basal Sentry) | ✅ (Sentry + CF Analytics + dashboards) |

---

## Risikoer

1. **Cloudflare Workers begrensninger:** Workers har 30s timeout og 128MB minne — ytelsestester og observability må respektere disse grensene. Løsning: `wrangler tail` for live-logg, Cloudflare Analytics for aggregert metrics.
2. **Supabase PITR kostnad:** Point-in-time recovery er betalt-funksjon ($). For nå: daglig DB-backup (finnes som cron). Manuell gjenoppretting ved behov.
3. **CI-kostnad:** GitHub Actions har 2000 min/mnd gratis. Vårt CI-bruk: ~3 min/build × 10 PR/uke = 120 min/mnd → god margin.
4. **Over-investering i verktøy:** Vi er et én-person team (Tom + meg). Ikke over-engineer — prioriter det som gir mest verdi per time investert.

---

## Åpne spørsmål

1. **CI-provider:** GitHub Actions (gratis, integrert) eller Cloudflare CI (Workers Builds API)? GitHub Actions anbefales — mer fleksibelt, allerede satt opp.
2. **Coverage-grense:** 80% for alle filer, eller 80% for `src/lib/` (kjerne-logikk) og 60% for UI? Anbefalt: 80% for `src/lib/`, 60% for `src/features/`, 50% for `src/app/`.
3. **SLO-konsekvenser:** Skal error-budget-brudd faktisk stoppe feature-utvikling (Coinbase-modellen) eller bare gi advarsel? Med 1-person team er advarsel + bevissthet nok i starten.

---
*Plan generert 2026-08-06 — basert på Coinbase reliability engineering, Stripe payments excellence, Google SRE, og fintech QA-standarder 2026.*
