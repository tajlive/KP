# DB Performance Indexes — Trading-tabeller (2026-07-28)

Fullstendig eksempel på systematisk indeks-analyse av trading-tabellene, med SQL-migrasjon, BEFORE/AFTER-diff og forventet effekt.

## Analyse

### Eksisterende indekser (før)

| Tabell | Indekser |
|--------|----------|
| `trades` | `idx_trades_session(session_id, executed_at DESC)`, `idx_trades_user(user_id, executed_at DESC)`, `idx_trades_user_mode(user_id, mode, executed_at DESC)`, `idx_trades_idempotency(idempotency_key)`, `idx_trades_leader(leader_trade_id) WHERE leader_trade_id IS NOT NULL` |
| `trading_sessions` | `idx_sessions_user(user_id, status)`, `idx_sessions_user_mode(user_id, mode)`, `idx_sessions_heartbeat(last_heartbeat) WHERE active`, `idx_trading_sessions_smart_trader(user_id) WHERE smart_trader_enabled AND active`, `idx_unique_active_session(user_id, trading_pair) WHERE active` |
| `paper_trading_sessions` | `idx_paper_trading_sessions_user_id(user_id)` |
| `smart_trader_log` | `idx_smart_trader_log_session(session_id, created_at DESC)`, `idx_smart_trader_log_user(user_id, created_at DESC)` |
| `user_auto_trading_configs` | (ingen) |

### Spørringsmønstre funnet i koden

```sql
-- Dashboard: vis mine siste trades (trades)
SELECT * FROM trades WHERE user_id = $1 ORDER BY executed_at DESC;

-- Symbolhistorikk: vis trades for symbol (trades)
SELECT * FROM trades WHERE user_id = $1 AND trading_pair = $2 ORDER BY executed_at DESC;

-- Markedsoversikt: alle trades for et symbol (trades)
SELECT * FROM trades WHERE trading_pair = $1 ORDER BY executed_at DESC;

-- Sessionsliste: mine sesjoner nyeste først (trading_sessions)
SELECT * FROM trading_sessions WHERE user_id = $1 ORDER BY created_at DESC;

-- Globale lister: alle sesjoner (trading_sessions — admin)
SELECT * FROM trading_sessions ORDER BY created_at DESC;

-- Paper sessions: mine paper-sesjoner (paper_trading_sessions)
SELECT * FROM paper_trading_sessions WHERE user_id = $1 ORDER BY created_at DESC;

-- Event-statistikk: logg hendelser (smart_trader_log)
SELECT * FROM smart_trader_log WHERE event_type = $1 ORDER BY created_at DESC;

-- Aktiv config lookup (user_auto_trading_configs)
SELECT * FROM user_auto_trading_configs WHERE user_id = $1 AND is_enabled = true;
```

### Manglende indekser

| Spørringsmønster | Trenger indeks | Forventet effekt |
|-----------------|----------------|------------------|
| `trades WHERE user_id + trading_pair ORDER BY executed_at` | `(user_id, trading_pair, executed_at DESC)` | ~90% reduksjon (seq-scan → index-scan) |
| `trades WHERE trading_pair ORDER BY executed_at` | `(trading_pair, executed_at DESC)` | ~85% reduksjon på markedsoversikter |
| `trading_sessions WHERE user_id ORDER BY created_at` | `(user_id, created_at DESC)` | ~70% reduksjon på sessionsliste |
| `trading_sessions ORDER BY created_at` (global) | `(created_at DESC)` | ~80% reduksjon på admin/globale lister |
| `paper_trading_sessions WHERE user_id ORDER BY created_at` | `(user_id, created_at DESC)` | ~75% reduksjon på paper session oversikt |
| `smart_trader_log WHERE event_type ORDER BY created_at` | `(event_type, created_at DESC)` | ~60% reduksjon på event-statistikk |
| `user_auto_trading_configs WHERE user_id AND is_enabled=true` | `(user_id, is_enabled) WHERE is_enabled = true` | ~50% reduksjon på config lookup |

## Migrasjon-SQL (idempotent)

```sql
BEGIN;

-- 1. trading_sessions
CREATE INDEX IF NOT EXISTS idx_trading_sessions_user_created
  ON public.trading_sessions(user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_trading_sessions_created
  ON public.trading_sessions(created_at DESC);

-- 2. trades
CREATE INDEX IF NOT EXISTS idx_trades_user_symbol_executed
  ON public.trades(user_id, trading_pair, executed_at DESC);

CREATE INDEX IF NOT EXISTS idx_trades_symbol_executed
  ON public.trades(trading_pair, executed_at DESC);

-- 3. paper_trading_sessions
CREATE INDEX IF NOT EXISTS idx_paper_sessions_user_created
  ON public.paper_trading_sessions(user_id, created_at DESC);

-- 4. smart_trader_log
CREATE INDEX IF NOT EXISTS idx_smart_trader_log_event
  ON public.smart_trader_log(event_type, created_at DESC);

-- 5. user_auto_trading_configs (hvis tabellen finnes)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'user_auto_trading_configs'
  ) THEN
    CREATE INDEX IF NOT EXISTS idx_user_auto_trading_configs_active
      ON public.user_auto_trading_configs(user_id, is_enabled)
      WHERE is_enabled = true;
  END IF;
END $$;

COMMIT;
```
