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

Andre relevante: `/login`, `/(auth)/signup`, `/innlogging`, `/velkommen`, `/kurs`, `/akademi`.

---

## Linear

Relevante Linear-oppgaver for denne implementasjonen kan listes eller lenkes her. Forslag til fire issues:

1. **Agent-fil** – UX SaaS Lead agent-fil og oppsett.
2. **Cursor-integrasjon** – Regel og integrasjon i Cursor for UX-arbeid.
3. **Audit-workflow** – Definisjon og kjøring av UX/design-audit.
4. **Dette dokumentet** – Vedlikehold av `docs/implementation-plan-2026.md` som referanse.

---

## Tester

| Kommando | Bruk |
|----------|------|
| `npm run test:enterprise` | Kjører security-, performance- og a11y-tester. Bruk etter endringer som berører sikkerhet, ytelse eller tilgjengelighet. |
| `npm run verify` | Verifiserer kritiske paths og produksjonssjekker. Valgfritt å kjøre etter endringer for å bekrefte at kritiske ruter og API fungerer. |

Kjør minst `test:enterprise` etter endringer som berører UI, routing eller sikkerhet.
