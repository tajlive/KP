# KLA-91 Roadmap — Cursor (hovedansvar) · Chief Architect

## Roller

| Rolle               | Ansvar                                                                                                           |
| ------------------- | ---------------------------------------------------------------------------------------------------------------- |
| **Chief Architect** | Godkjenner ADR, prioriterer P0/P1/P2, reviewer PR, staging → prod                                                |
| **Cursor**          | **Hovedleveranse:** implementasjon (agenter/Composer), arkitektur-SQL, docs, Sentry-debug, tester, PR mot `main` |

**Ingen separat «KIMI»-bane** for KLA-91 — alt kjøres i Cursor med repo-regler, MCP (Supabase, Linear, Playwright, …) og under `.cursor/rules/`.

## Enterprise 2026 — forutsetninger (handel trygg før markedsplass-UI)

- [x] RPC `calculate_daily_loss` / `is_bot_healthy`: `SET search_path = public`, `public.trades` — migrasjon `supabase/migrations/20260324120000_kla137_security_definer_search_path.sql`
- [x] SoT + migrasjonskrav: `docs/trading/LIVE-TRADING-TRADES-INTEGRITY.md` (inkl. regressjons-Vitest for `DAILY_LOSS_CHECK_FAILED`)

## Fase 1 — Arkitektur logget

- [x] ADR: `docs/adr/ADR-2026-03-20-KLA-91-strategy-marketplace.md`
- [x] Delegasjon + API/hooks-pseudokode: `docs/architecture/KLA-91-chief-architect-delegation.md`
- [x] Migrasjon: `supabase/migrations/20260320000000_kla91_marketplace_listing_stats.sql`
- [x] PR-mal / sjekkliste: `docs/architecture/KLA-91-PR-TEMPLATE.md`

## Fase 2 — Cursor implementerer (rekkefølge)

Bruk som **intern oppgaveliste** (Composer / agenter):

1. Verifiser migrasjon på remote + regenerer typer ved behov.
2. `src/types/strategy.ts` + Zod i `src/lib/strategies/*.ts` (eller marketplace-modul).
3. API: utvid `GET/POST /api/strategies`, konsolider med `marketplace/listings` etter ADR.
4. Hooks: `useStrategies`, `useCopyStrategy`, Realtime + `setAuth` der RLS gjelder.
5. UI: marketplace browse/filter + integrasjon med `CopyStrategyForm` der det passer.
6. Vitest + Playwright (browse → filter → copy).

**Leserekkefølge før kode:** ADR → `KLA-91-chief-architect-delegation.md` → `KLA-91-strategy-marketplace.md`.

## Fase 3 — Staging + Sentry

- Chief Architect: manuell staging-test.
- Feil → Sentry-logg + kontekst inn i Cursor → patch + deploy.

## Ukentlig sync

| Kilde               | Innhold                                                         |
| ------------------- | --------------------------------------------------------------- |
| **Cursor / Linear** | Status P0 / P1 / P2 på **KLA-231** / **KLA-91**; PR-lenker      |
| **Velocity**        | Issues lukket, tester lagt til (oppdateres i samme Linear-tråd) |
| **Deploy**          | Mandag prod etter grønn CI + verify                             |

## P0 / P1 / P2 (KLA-91)

- **P0:** RLS på nye tabeller; copy auth; migrasjon apply på remote.
- **P1:** Browse + filter + copy E2E; stats-cron (Supabase SoT); Realtime `setAuth`.
- **P2:** Ratings, avansert søk, analytics.
