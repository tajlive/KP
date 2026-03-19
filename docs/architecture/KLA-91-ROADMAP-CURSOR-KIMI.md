# KLA-91 Roadmap — Cursor (hovedleveranse) · Chief Architect · KIMI

## Roller

| Rolle               | Ansvar                                                                               |
| ------------------- | ------------------------------------------------------------------------------------ |
| **Chief Architect** | Godkjenner ADR, prioriterer P0/P1/P2, reviewer KIMI-PR, staging → prod               |
| **Cursor**          | Arkitektur-dokumenter, SQL-migrasjoner, root-cause + patch (Sentry), status i Linear |
| **KIMI**            | Full implementasjon mot frosset skjema: API, hooks, UI, tester, PR                   |

## Dag 1 (Mandag) — Architecture decision logged

- [x] ADR: `docs/adr/ADR-2026-03-20-KLA-91-strategy-marketplace.md`
- [x] Delegasjon + API/hooks-pseudokode: `docs/architecture/KLA-91-chief-architect-delegation.md`
- [x] Migrasjon (stats + copy-spor): `supabase/migrations/20260320000000_kla91_marketplace_listing_stats.sql`
- [x] PR-mal: `docs/architecture/KLA-91-PR-TEMPLATE.md`
- [ ] **Commit:** `docs + supabase/migrations` med melding `docs(adr): KLA-91 marketplace decision + migration`

## Dag 2 (Tirsdag) — KIMI implementerer

**Prompt til KIMI (lim inn):**

> Implementer KLA-91 Strategy Marketplace etter repo-dokumentasjon. Les i rekkefølge:
>
> 1. `docs/adr/ADR-2026-03-20-KLA-91-strategy-marketplace.md`
> 2. `docs/architecture/KLA-91-chief-architect-delegation.md`
> 3. `docs/architecture/KLA-91-strategy-marketplace.md`  
>    Migrasjon `20260320000000_kla91_marketplace_listing_stats.sql` er kilde for nye tabeller/kolonner — ikke dupliser.  
>    Fullfør: `src/types/strategy.ts`, konsolider `GET/POST /api/strategies`, hooks (`useStrategies`, `useCopyStrategy`), marketplace-UI, Vitest + Playwright (browse → filter → copy).  
>    Følg `docs/architecture/KLA-91-PR-TEMPLATE.md` i PR-beskrivelsen.

## Dag 3 (Onsdag) — Staging + Sentry

- Chief Architect: manuell staging-test.
- Feil → lim Sentry + kontekst inn i Cursor → patch + deploy.

## Ukentlig sync

| Kilde               | Innhold                                                                         |
| ------------------- | ------------------------------------------------------------------------------- |
| **Cursor / Linear** | Status P0 / P1 / P2 (kort kommentar på **KLA-231** eller dedikert KLA-91-issue) |
| **KIMI**            | Velocity: issues lukket, tester lagt til                                        |
| **Deploy**          | Mandag prod-push etter grønn CI + verify                                        |

## P0 / P1 / P2 (KLA-91-relatert)

- **P0:** RLS på nye tabeller, ingen lekkasje; copy-endepunkt auth; migrasjon apply på remote.
- **P1:** Browse + filter + copy E2E; stats-cron (Supabase); Realtime med `setAuth`.
- **P2:** Ratings, avansert søk, analytics.
