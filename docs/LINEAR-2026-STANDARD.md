# Linear og Klarpakke — operativ standard 2026

**Kilde sannhet i repo:** `AGENTS.md`, `.cursorrules`, `docs/CRON-SOURCE-OF-TRUTH.md`, `docs/LINEAR-ACCESS.md`, **`docs/i18n/LOCALE-SCOPE-SOURCE-OF-TRUTH.md`** (alle oversettelser / brukertekst: **no + en** aktiv, **th/zh avvent**), **`docs/pricing/PRICING-PLAN-SOURCE-OF-TRUTH.md`** (prisplan + Linear **KLA-236**), **`docs/trading/COPY-TRADING-SOURCE-OF-TRUTH.md`** (copy trading: API, ID-oppløsning, liste, tier-kobling).

## Status (mars 2026)

- **Produksjon:** Live (www.klarpakke.no). P0 for «åpne prod» er lukket.
- **Linear-prosjekt:** _Lansering Klarpakke_ = hovedspor for produkt og teknisk gjeld som påvirker prod (summary + beskrivelse toppet med post-prod-blokk mars 2026).
- **Overordnet Linear-EPIC:** **KLA-231** — «Operativ standard 2026 (repo + Linear)»; lenker hit og til KLA-226–230 / KLA-170.
- **Ikke lenger aktiv plan:** Pre-launch sprint-epics (f.eks. KLA-116 erstattet av KLA-128, nå Done). Nye oppgaver skal ikke referere til kansellerte foreldre-epics.

## Prioritert arbeidsrekkefølge (teknisk)

1. **KLA-226 → KLA-230** — tier i prod, DB-lint, typer, `profiles`/`user_profiles` (som i AGENTS.md-tabellen). **i18n-locale SoT:** `docs/i18n/LOCALE-SCOPE-SOURCE-OF-TRUTH.md`. **Prisplan SoT:** **KLA-236** + `docs/pricing/PRICING-PLAN-SOURCE-OF-TRUTH.md`.
2. **Unified notifications** — view `unified_notifications_with_email` (migrasjon i repo; kjør mot remote ved behov).
3. **TYPE_DEBT** — **KLA-228** er **Done** (`ignoreBuildErrors` av i repo). Videre arbeid: **KLA-229** (TYPE_DEBT-roadmap + CI).
4. **KLA-232** — dashboard live-signaler / win rate / IA-duplikater (relatert til **KLA-170** fase 1).
5. **EPIC KLA-170** — forbedringsplan (AI, gamification, PWA, vekst) _etter_ at punkt 1–4 ikke blokkerer drift.
6. **KLA-91 Strategy Marketplace** — arkitektur **Accepted** i ADR `docs/adr/ADR-2026-03-20-KLA-91-strategy-marketplace.md`; implementasjon følger `docs/architecture/KLA-91-ROADMAP-CURSOR.md` (**Cursor** med agenter har hovedansvaret). Linear: **KLA-91** med underoppgaver **KLA-233 → KLA-234 → KLA-235** (migrasjon/typer → API/hooks → UI+E2E).

## Ukentlig sync (anbefalt)

- **P0 / P1 / P2:** Kort status på **KLA-231** eller relevante issues (markedsplass = KLA-91).
- **Cursor / PR:** Velocity (issues lukket, tester) + lenke til PR som følger `docs/architecture/KLA-91-PR-TEMPLATE.md`.
- **Deploy:** mandag prod etter grønn CI + verify (se AGENTS.md).

## Regler som ikke skal brytes i nye issues

| Tema             | Regel                                                                                                                                                                                |
| ---------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **Cron**         | Source of truth = **Supabase** (pg_cron / scheduler). Ikke nye Vercel Cron som sannhet.                                                                                              |
| **Stack**        | Next.js 15 App Router, React 19, TypeScript strict, Tailwind 4, Supabase SSR `@supabase/ssr`.                                                                                        |
| **Tiers**        | student \| bachelor \| master \| phd \| professor — **KLA-236** + `docs/pricing/PRICING-PLAN-SOURCE-OF-TRUTH.md`.                                                                    |
| **Copy trading** | API, auth, kanoniske ID-er og liste-SoT — `docs/trading/COPY-TRADING-SOURCE-OF-TRUTH.md`; nye features/endringer loggføres i **Linear** (f.eks. under **KLA-91** eller **KLA-231**). |
| **i18n**         | Bruker-tekst via `next-intl`; ikke hardkode norske strenger i nye features.                                                                                                          |

## Arkivering / kansellering i Linear

Issues som:

- har foreldre-epic **Canceled** (f.eks. KLA-116), eller
- er fullstendig dekket av nyere epics (f.eks. AI-MVP **KLA-119** + barn **KLA-120–123** → **Canceled**; videre AI i **KLA-170** fase 2 + **KLA-231**), eller
- beskriver allerede løst arbeid (f.eks. Jest→Vitest når `test:ci` bruker Vitest),

skal settes til **Canceled** med kort henvisning til denne filen eller til erstatnings-issue.

### Utført arkivering (mars 2026)

| Issue                | Grunn                                                   |
| -------------------- | ------------------------------------------------------- |
| KLA-119, KLA-120–123 | Pre-launch AI-MVP-pakke; erstattes av KLA-170 + KLA-231 |
| KLA-75               | Foreldet KLA-116-spor / gammel sidebar-plan             |
| KLA-173              | Jest→Vitest allerede løst i repo (`test:ci`)            |
| KLA-146              | Utdatert MCP type-funn; TYPE_DEBT / KLA-170             |

## Oppdatering av dette dokumentet

Ved større strategisk endring: oppdater denne filen først, deretter Linear-prosjektbeskrivelse og evt. nytt EPIC med lenke hit.
