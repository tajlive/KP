# Live trading & trades — integritet og bevis (SoT for agent)

**Agent:** `.agent/agents/klarpakke-live-trading-trades-agent.md`  
**Workflow:** `.agent/workflows/live-trading-trades-integrity.md`  
**Cursor-regel:** `.cursor/rules/klarpakke-live-trading-trades-agent.mdc` — **`alwaysApply: true`** (full MCP/CLI/CI/dok-kontekst + kapittel _Alltid: full tilgang og oversikt_ + _Fullt ansvar_: bevis i denne filen, oppfølging ved feil, ingen halvveis leveranse).

## Mål

- **Live trading** er korrekt gated og går kun gjennom godkjente server-/executor-stier.
- **Handler** for sluttbruker er konsistente i `trades` (og ev. migrert historikk), med RLS.
- **Bevis** er reproduserbare kommandoer + CI, ikke «det ser bra ut».

## Datakilder (kanonisk app-UI)

| Kilde                     | Brukes til                                                                         |
| ------------------------- | ---------------------------------------------------------------------------------- |
| `public.trades`           | Handelshistorikk, dashboard, paper detail, `trading-api`                           |
| `public.trading_sessions` | Aktive strategier, paper/live sesjoner                                             |
| `trade_history` / legacy  | **Ikke** lest av nåværende handelshistorikk-klient — migrer eller eksponer bevisst |

## Migrasjonskrav (enterprise / KLA-137)

For at **paper- og live-execute** som bruker [`validateTradeAgainstRiskProfile`](../../src/lib/trading/safety/risk-validator.ts) ikke skal feile med `DAILY_LOSS_CHECK_FAILED` pga. manglende databaseobjekter:

- **`public.trades`** må finnes med kolonner som i kjerne-skjema (bl.a. `session_id`, `user_id`, `side`, `price`, `quantity`, `created_at`) — typisk kjede: `001_core_schema.sql` / tilsvarende + [`20260301104500_trading_persistence.sql`](../../supabase/migrations/20260301104500_trading_persistence.sql) m.fl.
- **RPC `calculate_daily_loss`** deployes med [`20260309120000_kla137_trading_safety_core.sql`](../../supabase/migrations/20260309120000_kla137_trading_safety_core.sql) og forsterkes med **`SET search_path = public`** + `public.trades` i [`20260324120000_kla137_security_definer_search_path.sql`](../../supabase/migrations/20260324120000_kla137_security_definer_search_path.sql).

Ved skjemadrift: kjør `supabase db push` mot målmiljø (se `docs/SUPABASE-MIGRASJONER-VARIG-LOSNING.md`) og `npm run db:gen-types` etterpå.

**Når `db push` blokkeres av migrasjonshistorikk-drift** (remote-versjoner som ikke finnes lokalt): idempotent reparasjon kjøres med Management API hvis `SUPABASE_ACCESS_TOKEN` ligger i `.env.local` og prosjektet er linket: **`npm run db:apply:trading-core`** → `scripts/supabase-query-linked.mjs` kjører i rekkefølge [`20260325080000_ensure_public_trades_and_risk_daily_loss.sql`](../../supabase/migrations/20260325080000_ensure_public_trades_and_risk_daily_loss.sql) (trades + `calculate_daily_loss`) og [`20260325120000_ensure_trading_sessions_triggers_search_path.sql`](../../supabase/migrations/20260325120000_ensure_trading_sessions_triggers_search_path.sql) (`trading_sessions`-kolonner, `notification_queue`, triggere med `SET search_path = public` / `public.*` — fikser `relation "trading_sessions" does not exist` ved INSERT på `trades`). **Fasit / sjekkliste:** `docs/trading/DB-REMOTE-REPAIR-FASIT.md`. Registreres ikke automatisk i `schema_migrations`; langsiktig: `migration repair` + synk, deretter `db push`.

**UX / AI (nye eller endrede handels- og signal-flater):** Følg [`docs/product-principles-2026.md`](../product-principles-2026.md) (mobil-først, synlig AI-verdi, lav kognitiv last, trust) og [`src/lib/design/tokens.ts`](../../src/lib/design/tokens.ts) — ingen separat «enterprise»-unntak.

## JWT / Realtime

- Klient-Realtime for `trades`: sett auth med brukerens **access token** (se `subscribeToTrades`, `SignalFeed`).
- **Aldri** service role i nettleser eller commit.

## Regresjonsbeskyttelse — paper handler synlig + API-kontrakt

Linear (sporbarhet): **KLA-237** — https://linear.app/klarpakke/issue/KLA-237/paper-handler-synlig-regresjonslas-zode2e

- **Zod:** `paperExecuteSuccessResponseSchema` (`src/lib/trading/safety/paper-execute-success-response.ts`) validerer JSON fra `POST /api/paper-trading/execute` når `success: true`. Mangler `session_id` / `trade_id` → **500** (deployes ikke stille med ødelagt kontrakt).
- **Vitest:** `src/lib/trading/safety/__tests__/paper-execute-success-response.test.ts`.
- **Playwright (critical):** `e2e/critical/paper-trading.spec.ts` — «paper execute returns session_id and trade row visible on session page» (krever gyldig `.auth/user.json` / E2E-bruker).
- **UI:** `data-testid="paper-session-trade-row"` på rader i `PaperTradingSessionDetail`.
- **Kodegjennomgang:** I bruker-scopede Server Components som leser `trades` / `trading_sessions`, bruk **JWT-klient** (`requireAuth().supabase` eller `createServerClient()`), **ikke** `createClient()` fra `server.ts` (service role).

## Sjekkliste — manuell smoke (etter deploy)

1. Innlogget: `/no/handelshistorikk` — egne rader, filtre Alle/Paper/Live.
2. `/no/paper-trading` — opprett/åpne sesjon; utfør paper trade; se oppdatering.
3. Live (Bachelor+ testbruker med Binance): bytt til live etter gate; ingen 500 på `/api/trading/mode`.

## Auth/profile invariant + signal health

- **Invariant:** `public.user_profiles.id` skal matche `auth.users.id` (og `user_profiles.user_id = auth.users.id` der kolonnen finnes).
- **Verifisering SQL:**
  - `select count(*) from auth.users u left join public.user_profiles up on up.id = u.id where up.id is null;`
  - `select count(*) from auth.users u left join public.user_profiles up on up.user_id = u.id where up.user_id is null;`
- **Signal health CLI:** `npm run signals:health` (feiler hvis siste rad i `trading_signals` er eldre enn `SIGNAL_HEALTH_MAX_AGE_MINUTES`, default 20).
- **Diagnose (signaler + tradere):** `npm run diagnose:signals-traders` — teller `trading_signals`, sjekker ferskhet, teller aktive `leaderboard_bots` og offentlige `trader_profiles` (service role fra `.env.local`).
- **Paper SoT:** nye sesjoner skal gå i `public.trading_sessions` med `mode='paper'`; `paper_trading_sessions` behandles som legacy og skal ikke være primær kilde for nye flater.

## Feilsøking: ingen tradere, ingen «live» signaler, stale i ukevis

**1) Bevis på gammel Vercel-build (observert 2026-03-24):** `GET https://www.klarpakke.no/api/health` skal i `checks` ha nøkkelen **`tradingSignals`**. Hvis JSON kun har `database`, `kv`, `environment`, kjører prod **ikke** siste `route.ts` — **deploy `main` til Vercel** slik at signal-sjekk, `health:prod:gate` og Slack-varsler matcher kodebasen.

**2) Database:** Kjør `npm run diagnose:signals-traders` (med `.env.local`). Tomme eller gamle `trading_signals` → sjekk Supabase **Edge Function `signal-engine`**, **pg_cron** som kaller den, og migrasjoner **`seed_signal_if_stale`** / `signal-fallback-seed-5min` (`20260326151000_signal_fallback_seed_cron.sql` m.fl.) — `npm run db:status` / `db push` mot linket prosjekt.

**3) Tradere (discover):** API leser `leaderboard_bots` (`is_active=true`) og reserve `trader_profiles` (`is_public=true`). Ingen rader → tom UI. Se `docs/trading/COPY-TRADING-SOURCE-OF-TRUTH.md`; seed for testbruker: `create-test-users.js` (leaderboard_bots). Produksjon: legg inn aktive rader via Dashboard SQL eller intern admin-prosess (service role — ikke i nettleser).

## Siste verifisering (oppdateres av agent)

Eldre rader er fjernet her for lesbarhet; **full historikk** ligger i **git** (`main`) og **Linear KLA-239** (DB-drift/repair).

| Dato       | Utført av      | Kommandoer / lenker                                                                                                                                                                                                                                                                                                                                   |
| ---------- | -------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 2026-03-24 | Cursor (agent) | Prod `/api/health` manglet `checks.tradingSignals` (kun database/kv/environment) → **Vercel prod bak `main`**. Lagt `scripts/diagnose-signals-traders.mjs` + `npm run diagnose:signals-traders` og feilsøkingskapittel over.                                                                                                                          |
| 2026-03-23 | Cursor (agent) | Verifisert remote invariant (`auth.users` vs `user_profiles`): `orphan_by_id=3`, `orphan_by_user_id=0`; aktiv trigger `on_auth_user_created -> handle_new_user`. Lagt inn migrasjon `20260326150000_auth_profile_invariant_and_signal_klt.sql` (id-repair + canonical KLT bootstrap), `signals:health` script, og health-check for `trading_signals`. |
| 2026-03-24 | Cursor (agent) | `20260324120000_kla137_security_definer_search_path.sql` — `calculate_daily_loss` / `is_bot_healthy` med `SET search_path = public`. `risk-validator` + Vitest `safety-core.test.ts` for `DAILY_LOSS_CHECK_FAILED`. Deploy: `supabase db push`.                                                                                                       |
| 2026-03-23 | Cursor (agent) | Remote repair + `main` merge **`d06467bd1`**: `20260325080000` + `20260325120000`, duplikat `20260313_terminal_jobs.sql` fjernet, `npm run db:repair:drift` / `db:push:drift` / vanlig `db:push`. **Fasit:** `docs/trading/DB-REMOTE-REPAIR-FASIT.md`. Playwright paper execute critical **passed**. **Linear:** KLA-239 Done.                        |
| 2026-03-22 | Cursor (agent) | Paper: balance/execute/UI, Zod `paperExecuteSuccessResponseSchema`, `data-testid=paper-session-trade-row`, portefølje/analytics — detaljer i commit-historikk før `d06467bd1`.                                                                                                                                                                        |

## Relatert dokumentasjon

- **`docs/trading/DB-REMOTE-REPAIR-FASIT.md`** — fasit: `npm run db:apply:trading-core` når `db push` er blokkert (drift)
- **`docs/trading/USER-TRADES-LIVE-PROOF.md`** — brukerguide: hvor du ser handler, live, SQL-bevis, `verify`
- **`docs/trading/COPY-TRADING-SOURCE-OF-TRUTH.md`** — copy trading, tier-grenser, API
- **`docs/architecture/KLA-91-ROADMAP-CURSOR.md`** — strategy marketplace (KLA-91); ADR `docs/adr/ADR-2026-03-20-KLA-91-strategy-marketplace.md`
- **`docs/trade-consolidation-plan.md`** — legacy-tabeller vs `trades` (ingen nye lesere av `trade_history` uten migrasjon)
- `docs/MCP-CLI-CI-API.md` — MCP, CLI, CI, Playwright env
- `docs/ARCHITECTURE.md` — overordnet flyt
- `docs/CRON-SOURCE-OF-TRUTH.md` — cron ikke på Vercel som SoT
