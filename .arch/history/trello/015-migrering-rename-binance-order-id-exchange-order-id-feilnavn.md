# Migrering: rename binance_order_id → exchange_order_id (feilnavn, inneholder Kraken-IDer)

- **Trello:** kort #15 · liste «🔄 Under arbeid» · opprettet 2026-08-09
- **Kilde:** https://trello.com/c/6a77f2c6 (board 6a77a7ac73020977260a3931)
- **Klassifisering:** Gruppe B — dokumentasjon (ikke flyttet til Linear)

## Innhold

**Funnet under Binance-rydding 2026-08-09 (Kimi) — siste gjenstående migrasjonsitem:**

Kolonnene `trades.binance_order_id` og `pending_orders.binance_order_id` i prod er feilnavn: de **skriver og leser nå Kraken-ordre-IDer** (`tick/route.ts` skriver `liveResult.krakenOrderId` dit, `cron/reconcile` leser den). 11 gamle rader i trades har historiske Binance-IDer (behold som historikk).

**Foreslått SQL-diff (idempotent, IKKE kjørt — krever Toms godkjenning):**

```sql
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns
             WHERE table_schema='public' AND table_name='trades' AND column_name='binance_order_id') THEN
    ALTER TABLE public.trades RENAME COLUMN binance_order_id TO exchange_order_id;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns
             WHERE table_schema='public' AND table_name='pending_orders' AND column_name='binance_order_id') THEN
    ALTER TABLE public.pending_orders RENAME COLUMN binance_order_id TO exchange_order_id;
  END IF;
END $$;
```

**Kode som må oppdateres (6 steder):**

- src/app/api/cron/tick/route.ts (linje ~1657, ~1803) — skriver krakenOrderId
- src/app/api/cron/reconcile/route.ts (linje ~27) — leser orderId
- src/lib/trading/reconciliation.ts (linje ~14, ~50)
- src/lib/trading/core/execute-trade.ts (linje ~651)
- src/lib/shared.ts (linje ~96), src/lib/auto-trading/types.ts (linje ~231), src/types/trading.ts (linje ~202)
- Regenerer database.types.ts etter migrasjon (src/types/ + src/lib/supabase/ + features/trading-cockpit/)

Alternativ enklere navn: `exchange_order_id` (fremtidssikker hvis OKX live kommer).

Relatert: https://trello.com/c/ogGw5kvf + https://trello.com/c/iT9V7HA2
