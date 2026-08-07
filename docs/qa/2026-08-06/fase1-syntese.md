# Fase 1 — Syntese: P0/P1/P2-Backlog

**Dato:** 2026-08-06 17:30 CEST  
**Agenter:** A (trading/cron), B (auth/sikkerhet), C (mobil UX), D (SEO/i18n/CI)  
**Baseline:** `d5c2b21f2`

---

## P0 — Må fikses før go-live (9 funn)

### 🔴 Trading-sikkerhet (Agent A)

| # | Funn | Kilde | Risiko |
|---|------|-------|--------|
| P0-1 | **To trading-motorer parallelt** — pg_cron `tick` (1 min) + Hermes-cron `pilot-engine` (15 min) muterer samme `trading_sessions`/`trades` | `api/cron/tick/route.ts` + `api/pilot-engine/route.ts` + `~/.hermes/cron/jobs.json` | Grid-state-race, dobbel-handling |
| P0-2 | **Nødbrems frakoblet** — `emergency.ts` har null kallere; `system_flags`/`jokertrade_emergency_stop` leses aldri; `/api/admin/kill-switch` kun Kraken | `src/lib/trading/emergency.ts` + migrasjon `20260731000000` | Ingen pålitelig manuell pause |
| P0-3 | **Daglig tapsgrense ikke håndhevet** — `maxDailyLossPercent` settes men leses aldri; `check_daily_loss_limit` leser tom tabell | `api/cron/tick/route.ts:870,2416` | Tap løper ubegrenset |

### 🔴 Sikkerhet (Agent B)

| # | Funn | Kilde | Risiko |
|---|------|-------|--------|
| P0-4 | **3 admin-ruter uten auth** — `campaign/recent`, `campaign/stats`, `funnel/stats` eksponerer bruker-PII (epost, navn, session_id) anonymt | `api/admin/campaign/recent/route.ts`, `campaign/stats`, `funnel/stats` | Anonym kan enumerere alle nye brukere |
| P0-5 | **JWT-claim-escalation** i `withRole`-mønster | `src/lib/api-auth/` | Rettighetseskalering |
| P0-6 | **Vipps-webhook uten signaturvalidering** — DB-skriving uten verifisering | `api/webhooks/vipps/` | Uautorisert DB-mutasjon |

### 🔴 Mobil (Agent C)

| # | Funn | Kilde | Risiko |
|---|------|-------|--------|
| P0-7 | **Bottom tabs mangler Auto Trade** — `MOBILE_BOTTOM_TABS` har 4 entries, ingen Auto | `src/lib/navigation/config.ts:152-185` | 80% mobilbrukere finner ikke Auto Trade |

### 🔴 SEO (Agent D)

| # | Funn | Kilde | Risiko |
|---|------|-------|--------|
| P0-8 | **Canonical = hjemmeside på ALLE sider** — `/no/priser` → `<link rel="canonical" href="https://www.klarpakke.no"/>` | `src/app/layout.tsx:27-33` | Google deduperer alle undersider |
| P0-9 | **hreflang = hjemmeside på ALLE sider** — statiske `{no: "/", en: "/en/"}` | `src/app/layout.tsx:29-32` | Feil språksignaler |

---

## P1 — Bør fikses snart (12 funn)

| # | Funn | Agent | Kilde |
|---|------|-------|-------|
| P1-1 | `coin_prices`: ingen staleness-alarm, to skrivere med ulik FX-rate (hardkodet 9.61) | A | `api/cron/sync-prices/` + `scripts/update-coin-prices.sh` |
| P1-2 | `reconcile`: ingen retry/429/timeout, read-only — fikser aldri | A | `src/lib/trading/reconciliation.ts` |
| P1-3 | `cron-health` overvåker kun 4 av ~20 jobber | A | `api/cron/cron-health/route.ts:11-12` |
| P1-4 | `CRON_SECRET` hardkodet i klartekst i `pilot-ping.sh` | A | `~/.hermes/scripts/pilot-ping.sh:3` |
| P1-5 | Maks eksponering kun per-posisjon, ikke aggregert per bruker | A | `api/cron/tick/route.ts:894` |
| P1-6 | `paper_accounts.total_profit_loss = 0` — defekt kolonne (men ingen API/UI leser den) | A | `paper-account-sync.ts` |
| P1-7 | Onboarding steg3 → `/trade?tab=auto` lander på overview-tab | C | Onboarding-flyt |
| P1-8 | Sticky footer uten safe-area på onboarding | C | `OnboardingStickyFooter.tsx` |
| P1-9 | `og:image` mangler på `/no/priser` | D | `priser/page.tsx` |
| P1-10 | CI-e2e-gate mot nede staging (`/api/health` = 503) | D | `.github/workflows/pre-merge-gates.yml` |
| P1-11 | Sitemap inkluderer `/login` + `/register` (robots-disallowed) + redirect-URLer | D | `src/app/sitemap.ts` |
| P1-12 | Ingen håndhevet branch protection (GitHub free plan) | D | `.github/` |

---

## P2 — Teknisk gjeld (7 funn)

| # | Funn | Agent |
|---|------|-------|
| P2-1 | 14 SURFACE-filer (39 refs) — deprecated design-token | C/D |
| P2-2 | Død kode: `emergency.ts` (340 linjer, 0 kallere), `execute-trade-helpers.ts` (319 linjer) | A |
| P2-3 | `sync-prices`: dobbel `AbortController`-lekkasje | A |
| P2-4 | Autopilot-orchestrator pg_cron job 1176 — ingen reproduserbar migrasjon | A |
| P2-5 | `backtest_cache` mangler i genererte typer (kun cache, ubrukt i prod) | A |
| P2-6 | Node-versjons-mismatch i CI (22 vs 24.18.0) | D |
| P2-7 | 659 identiske no/en i18n-verdier + 6 æøå i en.json | D |

---

## i18n — ✅ Perfekt paritet

`no.json` ↔ `en.json`: **4645/4645 nøkler — 0 manglende begge veier.** `legal`, `pricing.success`, `pricing.cancel`, `onboarding` — alle komplette.

---

## Go/No-go — oppsummert

| Område | Status |
|--------|--------|
| Auth-grunnmur (middleware, logout, cookies) | ✅ |
| RLS (Supabase) | ✅ |
| Health-worker (APP_ORIGIN, 522≠ok) | ✅ |
| i18n-paritet | ✅ |
| OG-bilder (statisk + dynamisk) | ✅ |
| Cron-secret-validering | ✅ |
| **Trading-sikkerhet (parallell motor, nødbrems, tapsgrense)** | ❌ |
| **Admin-ruter uten auth (PII-eksponering)** | ❌ |
| **Mobil Auto Trade (mangler i bottom tabs)** | ❌ |
| **SEO (canonical + hreflang)** | ❌ |

**Konklusjon: NO-GO for paper-trading/SaaS inntil P0-1–P0-9 er løst.**
