# Implementeringsplan 2026

**Formål:** Én referanse for implementerte og planlagte funksjoner, routing, design/UX og Linear-oppgaver i 2026.

---

## UX SaaS Lead-agent

| Element | Status | Beskrivelse |
|--------|--------|-------------|
| **Agent** | ✅ | `.agent/agents/ux-saas-lead.md` – Ledende UX-spesialist for SaaS; rolle, sjekkliste, påkrevde docs (design-assessment, konkurranseanalyse, design-ux-premium, tokens). |
| **Cursor-integrasjon** | ✅ | `.cursor/rules/design-ux-premium.md` – Ved UI/design eller premium-audit brukes ux-saas-lead.md (rolle + sjekkliste). |
| **Audit-workflow** | ✅ | `.agent/workflows/premium-design-audit.md` – Steg for premium-audit av sider/knapper og prioriterte sider. |
| **Plan-referanse** | Dette dokumentet | Implementeringsplan som samler UX-agent, produktprinsipper, routing og Linear. |

---

## Produktprinsipper og design

- **Produktprinsipper:** [docs/product-principles-2026.md](product-principles-2026.md) – målgruppe nybegynnere, 75 % mobil, Coinbase/Robinhood-følelse, AI som hovedverdi.
- **Designvurdering:** [docs/design-assessment-2026.md](design-assessment-2026.md) – svakheter, prioriteringer, premium-krav.
- **Konkurranseanalyse:** [docs/design-konkurranse-analyse-2026.md](design-konkurranse-analyse-2026.md) – konkurrentmønstre og dybdeanalyse; anbefalinger ut fra produktprinsipper.

---

## Routing og sider (kort oversikt)

Viktige ruter under `src/app/[locale]/`:

| Rute | Beskrivelse |
|------|-------------|
| `/` | Landing |
| `/priser` | Priser |
| `/innlogging`, `/signup` | Auth |
| `/onboarding/*` | Onboarding (steg 1–5) |
| `/dashboard` | Dashboard (PortfolioDashboard) |
| `/kurs`, `/akademi` | Kurs og akademi |
| `/paper-trading`, `/trade` | Paper trading og handel |
| `/dashboard/auto-trade` | Auto-trade |
| `/handelshistorikk`, `/varsler` | Historikk og varsler |
| `/profile`, `/dashboard/settings` | Profil og innstillinger |
| `/checkout` | Sjekk ut (plan- eller course-basert) |
| `/admin/*` | Admin (brukere, system, m.m.) |

---

## Dashboard-first redesign (gjenstående)

Fra implementeringsplanen – status og gjenstående:

| Id | Oppgave | Status |
|----|---------|--------|
| 2B | Samkjøre farge #0052FF (tokens, globals, nav, sidebar, knapper) | Gjenstår |
| 2C | Font Inter i layout.tsx (erstatte Fraunces/Lexend) | Gjenstår |
| 3 | Erstatt dashboard/page med PortfolioDashboard; fjern EmptyBotState/CourseGate/GetStartedCard der det ikke blokkerer | Gjenstår |
| 4 | Akademi bruker dashboard-layout (sidebar + tabs synlige) | Gjenstår |
| 5 | Fjern CourseGate som blokkerer; kurs anbefales, blokkerer ikke | Gjenstår |
| 6 | Ett-klikks første handel (Velkommen-kort, Kjøp BTC kr 1000, konfetti) | Gjenstår |
| 6 | Kontekstuelle upgrade-momenter (coin #11, TradingView, bot-resultat) | Gjenstår |
| 6 | Sosialt bevis (live-teller, leaderboard-snippet, testimonials priser) | Gjenstår |
| 6 | Streak-system (current_streak, badges, 2x XP Bachelor+) | Gjenstår |

---

## Linear

Oppgaver knyttet til UX-agent, Cursor-regel, audit-workflow og implementeringsplan opprettes/oppdateres i Linear (via `npm run linear` eller Linear MCP). Se [docs/LINEAR-ACCESS.md](LINEAR-ACCESS.md) for tilgang.

Etter implementasjon: oppdater relevante issues til Done.

---

## Tester

- **Enterprise-test:** `npm run test:enterprise` (test:security + test:performance + test:a11y).
- **Verify (kritiske paths, health):** `npm run verify` (scripts/verify-production.mjs) – kjør ev. etter deploy.

---

*Sist oppdatert: mars 2026.*
