# Linear og Klarpakke — operativ standard 2026

**Kilde sannhet i repo:** `AGENTS.md`, `.cursorrules`, `docs/CRON-SOURCE-OF-TRUTH.md`, `docs/LINEAR-ACCESS.md`.

## Status (mars 2026)

- **Produksjon:** Live (www.klarpakke.no). P0 for «åpne prod» er lukket.
- **Linear-prosjekt:** _Lansering Klarpakke_ = hovedspor for produkt og teknisk gjeld som påvirker prod (summary + beskrivelse toppet med post-prod-blokk mars 2026).
- **Overordnet Linear-EPIC:** **KLA-231** — «Operativ standard 2026 (repo + Linear)»; lenker hit og til KLA-226–230 / KLA-170.
- **Ikke lenger aktiv plan:** Pre-launch sprint-epics (f.eks. KLA-116 erstattet av KLA-128, nå Done). Nye oppgaver skal ikke referere til kansellerte foreldre-epics.

## Prioritert arbeidsrekkefølge (teknisk)

1. **KLA-226 → KLA-230** — tier i prod, DB-lint, typer, `profiles`/`user_profiles` (som i AGENTS.md-tabellen).
2. **Unified notifications** — view `unified_notifications_with_email` (migrasjon i repo; kjør mot remote ved behov).
3. **TYPE_DEBT / KLA-228** — `ignoreBuildErrors` av når gjeld er nedkjempet.
4. **EPIC KLA-170** — forbedringsplan (AI, gamification, PWA, vekst) _etter_ at punkt 1–3 ikke blokkerer drift.

## Regler som ikke skal brytes i nye issues

| Tema      | Regel                                                                                         |
| --------- | --------------------------------------------------------------------------------------------- |
| **Cron**  | Source of truth = **Supabase** (pg_cron / scheduler). Ikke nye Vercel Cron som sannhet.       |
| **Stack** | Next.js 15 App Router, React 19, TypeScript strict, Tailwind 4, Supabase SSR `@supabase/ssr`. |
| **Tiers** | student \| bachelor \| master \| phd (plan-param og DB).                                      |
| **i18n**  | Bruker-tekst via `next-intl`; ikke hardkode norske strenger i nye features.                   |

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
