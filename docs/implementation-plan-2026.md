# Implementasjonsplan 2026

**Formål:** Én felles referanse for implementert og planlagt funksjonalitet, routing og design/UX-arbeid i 2026.

---

## UX SaaS Lead agent

| Element | Beskrivelse |
|--------|-------------|
| **Plan** | [.cursor/plans/ux_saas_lead_agent](.cursor/plans/ux_saas_lead_agent) (eller tilsvarende plannavn) |
| **Oppsummering** | Agent-fil for UX/SaaS-ledelse, Cursor-regel for konsistent bruk, og definert audit-workflow for UI/UX. |
| **Status** | **Implementert** når punktene 1.1–1.3 er fullført (agent-fil, Cursor-integrasjon, audit-workflow). |

---

## Produktprinsipper og design

| Dokument | Lenke | Rolle |
|----------|--------|--------|
| Produktprinsipper 2026 | [docs/product-principles-2026.md](product-principles-2026.md) | Prioriteringer, målgruppe, betalingsmur, AI, mobil-først. |
| Designvurdering 2026 | [docs/design-assessment-2026.md](design-assessment-2026.md) | Svakheter, prioriteringer, tokens, typografi, hero. |
| Konkurranseanalyse 2026 | [docs/design-konkurranse-analyse-2026.md](design-konkurranse-analyse-2026.md) | Konkurrentmønstre, UX-referanser. |

Ved UI-arbeid brukes **design-ux-premium** (`.cursor/rules/design-ux-premium.md`) og **UX SaaS Lead**-agenten for vurdering og konsistens.

---

## Routing og sider

Kort oversikt over sentrale ruter under `src/app/[locale]/` som er i scope for premium-audit og produktprinsippene:

| Område | Rute(r) | Merknad |
|--------|---------|--------|
| **Landing** | `/` (`page.tsx`) | Hero, CTA, første inntrykk. |
| **Priser** | `/priser`, `/priser/success`, `/priser/cancel` | Tier-valg, konvertering. |
| **Onboarding** | `/onboarding`, `/onboarding/step1-welcome` … `step5-complete` | Ny bruker-flyt. |
| **Dashboard** | `/dashboard`, `/dashboard/portfolio`, `/dashboard/trading`, `/dashboard/settings`, `/dashboard/activity`, `/dashboard/auto-trade`, m.m. | Hovedområde for innlogget bruker. |
| **Paper trading** | `/paper-trading`, `/paper-trading/[session_id]` | Lekepenger, demo. |
| **Handel** | `/trade`, `/handelshistorikk`, `/live-trading`, `/auto-trading` | Handelsflater og historikk. |
| **Varsler** | `/varsler` | Varslingssenter. |
| **Konto** | `/konto`, `/innstillinger` | Profil og innstillinger. |

Andre relevante: `/login`, `/(auth)/signup`, `/innlogging`, `/velkommen`, `/kurs`, **`/akademi`** (prioritert i premium-audit).

Konkurranseanalysen er utvidet med **dybdeanalyse** (per konkurrent: Coinbase, Robinhood, Firi, Revolut, Kraken, Bybit; tema på tvers; anbefalinger knyttet til [product-principles-2026.md](product-principles-2026.md)) – se [design-konkurranse-analyse-2026.md](design-konkurranse-analyse-2026.md).

---

## Linear

Oppgaver opprettet og satt til **Done** for denne implementasjonen:

| Issue | Tittel | Status |
|-------|--------|--------|
| KLA-222 | UX SaaS Lead-agent: Opprett agent-fil | Done |
| KLA-223 | UX SaaS Lead-agent: Cursor-integrasjon | Done |
| KLA-224 | UX SaaS Lead-agent: Premium design audit-workflow | Done |
| KLA-225 | Docs: Implementeringsplan 2026 | Done |

---

## Tester

| Kommando | Bruk |
|----------|------|
| `npm run test:enterprise` | Kjører security-, performance- og a11y-tester. Bruk etter endringer som berører sikkerhet, ytelse eller tilgjengelighet. |
| `npm run verify` | Verifiserer kritiske paths og produksjonssjekker. Valgfritt å kjøre etter endringer for å bekrefte at kritiske ruter og API fungerer. |

Kjør minst `test:enterprise` etter endringer som berører UI, routing eller sikkerhet.

**Siste kjøring:** Exit code 0. Security: `npm audit --audit-level=moderate` (4 low). Performance: placeholder (echo). A11y: ingen tester med `@accessibility` i Playwright – vurder å legge til a11y-tester eller axe.

---

## Siste premium-audit (mars 2026)

Kjørt etter workflow [.agent/workflows/premium-design-audit.md](../.agent/workflows/premium-design-audit.md) på **landing** og **dashboard**.

**Hovedfunn:** (1) Landing og dashboard bruker ad-hoc hex (#0052FF, #F7F8FA) – ikke `tokens.ts`; (2) `tokens.ts` har #2563EB, resten av appen #0052FF – uens merke-farge; (3) Emojis på dashboard (🥇🥈🥉, 🤖, 📘, ⚡) bør erstattes med Lucide; (4) Dashboard-kort mangler `transition-shadow duration-200`; (5) tabular-nums mangler på leaderboard %, coin change %, posisjon %.

**Anbefalte tiltak (prioritet):**
1. **Én merke-fargekilde:** Oppdater `tokens.ts` til #0052FF/#0047E0; importer CARD, BUTTON, SURFACE, SHADOW i `page.tsx`, HeroSection og PortfolioDashboard.
2. **Lucide i stedet for emojis:** PortfolioDashboard – leaderboard (Medal/Trophy), AI Brief (Bot), Lær videre (BookOpen), Bot (Zap/Bot), BUY/SELL (ArrowUp/ArrowDown).
3. **Kort med overgang:** Legg `transition-shadow duration-200` (og ev. hover:shadow-md) på dashboard cardBase og lekepenger-kort; bruk CARD.hover fra tokens der mulig.

**Status:** Tiltak 1–3 er implementert. Feilsider (404, 403, 500), dashboard-layout, innlogging, paper-trading, trade, handelshistorikk, konto og root layout bruker nå tokens der det er gjort endringer.

---

## Design på resten av sidene (tokens/sjekkliste)

Sider og komponenter som **bruker tokens** (SURFACE, BRAND, CARD, HERO, RADIUS, SHADOW, BRAND.dataChecked): landing (page, HeroSection, MarketingNavigation, EmailCapture, DemoWidget, HeaderTicker, LandingNavigation), priser (ClientPricingPage, PricingSection), dashboard (page, PortfolioDashboard, DashboardClientLayout, ReverseTrial, FirstTradeCard, UpgradeGate, PaperLiveToggle), paper-trading (page, PaperTradingList), trade (TradingInterface), handelshistorikk (ClientHandelshistorikk), konto (page), innlogging (InnloggingClient), feil (404, 403, 500), root layout (body), auto-trade (BotDetailView, BotWizard), quiz (QuizClient), kalkulator (ClientKalkulator), admin (ClientAdminV2), UI (switch.tsx med BRAND.dataChecked).

**Status resten:** Landing, dashboard-komponenter, auto-trade, quiz, kalkulator, admin og switch er alignet til tokens. Onboarding, kurs, akademi og varsler kan alignes ved neste audit (hex/emojis → tokens).
