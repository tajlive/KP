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

## Siste verifisering (oppdateres av agent)

| Dato       | Utført av      | Kommandoer / lenker                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           |
| ---------- | -------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 2026-03-24 | Cursor (agent) | **Enterprise 2026 P0 (plan → kode):** Migrasjon `20260324120000_kla137_security_definer_search_path.sql` — `calculate_daily_loss` + `is_bot_healthy` med `SET search_path = public` og `public.trades` / `public.bot_health`. SoT-avsnitt «Migrasjonskrav» i denne filen. `risk-validator`: Sentry `logError` ved RPC-feil / null på `calculate_daily_loss` (tags `domain`, `rpc`, `rejectionReason`). Vitest: `safety-core.test.ts` utvidet med `DAILY_LOSS_CHECK_FAILED` (RPC-feil + null data). `node scripts/validate-migrations.mjs` OK; `vitest run src/lib/trading/safety/__tests__/safety-core.test.ts` OK; `npm run type-check` OK. **Deploy:** kjør `supabase db push` mot remote for effekt i prod/staging.        |
| 2026-03-23 | Cursor (agent) | **Remote repair (drift vs. `db push`):** (1) `20260325080000` — `public.trades` + `calculate_daily_loss`. (2) `20260325120000` — `trading_sessions`/`notification_queue` + triggere med `SET search_path = public` (fikser `trading_sessions` 42P01 ved trade-insert). `npm run db:apply:trading-core` kjører begge. **Bevis:** Playwright paper-trading critical-chromium — «paper execute returns session_id…» **passed**; lint, type-check, `test:unit` OK. Fasit: `docs/trading/DB-REMOTE-REPAIR-FASIT.md`. Neste: migration repair + `db push`.                                                                                                                                                                          |
| 2026-03-22 | Cursor (agent) | **Paper handler «forsvinner» / feil sesjon:** `GET /api/paper-trading/balance` bruker nå samme sesjonsvalg som execute (aktiv `paper`, `order(updated_at desc)`), returnerer `session_id`, `recentTrades` bruker `trading_pair` + `executed_at`. `POST /api/paper-trading/execute` støtter valgfri `session_id` (eier + aktiv paper). `PaperTradingSessionDetail` refetcher `trades` ved mount + `visibilitychange`; liste sortert på `executed_at`; realtime deduper på `id`. `execute-paper-trade` setter eksplisitt `created_at`; eksplisitt `session_id` feiler ikke med «opprett ny sesjon». `PaperTradeButton` sender `session_id` + `router.refresh()`. `npm run type-check` + `vitest run src/lib/trading/safety` OK. |
| 2026-03-22 | Cursor (agent) | **Regresjonslås paper:** Zod `paperExecuteSuccessResponseSchema` på `POST /api/paper-trading/execute` (suksess uten `session_id`/`trade_id` → 500). Vitest `paper-execute-success-response.test.ts`. Playwright critical: «paper execute returns session_id and trade row visible». `data-testid=paper-session-trade-row`.                                                                                                                                                                                                                                                                                                                                                                                                    |
| 2026-03-22 | Cursor (agent) | **Paper handel synlig i UI:** `paper-trading/[session_id]/page` bruker `requireAuth().supabase` (JWT/RLS), ikke service-role `createClient()`. `PaperTradingSessionDetail` leser `quantity`/`realized_pnl`/`total_value` (ikke feil `amount`/`profit_loss`). API `POST /api/paper-trading/execute` returnerer `session_id`; `TradingInterface`/`FirstTradeCard` navigerer til sesjon etter vellykket handel; `PaperTradeButton` respekterer `success: false` ved HTTP 200. `npm run type-check` OK.                                                                                                                                                                                                                           |
| 2026-03-22 | Cursor (agent) | **Paper execute + portefølje:** `execute-paper-trade` bruker `maybeSingle`+`order(updated_at)`, gyldig `trading_sessions`-insert (`strategy_id`/`strategy_config`/heartbeat), `trades.status: filled`, synk `current_capital_nok`↔`current_capital` etter trigger. `getPortfolio`/`getActiveStrategies` coalescer `*_nok` med legacy capital. **Analytics:** `build-trading-analytics` win/loss-kake bruker effektiv P&L per rad; resultat-side poll 45s. **UI:** fjernet statisk leaderboard/AI-tall/streak-fake i dashboard; BotStatus bruker `trade-effective-pnl` for perioder. `npm run type-check` + `npm run lint` OK.                                                                                                 |
| 2026-03-21 | Cursor (agent) | Resultatside `/dashboard/resultater`: `effectivePnlDelta` i `build-trading-analytics.ts` (fallback signert `total_value` når `realized_pnl` mangler); API-felt `aggregates.totalEffectivePnl`; UI bruker `useCurrency` for USD/EUR/NOK. Bevis: `docs/proof/RESULTS-DASHBOARD-NET-PNL-2026-03-21.md`, `npx vitest run src/lib/trading/build-trading-analytics.test.ts`.                                                                                                                                                                                                                                                                                                                                                        |
| 2026-03-21 | Cursor (agent) | `playwright.config.ts`: merger `.env.production.local` / `.env.development.local` inn i `process.env` for webServer (fyller `NEXT_PUBLIC_*` som `next dev` ellers ikke leser), **uten** `NODE_ENV` fra de filene. `npx playwright install chromium`. `npm run test:e2e:smoke` → 28 passed; `npm run test:e2e:critical:chromium` → 27 passed, 9 skipped (mangler `E2E_USER_EMAIL`/`E2E_USER_PASSWORD`). `e2e/critical/trading-flow-tier-gate.spec.ts`: CTA-lenke matcher `as-needed` (`/paper-trading` eller `/no/paper-trading`). **Saldo/live signaler innlogget:** fortsatt manuell sjekkliste § ovenfor eller `test:e2e:with-user` med legitimasjon.                                                                       |
| 2026-03-21 | Cursor (agent) | Vercel/Sentry: `next.config.mjs` — Sentry source map-upload kun når `VERCEL=1` eller `SENTRY_UPLOAD_SOURCE_MAPS=true`; lokalt/CI pre-build uten `ENOTEMPTY`. `npm run build:local` OK. MCP Vercel: krever OAuth i Cursor (se `docs/VERCEL-SETTINGS.md` §9–11).                                                                                                                                                                                                                                                                                                                                                                                                                                                                |
| 2026-03-21 | Cursor (agent) | Dashboard: `subscribeToTrades` (JWT) erstatter rå realtime uten `setAuth`; saldo utledes fra økt + `session_id`; `npm run test:unit` (PortfolioDashboard), `npm run type-check` OK                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            |
| 2026-03-20 | Cursor (agent) | `npm run verify` → ALL TESTS PASSED; handelshistorikk: polling 20s for live liste — se `USER-TRADES-LIVE-PROOF.md`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            |

## Relatert dokumentasjon

- **`docs/trading/DB-REMOTE-REPAIR-FASIT.md`** — fasit: `npm run db:apply:trading-core` når `db push` er blokkert (drift)
- **`docs/trading/USER-TRADES-LIVE-PROOF.md`** — brukerguide: hvor du ser handler, live, SQL-bevis, `verify`
- **`docs/trading/COPY-TRADING-SOURCE-OF-TRUTH.md`** — copy trading, tier-grenser, API
- **`docs/architecture/KLA-91-ROADMAP-CURSOR.md`** — strategy marketplace (KLA-91); ADR `docs/adr/ADR-2026-03-20-KLA-91-strategy-marketplace.md`
- **`docs/trade-consolidation-plan.md`** — legacy-tabeller vs `trades` (ingen nye lesere av `trade_history` uten migrasjon)
- `docs/MCP-CLI-CI-API.md` — MCP, CLI, CI, Playwright env
- `docs/ARCHITECTURE.md` — overordnet flyt
- `docs/CRON-SOURCE-OF-TRUTH.md` — cron ikke på Vercel som SoT
