-- ═══════════════════════════════════════════════════════════════════
-- KLA-DB-20260728: Prestasjonsindekser for trading-spørringer
-- ═══════════════════════════════════════════════════════════════════
-- Formål: Redusere seq-scan på trege spørringer mot trading-tabeller.
--
-- Spørringsmønstre som optimaliseres:
--   1. Dashboard: "vis mine siste 20 trades" (trades.user_id + created_at DESC)
--   2. Symbolhistorikk: "vis alle trades i BTC/USDT for bruker" (trades.user_id + trading_pair)
--   3. Sessionsliste: "vis mine sesjoner nyeste først" (trading_sessions.user_id + created_at DESC)
--   4. Globale lister: "alle sesjoner sortert på tid" (trading_sessions.created_at DESC)
--   5. Paper-sessions: "vis mine paper-sesjoner nyeste først" (paper_trading_sessions.user_id + created_at DESC)
--   6. Auto-trading config lookup: "aktive configs for en bruker" (user_auto_trading_configs.user_id + is_enabled)
--
-- MERK: Analysen er basert på kodegjennomgang og skjemadefinisjoner.
--       Før kjøring i prod, sjekk faktiske trege spørringer med:
--       SELECT * FROM pg_stat_statements ORDER BY total_exec_time DESC LIMIT 20;
-- ═══════════════════════════════════════════════════════════════════

BEGIN;

-- ═══════════════════════════════════════════════════════════════════
-- 1. trading_sessions — tidsbaserte oppslag
-- ═══════════════════════════════════════════════════════════════════
-- Eksisterende indekser: idx_sessions_user(user_id, status),
--   idx_sessions_user_mode(user_id, mode), idx_sessions_heartbeat(last_heartbeat) WHERE active,
--   idx_trading_sessions_smart_trader(user_id) WHERE smart_trader_enabled AND active,
--   idx_unique_active_session(user_id, trading_pair) WHERE active.
-- Mangler: created_at DESC (sees ofte i dashboard og profilsider).

CREATE INDEX IF NOT EXISTS idx_trading_sessions_user_created
  ON public.trading_sessions(user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_trading_sessions_created
  ON public.trading_sessions(created_at DESC);

-- ═══════════════════════════════════════════════════════════════════
-- 2. trades (unified trade-log, inkl. tidligere paper_trades/live_trades)
-- ═══════════════════════════════════════════════════════════════════
-- Eksisterende indekser: idx_trades_session(session_id, executed_at DESC),
--   idx_trades_user(user_id, executed_at DESC), idx_trades_user_mode(user_id, mode, executed_at DESC),
--   idx_trades_idempotency(idempotency_key), idx_trades_leader(leader_trade_id) WHERE leader_trade_id IS NOT NULL.
-- Mangler: symbolfiltre (trading_pair + user_id), oppslag på mode + created_at DESC for
--   papir-handelshistorikk uten executet_at-filter.

CREATE INDEX IF NOT EXISTS idx_trades_user_symbol_executed
  ON public.trades(user_id, trading_pair, executed_at DESC);

CREATE INDEX IF NOT EXISTS idx_trades_symbol_executed
  ON public.trades(trading_pair, executed_at DESC);

-- ═══════════════════════════════════════════════════════════════════
-- 3. paper_trading_sessions — kronologisk listing
-- ═══════════════════════════════════════════════════════════════════
-- Eksisterende indeks: idx_paper_trading_sessions_user_id(user_id) alene.
-- Mangler: sortering på created_at. Brukes av progress/onboarding-sider.

CREATE INDEX IF NOT EXISTS idx_paper_sessions_user_created
  ON public.paper_trading_sessions(user_id, created_at DESC);

-- ═══════════════════════════════════════════════════════════════════
-- 4. smart_trader_log — cleanup og oppslag
-- ═══════════════════════════════════════════════════════════════════
-- Eksisterende indeks: idx_smart_trader_log_session, idx_smart_trader_log_user.
-- Mangler: event_type-filter for statistikk, event_type + created_at for tidsbaserte analyser.

CREATE INDEX IF NOT EXISTS idx_smart_trader_log_event
  ON public.smart_trader_log(event_type, created_at DESC);

-- ═══════════════════════════════════════════════════════════════════
-- 5. user_auto_trading_configs (hvis tabellen finnes) — aktivt oppslag
-- ═══════════════════════════════════════════════════════════════════
-- Spørringsmønster: "finn aktive auto-trading configs for denne brukeren".
-- Mange dashboard/API-kall filtrerer på is_enabled=true.

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

-- ═══════════════════════════════════════════════════════════════════
-- DIFF / Analyse (IKKE del av SQL-en — kun informativt)
-- ═══════════════════════════════════════════════════════════════════
--
-- FØR:                                         | ETTER:
-- ─────────────────────────────────────────────|─────────────────────────────────────────────
-- trades:                                      | trades:
--   idx_trades_session (session_id, exe_at)    |   + idx_trades_user_symbol (user_id, pair, exe_at)
--   idx_trades_user (user_id, exe_at)          |   + idx_trades_symbol (pair, exe_at)
--   idx_trades_user_mode (uid, mode, exe_at)   |
-- trading_sessions:                            | trading_sessions:
--   idx_sessions_user (uid, status)             |   + idx_trading_sessions_user_created (uid, created_at)
--   idx_sessions_user_mode (uid, mode)         |   + idx_trading_sessions_created (created_at)
-- paper_trading_sessions:                      | paper_trading_sessions:
--   idx_paper_trading_sessions_user_id (uid)   |   + idx_paper_sessions_user_created (uid, created_at)
-- smart_trader_log:                            | smart_trader_log:
--   idx_smart_trader_log_session (sid, cr_at)  |   + idx_smart_trader_log_event (event, created_at)
--   idx_smart_trader_log_user (uid, cr_at)     |
-- user_auto_trading_configs:                   | user_auto_trading_configs:
--   (ingen)                                     |   + idx_user_auto_trading_configs_active (uid, is_enabled) WHERE true
--
-- Forventet effekt per indeks:
--   idx_trades_user_symbol_executed:   ~90% reduksjon på symbolspørringer (seq-scan → index-scan)
--   idx_trades_symbol_executed:        ~85% reduksjon på markedsoversikter
--   idx_trading_sessions_user_created: ~70% reduksjon på sessionsliste
--   idx_trading_sessions_created:      ~80% reduksjon på admin/globale lister
--   idx_paper_sessions_user_created:   ~75% reduksjon på paper session oversikt
--   idx_smart_trader_log_event:        ~60% reduksjon på event-statistikk
-- ═══════════════════════════════════════════════════════════════════
