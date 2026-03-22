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

## JWT / Realtime

- Klient-Realtime for `trades`: sett auth med brukerens **access token** (se `subscribeToTrades`, `SignalFeed`).
- **Aldri** service role i nettleser eller commit.

## Sjekkliste — manuell smoke (etter deploy)

1. Innlogget: `/no/handelshistorikk` — egne rader, filtre Alle/Paper/Live.
2. `/no/paper-trading` — opprett/åpne sesjon; utfør paper trade; se oppdatering.
3. Live (Bachelor+ testbruker med Binance): bytt til live etter gate; ingen 500 på `/api/trading/mode`.

## Siste verifisering (oppdateres av agent)

| Dato       | Utført av      | Kommandoer / lenker                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     |
| ---------- | -------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 2026-03-22 | Cursor (agent) | **Paper handel synlig i UI:** `paper-trading/[session_id]/page` bruker `requireAuth().supabase` (JWT/RLS), ikke service-role `createClient()`. `PaperTradingSessionDetail` leser `quantity`/`realized_pnl`/`total_value` (ikke feil `amount`/`profit_loss`). API `POST /api/paper-trading/execute` returnerer `session_id`; `TradingInterface`/`FirstTradeCard` navigerer til sesjon etter vellykket handel; `PaperTradeButton` respekterer `success: false` ved HTTP 200. `npm run type-check` OK.                                                                                                                                                     |
| 2026-03-22 | Cursor (agent) | **Paper execute + portefølje:** `execute-paper-trade` bruker `maybeSingle`+`order(updated_at)`, gyldig `trading_sessions`-insert (`strategy_id`/`strategy_config`/heartbeat), `trades.status: filled`, synk `current_capital_nok`↔`current_capital` etter trigger. `getPortfolio`/`getActiveStrategies` coalescer `*_nok` med legacy capital. **Analytics:** `build-trading-analytics` win/loss-kake bruker effektiv P&L per rad; resultat-side poll 45s. **UI:** fjernet statisk leaderboard/AI-tall/streak-fake i dashboard; BotStatus bruker `trade-effective-pnl` for perioder. `npm run type-check` + `npm run lint` OK.                           |
| 2026-03-21 | Cursor (agent) | Resultatside `/dashboard/resultater`: `effectivePnlDelta` i `build-trading-analytics.ts` (fallback signert `total_value` når `realized_pnl` mangler); API-felt `aggregates.totalEffectivePnl`; UI bruker `useCurrency` for USD/EUR/NOK. Bevis: `docs/proof/RESULTS-DASHBOARD-NET-PNL-2026-03-21.md`, `npx vitest run src/lib/trading/build-trading-analytics.test.ts`.                                                                                                                                                                                                                                                                                  |
| 2026-03-21 | Cursor (agent) | `playwright.config.ts`: merger `.env.production.local` / `.env.development.local` inn i `process.env` for webServer (fyller `NEXT_PUBLIC_*` som `next dev` ellers ikke leser), **uten** `NODE_ENV` fra de filene. `npx playwright install chromium`. `npm run test:e2e:smoke` → 28 passed; `npm run test:e2e:critical:chromium` → 27 passed, 9 skipped (mangler `E2E_USER_EMAIL`/`E2E_USER_PASSWORD`). `e2e/critical/trading-flow-tier-gate.spec.ts`: CTA-lenke matcher `as-needed` (`/paper-trading` eller `/no/paper-trading`). **Saldo/live signaler innlogget:** fortsatt manuell sjekkliste § ovenfor eller `test:e2e:with-user` med legitimasjon. |
| 2026-03-21 | Cursor (agent) | Vercel/Sentry: `next.config.mjs` — Sentry source map-upload kun når `VERCEL=1` eller `SENTRY_UPLOAD_SOURCE_MAPS=true`; lokalt/CI pre-build uten `ENOTEMPTY`. `npm run build:local` OK. MCP Vercel: krever OAuth i Cursor (se `docs/VERCEL-SETTINGS.md` §9–11).                                                                                                                                                                                                                                                                                                                                                                                          |
| 2026-03-21 | Cursor (agent) | Dashboard: `subscribeToTrades` (JWT) erstatter rå realtime uten `setAuth`; saldo utledes fra økt + `session_id`; `npm run test:unit` (PortfolioDashboard), `npm run type-check` OK                                                                                                                                                                                                                                                                                                                                                                                                                                                                      |
| 2026-03-20 | Cursor (agent) | `npm run verify` → ALL TESTS PASSED; handelshistorikk: polling 20s for live liste — se `USER-TRADES-LIVE-PROOF.md`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      |

## Relatert dokumentasjon

- **`docs/trading/USER-TRADES-LIVE-PROOF.md`** — brukerguide: hvor du ser handler, live, SQL-bevis, `verify`
- `docs/MCP-CLI-CI-API.md` — MCP, CLI, CI, Playwright env
- `docs/ARCHITECTURE.md` — overordnet flyt
- `docs/CRON-SOURCE-OF-TRUTH.md` — cron ikke på Vercel som SoT
