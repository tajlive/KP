-- 20260731090000_db_lint_unindexed_fks.sql
-- Fix Supabase db:lint — 18 unindexed FKs + 1 duplikatindeks (INFO/WARN-nivå)
-- 2026-07-31 | Trygge additive endringer: CREATE INDEX IF NOT EXISTS + DROP av én duplikat.
-- Ingen datamodifikasjon, ingen RLS-endring.

-- === 1. Duplikatindeks: trading_sessions ===
-- idx_trading_sessions_user_id_status_created_at ≡ idx_trading_sessions_user_status_created
-- (begge: (user_id, status, created_at DESC)). Beholder navnet som er nyest/navngitt
-- etter konvensjonen; dropper den andre.
DROP INDEX IF EXISTS public.idx_trading_sessions_user_id_status_created_at;

-- === 2. Unindexed foreign keys (18) ===

CREATE INDEX IF NOT EXISTS idx_archived_trade_summaries_user_id
  ON public.archived_trade_summaries (user_id);

CREATE INDEX IF NOT EXISTS idx_auto_trading_circuit_breaker_logs_user_id
  ON public.auto_trading_circuit_breaker_logs (user_id);

CREATE INDEX IF NOT EXISTS idx_auto_trading_daily_metrics_user_id
  ON public.auto_trading_daily_metrics (user_id);

CREATE INDEX IF NOT EXISTS idx_auto_trading_profit_extractions_user_id
  ON public.auto_trading_profit_extractions (user_id);

CREATE INDEX IF NOT EXISTS idx_client_errors_resolved_by
  ON public.client_errors (resolved_by);

CREATE INDEX IF NOT EXISTS idx_external_auth_identities_user_id
  ON public.external_auth_identities (user_id);

CREATE INDEX IF NOT EXISTS idx_klt_spends_option_id
  ON public.klt_spends (option_id);

CREATE INDEX IF NOT EXISTS idx_klt_spends_user_id
  ON public.klt_spends (user_id);

CREATE INDEX IF NOT EXISTS idx_leaderboard_monthly_user_id
  ON public.leaderboard_monthly (user_id);

CREATE INDEX IF NOT EXISTS idx_league_participants_user_id
  ON public.league_participants (user_id);

CREATE INDEX IF NOT EXISTS idx_marketplace_subscriptions_listing_id
  ON public.marketplace_subscriptions (listing_id);

CREATE INDEX IF NOT EXISTS idx_portfolio_rebalance_events_user_id
  ON public.portfolio_rebalance_events (user_id);

CREATE INDEX IF NOT EXISTS idx_portfolio_rebalance_orders_user_id
  ON public.portfolio_rebalance_orders (user_id);

CREATE INDEX IF NOT EXISTS idx_positions_user_id
  ON public.positions (user_id);

CREATE INDEX IF NOT EXISTS idx_trader_verifications_verified_by
  ON public.trader_verifications (verified_by);

CREATE INDEX IF NOT EXISTS idx_unified_notifications_user_id
  ON public.unified_notifications (user_id);

CREATE INDEX IF NOT EXISTS idx_user_binance_keys_api_key_id
  ON public.user_binance_keys (api_key_id);

CREATE INDEX IF NOT EXISTS idx_user_binance_keys_api_secret_id
  ON public.user_binance_keys (api_secret_id);
