# Klarpakke 2026 Enterprise — Hovedarkitekt Plan

> **For Hermes:** Full autonomi. Bruk subagent-driven-development. Alt skal være 2026 enterprise kvalitet.

**Mål:** Transformere Klarpakke fra prototype til enterprise-grade norsk krypto-trading skole med full automasjon, AI-drevet drift, og kontinuerlig forbedring.

**Arkitektur:** Hermes Agent som hovedarkitekt (beslutter autonomt), delegert utførelse via subagents, sanntids overvåking med auto-healing, CI/CD med pre-merge gates.

**Status:** Produksjon live på klarpakke.no. 34 E2E-tester, 10 helsesjekker, CoinGecko fallback, SmartTrader v3.1, 6 testbrukere.

---

## Fase 1: Dokumentasjonsopprydding (30 min)

> **Problem:** 300+ markdown-filer i rot + docs/. 80% er utdaterte/overlappende.

### Task 1.1: Slett utdaterte rotfiler

**Files to delete (safe — all pre-Hermes audit/status reports):**
- Alle `*AUDIT*`, `*REPORT*`, `*STATUS*`, `*SUMMARY*`, `*FINAL*`, `*DIAGNOS*` i rot
- Alle `KIMI-*`, `KLA-*`, `OAUTH-*`, `MEMPALACE-*` i rot (flyttet til .kimi/ eller foreldet)
- Alle `LINEAR_*`, `PRODUCTION-*`, `MASTER_PLAN_*`, `MASTER_TEST_*`
- Alle `VERIFICATION_*`, `TEST-*`
- `0-HANDLER-UI-FIX.md`, `ACTIONS-COMPLETED*`, `AGENT_COLLABORATION*`
- `AUTH-ISSUE*`, `DEPENDENCY-*`, `ENTERPRISE-STATUS*`, `FULL-INFRA*`
- `IMPLEMENTATION-P0-P1*`, `INCIDENT-*`, `INFRASTRUCTURE-AUTO*`
- `klarpakke-ux-*`, `LAUNCH_CHECKLIST*`, `LINT-FIXES*`
- `TONIGHTS_WORK*`, `TYPESCRIPT-FIX*`, `VERCOST-*`
- `runbook.md`, `ROLLBACK.md`, `SSH_SETUP*`
- `launch/`, `launch-report.md`

**Behold:** `.hermes.md`, `README.md`, `CHANGELOG.md`, `DESIGN.md`, `AGENTS.md`, `.kimi/`

### Task 1.2: Konsolider docs/

**Behold (kjerne):** `01-ARCHITECTURE.md`, `02-DATABASE.md`, `04-DEPLOYMENT.md`, `05-TESTING.md`, `adr/`
**Slett:** Alle single-use rapporter, KIMI prompts, MCP-setup docs (flyttet til .kimi/)

---

## Fase 2: Kodebase-optimalisering (45 min)

### Task 2.1: Fjern ubrukte ruter og komponenter

**Slett:**
- `src/app/[locale]/(user)/dashboard/earn/` — orphan, ingen nav-link
- `src/app/[locale]/(user)/dashboard/strategies/` — orphan
- `src/app/[locale]/(user)/varsler/` — redirect only
- `src/app/[locale]/(onboarding)/interessetest/` — ubrukt
- `src/app/[locale]/(onboarding)/quiz/` — ubrukt
- `src/app/[locale]/[...slug]/` — catch-all, skaper 404-støy
- `src/app/[locale]/feil/` — error pages, finnes i error.tsx boundary

### Task 2.2: Fjern legacy API-ruter

**Slett:**
- `src/app/api/v1/*` — legacy API, erstattet av /api/*
- `src/app/api/cron/` — flyttet til pg_cron
- `src/app/api/paper-trading/` — duplisert av /api/trading/

### Task 2.3: TypeScript-strictifisering

Alle `strict: true` i tsconfig + `noUncheckedIndexedAccess: true`

---

## Fase 3: Enterprise Monitorering (30 min)

### Task 3.1: Utvid /api/health til 12 sjekker

Legg til:
- `tradesPerMinute` — hvis 0 på 5 min → degradert
- `errorRate5m` — hvis >5% 500-feil → unhealthy

### Task 3.2: Auto-Healing Dashboard (admin-side)

Ny side: `/admin/system` — viser:
- Alle 12 helsesjekker i sanntid
- pg_cron status (4 jobs)
- AI Auto-Healing logg
- Deploy-historikk

---

## Fase 4: Forretningsplan (20 min)

### Task 4.1: Opprett `docs/BUSINESS-PLAN.md`

Innhold:
- **Visjon:** Norges ledende krypto-læringsplattform
- **Målgruppe:** 25-45 år, sparing 500-5000 kr/mnd, null krypto-erfaring
- **Inntektsmodell:** Freemium → Premium (199 kr/mnd) → Professor (499 kr/mnd)
- **Konkurrenter:** ingen norske — første i markedet
- **Go-to-market:** TikTok norsk crypto-edu → landing page → paper trading → betalende

### Task 4.2: Oppdater `docs/PRICING.md`

3 tiers: Gratis (paper trading), Premium (live trading), Professor (AI-strategier + copy trading)

---

## Fase 5: Markedsføringsplan (20 min)

### Task 5.1: Opprett `docs/MARKETING-PLAN.md`

Innhold:
- **Kanaler:** TikTok (primær), LinkedIn, Facebook-grupper
- **Innhold:** "Lær krypto på 5 min" shorts, JokerTrade demo-videoer
- **SEO:** Blogg om norsk krypto-regelverk, skatt, sparing
- **Konvertering:** Landing → paper trading → first win → premium upsell
- **Metrics:** CAC < 100 kr, LTV > 1000 kr, churn < 5%/mnd

### Task 5.2: SEO-optimalisering

- Sitemap med alle ruter
- Meta-beskrivelser på alle sider
- Schema.org markup (WebApplication, EducationalOrganization)

---

## Fase 6: Agent-basert Utførelse

### Agentstruktur

```
Hermes Agent (arkitekt)
  ├── Agent 1: Dokumentasjonsrydding (Fase 1)
  ├── Agent 2: Kodebase-optimalisering (Fase 2)
  ├── Agent 3: Enterprise Monitorering (Fase 3)
  ├── Agent 4: Forretningsplan (Fase 4)
  └── Agent 5: Markedsføringsplan (Fase 5)
```

---

## Verifisering

Etter alle faser:
```bash
npm run tsc --noEmit          # 0 feil
npm run test:unit             # 160/162 passerende (2 pre-eksisterende)
npx playwright test e2e/smoke # 13/13 passerende
npx playwright test e2e/golden-path-auth  # 6/6 passerende
curl https://www.klarpakke.no/api/health # healthy, 12 sjekker
```

---

## Tidsestimat

| Fase | Tid | Akkumulert |
|------|----:|-----------:|
| 1. Dokumentasjon | 30m | 30m |
| 2. Kodebase | 45m | 1h15m |
| 3. Monitorering | 30m | 1h45m |
| 4. Forretningsplan | 20m | 2h05m |
| 5. Markedsføring | 20m | 2h25m |
| **Totalt** | **2.5t** | |
