# Trading Cockpit — Chief Architect Plan 2026-07

> **Mandat:** Hovedarkitekten overtar retningen for Klarpakke. Denne planen erstatter den opprinnelige implementasjonsplanen (`docs/superpowers/plans/2026-06-29-trading-cockpit-plan.md`) som **detaljert spesifikasjon**, men bygger videre på design-spec (`docs/superpowers/specs/2026-06-29-trading-cockpit-design.md`).
> 
> **Status:** Draft — venter godkjenning fra produkteier.
> **Sist oppdatert:** 2026-06-29

---

## 1. Strategisk retning (basert på produktvalg)

| Dimensjon | Beslutning |
|---|---|
| **Primært fokus** | Fullføre Trading Cockpit `/handel` (Fase 1–3) |
| **Brukere** | Nybegynnere / retail — enkelhet, trygghet, tydelighet |
| **Plattform** | Mobil-først web (PWA), desktop-optimert |
| **AI** | Full auto-trading med guardrails (brukerens grenser er autoritative) |
| **Marketplace** | Abonnement/tier-grenser + revenue share (ca. 30%) |
| **Integrasjoner** | Ingen nye — forsterke eksisterende Binance + Stripe |
| **Suksess** | Færre produksjonsfeil og raskere deploy |
| **Arkitektur** | UI/API i Next.js/Cloudflare Workers, execution i Supabase |
| **Utførelse** | Cursor + spesialiserte agenter; Chief Architect godkjenner ADR/PR |
| **Typegjeld** | Hybrid: kritiske tabeller først, resten gradvis |

---

## 2. Arkitekturprinsipper

1. **URL er sannheten.** `mode` og `tab` styres av `/no/handel?mode=paper&tab=overview`. Ingen skjult tilstand.
2. **Server-side aggregater.** KPI-er og analytics kommer fra RPC-er, ikke klient-side løkker over `LIMIT 200`.
3. **Fail-closed live.** Hver live-operasjon verifiserer `verifyLiveEntitlement` først. Manglende data → `false`.
4. **Feature-isolerte typer.** Cockpit eier `src/features/trading-cockpit/cockpit-database.types.ts`. Broad `src/types/database.types.ts` rulleres tilbake og fikses gradvis.
5. **Mobil-først, ikke mobil-bare.** Samme data, ulike layouts: kort på mobil, tabell på desktop.
6. **PWA-klar fra dag én.** Service worker, offline-stubber, app-manifest og touch-mål ≥ 48 px er del av Fase 1.
7. **Guardrails før fancy.** Daily loss, max drawdown, pause-knapp og tydelige risk-bannere kommer før AI-coach og copy-trading.
8. **En real-time-kanal.** Én debounced subscriptions-manager per cockpit; pause når `document.hidden`.
9. **Testbarhet innbygget.** Hver agent leverer enhetstester for koden den skriver; E2E eies av QA-agent.
10. **Ingen mocking av infrastruktur.** Test mot Supabase-testprosjekt eller staging, ikke mockede klienter.

---

## 3. Faseplan

### Fase 0 — Grunnmur (1 uke)
**Mål:** Fjerne blokkeringer før Cockpit-bygging.

| Oppgave | Ansvar | Output | Kvalitetsgate |
|---|---|---|---|
| 0.1 Rulle tilbake `src/types/database.types.ts` | Chief Architect / Type-debt agent | `git revert` + backup | `npm run type-check` grønn |
| 0.2 Isolere Cockpit-typer i `cockpit-database.types.ts` | Type-debt agent | `src/features/trading-cockpit/cockpit-database.types.ts` | Kun Fase 1-kode importerer den |
| 0.3 Fikse kritiske tabeller: `trading_sessions`, `trades`, `user_profiles` | Type-debt agent | Ingen type-feil i Cockpit-kode | Type-check + lint |
| 0.4 SQL: `calculate_effective_pnl`, `trading_session_status_counts` | DB agent | Migrasjoner apply-et på staging | `supabase db reset` ok |
| 0.5 Verifisere `verifyLiveEntitlement` helper | Auth agent | Ett felles API brukt av alle nye ruter | Enhetstest |
| 0.6 Etablere Cockpit-feature-mappestruktur | Chief Architect | `src/features/trading-cockpit/` oppsett | Tom, men strukturert |

**Fase 0-go/no-go:** `npm run type-check`, `npm run lint`, `npm run test:unit` grønne. Ingen broad `database.types.ts`-regenerering uten plan.

---

### Fase 1 — Cockpit MVP (2 uker)
**Mål:** `/handel` erstatter dagens forvirrede side med KPI-er, tabs og session-liste.

| Oppgave | Ansvar | Output |
|---|---|---|
| 1.1 API-ruter: `/api/trading-cockpit/metrics`, `/sessions` | Backend agent | Auth + Zod + live-gate |
| 1.2 Server-komponent: `getCockpitInitialData` | Backend agent | SSR seed for KPI + sessions |
| 1.3 Provider + hooks: `TradingCockpitProvider`, `useTradingCockpit` | Frontend agent | URL-sync, mode/tab, refresh |
| 1.4 Header: `CockpitHeader`, `KpiCards`, `ModeBadge`, `FreshnessIndicator` | UX/UI agent | Mobil-scroll, desktop-grid |
| 1.5 Tabs + Overview: `CockpitTabs`, `OverviewTab`, `SessionList`, `QuickActions` | UX/UI agent | Oversikt funksjonell |
| 1.6 i18n: `messages/no/trading.json`, `messages/en/trading.json` | i18n agent | Nøkler for alle nye flater |
| 1.7 PWA-grunnmur: manifest, service worker stub, touch-targets | Frontend agent | Lighthouse PWA-sjekk |
| 1.8 Enhetstester: provider, KPI-kort, tabs | QA agent | ≥ 80% coverage på nye filer |
| 1.9 E2E: last `/no/handel`, se KPI-er, bytt tab | QA agent | Playwright-test grønn |

**Fase 1-go/no-go:** Cockpit viser riktig data for både paper og live; mobil ser bra ut; E2E grønn.

---

### Fase 2 — Handler og Analyse (2 uker)
**Mål:** Full trade history med filtre, paginering og analytics.

| Oppgave | Ansvar | Output |
|---|---|---|
| 2.1 SQL: `get_trades_paginated` + `get_trading_analytics` | DB agent | Cursor-paginering, full aggregasjon |
| 2.2 API-ruter: `/api/trading-cockpit/trades`, `/analytics` | Backend agent | Zod + arrays fra query params |
| 2.3 Trades-tab: filtre, tabell, kort, cursor-paginering | UX/UI agent | Desktop + mobil |
| 2.4 Analysis-tab: period selector, stat grid, PnL-chart, symbol distribution | UX/UI agent | Lazy-loaded første gang |
| 2.5 Bottom sheets: filtre på mobil, trade-details | UX/UI agent | ≥ 48 px touch targets |
| 2.6 Empty/error states for alle tabs | UX/UI agent | Ingen “ingen data” ved fetch-feil |
| 2.7 Realtime: én debounced subscription-manager | Backend/Frontend agent | Pause ved `document.hidden` |
| 2.8 Enhetstester + E2E for filtre/paginering/analytics | QA agent | Kritisk sti grønn |

**Fase 2-go/no-go:** Analytics computed fra hele datasettet; ingen `LIMIT 200`; filtre/paginering E2E grønn.

---

### Fase 3 — Guardrails og PWA (1–2 uker)
**Mål:** Retail-klar produkt med sikkerhet og app-følelse.

| Oppgave | Ansvar | Output |
|---|---|---|
| 3.1 Risk Guard: daily max loss, drawdown, pause-knapp | Trading logic agent | Guardrails i auto-trading |
| 3.2 Live-mode confirmation og “Husk som standard” | UX/UI agent | Explicit opt-in |
| 3.3 PWA: offline-stubber, install prompt, icons | Frontend agent | Lighthouse PWA ≥ 90 |
| 3.4 Performance: memoization, chart-downsampling, bundle-analyse | Performance agent | `ANALYZE=true npm run build` |
| 3.5 Observability: Sentry-tags, cockpit-spesifikke feilmeldinger | Observability agent | Sporbarhet i prod |
| 3.6 Dokumentasjon: ADR for Cockpit-arkitektur, oppdatert ROUTE-INVENTORY | Documentation agent | Arkitekturbeslutninger logget |

**Fase 3-go/no-go:** Lighthouse PWA ≥ 90; guardrails stopper trading ved daily loss; prod-monitorering klar.

---

### Fase 4 — AI guardrails og marketplace-klargjøring (2 uker)
**Mål:** AI auto-trading med tydelige guardrails; cockpit klar for KLA-91 marketplace.

| Oppgave | Ansvar | Output |
|---|---|---|
| 4.1 AI guardrails: LLM-forslag godkjennes alltid av brukergrenser | AI strategist agent | Ingen AI-handler utenfor guardrails |
| 4.2 “Explain my trades”-coach (safe guidance) | AI strategist agent | Ingen kjøp/salg-råd |
| 4.3 Cockpit-API dokumentert for marketplace-integrasjon | API designer agent | OpenAPI/typed routes |
| 4.4 Forberede `marketplace_listings` + `user_strategies.copied_from_listing_id` | DB agent | Klar for KLA-91 |
| 4.5 ADR: Cockpit ↔ Marketplace-grensesnitt | Chief Architect | Godkjent ADR |

---

## 4. Agent-delegering (Cursor-modell)

Hver fase delegeres til én eller flere spesialiserte agenter. Chief Architect eier plan, ADR og go/no-go.

| Agent | Rolle | Primær i fase |
|---|---|---|
| `klarpakke-chief-architect` | Plan, ADR, PR-review, go/no-go | Alle |
| `klarpakke-ux-ui-agent` | Komponenter, mobil, tokens, i18n | 1, 2, 3 |
| `klarpakke-live-trading-trades-agent` | Trading-logikk, guardrails, FIFO, PnL | 0, 3, 4 |
| `klarpakke-auth-agent` | `verifyLiveEntitlement`, auth, RLS | 0, 1, 3 |
| `klarpakke-api-designer` | API-ruter, Zod, OpenAPI | 1, 2, 4 |
| `klarpakke-data-pipeline-engineer` | SQL-funksjoner, RPC-er, migrasjoner | 0, 1, 2, 4 |
| `klarpakke-i18n-auditor` | Nøkler, terminologi, scope | 1, 2 |
| `qa-automation-engineer` | Vitest + Playwright | 1, 2, 3 |
| `klarpakke-performance-optimizer` | Bundle, render, realtime | 2, 3 |
| `klarpakke-observability-engineer` | Sentry, logging, monitorering | 3 |
| `klarpakke-auto-trade-strategy-research-agent` | AI coach, guardrails | 4 |

**Retningslinjer:**
- Ingen agent skriver kode uten først å lese relevant `.cursor/rules/*` og `docs/adr/*`.
- Hver PR skal være én fase-oppgave, maks 400 linjer endring.
- Alle PR-er krever `npm run type-check`, `npm run lint`, `npm run test:unit`, `npm run build`.

---

## 5. Tekniske arkitekturvalg

### 5.1 Type-system
- **Broad `database.types.ts` rulleres tilbake** til siste kjente grønne versjon.
- **Cockpit eier `cockpit-database.types.ts`** med kun tabellene/funksjonene den trenger.
- Andre features følger samme mønster etter hvert (`@/features/*/database.types.ts`).
- Typegjeld utenfor Cockpit markeres med `// @ts-expect-error` + Linear/JIRA-ref. Ingen nye `any`.

### 5.2 State-håndtering
- URL = source of truth for `mode`, `tab`, `filters`.
- `TradingCockpitProvider` initialiseres fra SSR-props.
- React Query / SWR for server-state; provider for UI-state.
- Ingen global state-bibliotek innføres uten ADR.

### 5.3 API-grensesnitt
- Alle nye ruter under `/api/trading-cockpit/*`.
- Auth med `supabase.auth.getUser()`, `user_id` fra session, aldri fra klient.
- `Cache-Control: private, no-store, max-age=0`.
- Zod-validering på alle inputs.

### 5.4 Realtime
- En `useCockpitRealtime` hook per Cockpit-instans.
- Subscribe på `trading_sessions` og `trades` for `user_id`.
- Debounce 800 ms; pause når `document.hidden`.

### 5.5 PWA
- `manifest.json` med theme, icons, display `standalone`.
- Service worker med offline-fallback for `/handel`.
- `next-pwa` eller egen Workbox-konfig vurderes i Fase 3 ADR.

---

## 6. Risikoer og mitigering

| Risiko | Sannsynlighet | Konsekvens | Mitigering |
|---|---|---|---|
| Typegjeld eskalerer igjen | Medium | Blokkerer deploy | Isolerte feature-typer; ingen broad regenerering uten plan |
| `realized_pnl` data-korrupt | Høy | Feil analytics | `calculate_effective_pnl` fallback; cleanup-migrasjon i Fase 0 |
| Live-mode privilege escalation | Medium | Sikkerhetsbrudd | `verifyLiveEntitlement` på hver live-lesing/mutasjon |
| Mobile UX blir for komprimert | Medium | Dårlig konvertering | Bottom sheets, kort, ≥ 48 px; E2E på 375 px |
| Realtime-stampede | Lav | Høy server-load | Debounce + pause on hidden; overvåkes i prod |
| Scope creep til AI-coach/marketplace | Medium | Forsinket cockpit | Out-of-scope-liste; egne specs etter Fase 3 |
| Cloudflare Workers-bygg feiler | Medium | Deploy-blokk | `npm run cf:build` i CI før merge |

---

## 7. Suksesskriterier

- **Fase 0:** `type-check`, `lint`, `test:unit` grønne; Cockpit-typer isolerte.
- **Fase 1:** `/handel` viser KPI-er og sessions; E2E “last page” grønn.
- **Fase 2:** Filtre, paginering, analytics fungerer; ingen `LIMIT 200`.
- **Fase 3:** PWA Lighthouse ≥ 90; guardrails stopper trading ved daily loss.
- **Fase 4:** AI coach gir kun safe guidance; marketplace-klargjøring dokumentert.
- **Overordnet:** ≤ 1 prod-feil/uke relatert til cockpit; deploy-tid ≤ 15 min fra merge.

---

## 8. Neste steg

1. Godkjenn denne planen.
2. Chief Architect oppretter Linear-epic / GitHub-issues for hver fase-oppgave.
3. Start Fase 0 med Type-debt agent og Auth agent i parallell.
4. Planlegg ukentlig sync: mandag go/no-go, torsdag demo.

---

## 9. Relasjon til eksisterende planer

- **Erstatter:** `docs/superpowers/plans/2026-06-29-trading-cockpit-plan.md` (for detaljert taktikk).
- **Bygger på:** `docs/superpowers/specs/2026-06-29-trading-cockpit-design.md` (UI/data-kontrakter).
- **Supplerer:** `docs/architecture/KLA-91-chief-architect-delegation.md` (marketplace kommer etter Fase 4).
- **Avhenger av:** `docs/trading/LIVE-TRADING-TRADES-INTEGRITY.md` (live trading sikkerhet).
