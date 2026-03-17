# Supabase Realtime i Klarpakke

## Status

Realtime (postgres_changes) er skrudd på for disse tabellene via `ALTER PUBLICATION supabase_realtime ADD TABLE ...`:

| Tabell | Migrasjon | Brukes av |
|--------|-----------|------------|
| coin_prices | 20260307161500 | usePrices (priser) |
| copy_trade_log, copy_trading_configs | 20260304000002 | CopyTradingDashboard |
| user_strategies, auto_trading_sessions, trade_history, auto_trading_trades, strategy_logs | 20260304000001 | Bot-status, auto-trading |
| **trading_sessions** | 20260317180000 | PaperTradingList, PaperTradingSessionDetail, usePulseData, BotStatusCard |
| **trades** | 20260317180000 | PaperTradingSessionDetail, useTrading, trading-api |
| **notifications** | 20260317180000 | NotificationTray, useNotifications |
| **user_profiles** | 20260317180000 | Admin (ClientAdminDashboard, ClientCampaign) |
| **beta_signups** | 20260317180000 | Admin (AdminDashboard) |

## Gratisnivå (Free tier)

- **200 samtidige Realtime-tilkoblinger** inkludert.
- **2 millioner meldinger/måned** inkludert.
- Begrensninger: 100 meldinger/s, 100 channel joins/s, 100 kanaler per tilkobling.

Kilde: [Realtime Limits](https://supabase.com/docs/guides/realtime/limits), [Realtime Pricing](https://supabase.com/docs/guides/realtime/pricing).

## Anbefalinger

1. **RLS**  
   Realtime respekterer Row Level Security. Tabellene som er i publikasjonen bør ha RLS med policy som tillater `SELECT` (eller nødvendig tilgang) for de rollene som abonnerer. Uten policy får brukere ingen events.

2. **Bruk filter der det finnes**  
   Unngå å abonnere på hele tabellen når du kan filtrere (f.eks. `filter: 'user_id=eq.${userId}'` på `trading_sessions`), slik at færre rader sendes og du holder deg innenfor meldingskvoten.

3. **Én kanal per bruk/kontekt**  
   Bruk ulike kanalnavn per side/komponent (f.eks. `paper-trading-sessions`, `session-${id}`) og rydd opp med `supabase.removeChannel(channel)` i cleanup/useEffect return, så du ikke har for mange åpne kanaler.

4. **Overvåk bruk**  
   I Supabase Dashboard: **Project → Reports → Realtime** for peak connections og meldinger. Ved nær 200 samtidige brukere bør du vurdere Pro eller redusere antall åpne Realtime-kanaler.

5. **Ny tabell til Realtime**  
   Kjør i SQL Editor eller ny migrasjon:
   ```sql
   ALTER PUBLICATION supabase_realtime ADD TABLE din_tabell;
   ```
   Alternativt: **Database → Publications → supabase_realtime** og slå på tabellen der.

## Kjøre migrasjonen (Realtime på kjernetabeller)

Migrasjonen er idempotent: den legger bare til tabeller som ikke allerede er i `supabase_realtime`.

### 1. MCP (Cursor med Supabase MCP)

Sett `SUPABASE_ACCESS_TOKEN` (eller `--access-token` for MCP-serveren), deretter:

- **apply_migration:** `name`: `enable_realtime_core_tables`, `query`: innholdet i `supabase/migrations/20260317180000_enable_realtime_core_tables.sql`.
- Eller **execute_sql:** lim inn DO $$ ... END $$; fra samme fil.

### 2. psql (DATABASE_URL)

```bash
# Sett DATABASE_URL i .env.local (PostgreSQL connection string fra Supabase Dashboard → Settings → Database)
./scripts/run-realtime-migration.sh
```

Eller manuelt: `psql "$DATABASE_URL" -f supabase/migrations/20260317180000_enable_realtime_core_tables.sql`

### 3. Supabase Dashboard

**SQL Editor** → lim inn innholdet i `supabase/migrations/20260317180000_enable_realtime_core_tables.sql` → Run.

### 4. CLI (db push) – når lokal og remote er synkronisert

```bash
npm run db:push
```

Hvis du får «Remote migration versions not found in local», har remote migrasjoner som ikke finnes lokalt. Da må du enten kjøre SQL over (1–3) eller reparere historikk (se Supabase docs) først.
