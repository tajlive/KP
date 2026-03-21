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

| Dato       | Utført av      | Kommandoer / lenker                                                                                                |
| ---------- | -------------- | ------------------------------------------------------------------------------------------------------------------ |
| 2026-03-20 | Cursor (agent) | `npm run verify` → ALL TESTS PASSED; handelshistorikk: polling 20s for live liste — se `USER-TRADES-LIVE-PROOF.md` |

## Relatert dokumentasjon

- **`docs/trading/USER-TRADES-LIVE-PROOF.md`** — brukerguide: hvor du ser handler, live, SQL-bevis, `verify`
- `docs/MCP-CLI-CI-API.md` — MCP, CLI, CI, Playwright env
- `docs/ARCHITECTURE.md` — overordnet flyt
- `docs/CRON-SOURCE-OF-TRUTH.md` — cron ikke på Vercel som SoT
