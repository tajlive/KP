# Workflow: Live trading & trades integrity

Bruk denne når **Klarpakke Live Trading & Trades Integrity Agent** skal «ordne alt» med sporbarhet.

## Fase A — Kartlegging (readonly)

- [ ] Grep: `from("trades")`, `from('trades')`, `trade_history`, `executeLiveTrade`, `executePaperTrade`, `ExecutorFactory`.
- [ ] Les `docs/ARCHITECTURE.md` (relevante avsnitt om trading).
- [ ] Noter alle **brukervendte** steder: handelshistorikk, dashboard, paper session, unified trading, bot session.
- [ ] Sammenlign **tier-gates**: `user_profiles.tier`, `useSubscription`, `get_user_entitlements`, `canAccessLiveAutoTrading`.

## Fase B — Database & RLS

- [ ] Finn RLS-policyer på `public.trades` (migrasjoner + Supabase MCP).
- [ ] Verifiser: innlogget bruker ser kun `user_id = auth.uid()` (eller ekvivalent).
- [ ] Hvis `trade_history` / legacy har data: beslutning — **migrer til `trades`** eller **les union** i én server action (dokumenter valg i `docs/trading/LIVE-TRADING-TRADES-INTEGRITY.md`).

## Fase C — Live path

- [ ] `ExecutorFactory.create` — tier + Binance; ingen bypass.
- [ ] `POST /api/trading/execute` (og beslektet) — auth + validering.
- [ ] Ingen hemmeligheter i `NEXT_PUBLIC_*` eller klientbundle.

## Fase D — Paper path & historikk

- [ ] `getRecentTrades` / handelshistorikk — `user_id`, limits, ev. paginering backlog.
- [ ] `realtime.setAuth` på trade-abonnement der det trengs.
- [ ] Konsistent **tap/vinn**-visning: `realized_pnl` dokumentert når den settes (paper vs live).

## Fase E — Bevis (kjør og lim output i PR/Linear)

- [ ] `npm run lint` && `npm run type-check` && `npm run test:unit`
- [ ] `npm run verify` (mot prod)
- [ ] Ev. `npm run test:e2e:critical:chromium` med testbruker
- [ ] Oppdater **§ Siste verifisering** i `docs/trading/LIVE-TRADING-TRADES-INTEGRITY.md` med dato og kommandoer.

## Fase F — Deploy

- [ ] Merge via PR → vent på **pr-check** + **deploy** workflow etter merge.
- [ ] Etter deploy: `curl -s https://www.klarpakke.no/api/health` → `healthy`.
