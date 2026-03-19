# ADR-2026-03-20: Strategy Marketplace (KLA-91) — datamodell og leveranseflyt

## Status

**Accepted** (2026-03-20) — logget ved commit; implementasjon fortsetter i faser (KIMI + Cursor).

## Kontekst

Klarpakke trenger en **strategi-markedsplass**: publisering, browse/filter (return %, risiko), copy til egen session, Supabase Realtime der det gir verdi, RLS så kun eier muterer egne oppføringer.

## Beslutning

1. **Katalog vs kjøring**
   - **`marketplace_listings`** forblir kanonisk «vare» i butikken (tittel, beskrivelse, pris, status, `seller_id`, `strategy_id`).
   - **`marketplace_listing_stats`** (ny tabell, 1:1 `listing_id`) holder **materialiserte** filter-/sorteringsfelt (return, drawdown, risk tier, win rate). Oppdateres av **cron/edge** (Supabase som SoT), ikke av klient.
   - **Copy** oppretter **`trading_sessions`** (paper først) med sporbarhet til listing (**`copied_from_listing_id`** på `trading_sessions` etter migrasjon `20260320000000_kla91_marketplace_listing_stats.sql`, pluss `strategy_config`).

2. **API**
   - Kanonisk REST under **`/api/strategies`** (utvid over tid); eksisterende **`/api/marketplace/*`** kan proxyes eller deprecateres etter KIMI-fase.

3. **Realtime**
   - Publiser **`marketplace_listings`** og **`marketplace_listing_stats`** i `supabase_realtime` for katalog-UI; klient må bruke **`realtime.setAuth`** med bruker-JWT der RLS gjelder (samme mønster som for `trades`).

4. **Samarbeidsmodell**
   - **Chief Architect:** vedlikeholder ADR + `docs/architecture/KLA-91-*.md`.
   - **Cursor:** arkitektur, migrasjons-SQL, feilsøking (Sentry), små fixes.
   - **KIMI:** full feature-PR mot godkjent skjema + sjekklister.

## Konsekvenser

- Ny migrasjon i repo: `supabase/migrations/20260320000000_kla91_marketplace_listing_stats.sql`.
- Etter `db push` / remote apply: kjør type-regenerering (`supabase gen types` / prosjektets flyt).
- KIMI må ikke introdusere parallell «sandwich»-API uten å oppdatere denne ADR.

## Referanser

- `docs/architecture/KLA-91-chief-architect-delegation.md`
- `docs/architecture/KLA-91-strategy-marketplace.md`
- `docs/architecture/KLA-91-PR-TEMPLATE.md`
- `docs/architecture/KLA-91-ROADMAP-CURSOR-KIMI.md`
- `docs/CRON-SOURCE-OF-TRUTH.md`
