# Realtime for trading_sessions

## Krav

For at «Mine sesjoner»-listen oppdateres uten manuell refresh, må `trading_sessions` være publisert i Supabase Realtime.

## Sjekkliste

1. **Supabase Dashboard** → Project Settings → API → Realtime er aktivert for prosjektet.
2. **Database** → Replication: Tabellen `trading_sessions` må være med i Realtime-publikasjonen.
   - Standard publikasjon: `supabase_realtime` (eller tilsvarende).
   - Legg til: `ALTER PUBLICATION supabase_realtime ADD TABLE trading_sessions;` (eller via Dashboard → Database → Replication).
3. **RLS**: Realtime respekterer RLS. Brukere får kun events for rader de har SELECT tilgang til (f.eks. `user_id = auth.uid()`).

## Kode som bruker det

- `PaperTradingList`: abonnerer på `postgres_changes` for `trading_sessions` med filter `user_id=eq.${userId}` og kaller `router.refresh()` ved endring.
- `PaperTradingSessionDetail`: abonnerer på `trades` (INSERT) og `trading_sessions` (UPDATE) for én session.

## Ved problemer

- Sjekk at Realtime-publikasjonen inkluderer både `trading_sessions` og `trades`.
- I nettleser: Network-fane, filter på «realtime» eller «websocket» for å se om forbindelsen opprettes.
- Supabase Dashboard → Logs → Realtime for feil.
