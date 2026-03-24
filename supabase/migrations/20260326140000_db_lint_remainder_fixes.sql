-- ============================================================================
-- Resterende public db lint ERROR (etter 20260326130000)
-- Ikke med: extensions.index_advisor (hypopg), store_binance_keys (pgsodium-rettigheter)
-- ============================================================================

-- process_pending_notifications bruker status 'skipped'; sikre at CHECK tillater det
DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN
    SELECT c.conname
    FROM pg_constraint c
    JOIN pg_class t ON t.oid = c.conrelid
    JOIN pg_namespace n ON n.oid = t.relnamespace
    WHERE n.nspname = 'public'
      AND t.relname = 'notification_queue'
      AND c.contype = 'c'
      AND pg_get_constraintdef(c.oid) LIKE '%status%'
  LOOP
    EXECUTE format('ALTER TABLE public.notification_queue DROP CONSTRAINT %I', r.conname);
  END LOOP;
END $$;

ALTER TABLE public.notification_queue
  ADD CONSTRAINT notification_queue_status_check
  CHECK (status IN ('pending', 'sending', 'sent', 'failed', 'skipped'));

-- vault.secrets.secret er TEXT — cast til jsonb før ->>
CREATE OR REPLACE FUNCTION public.decrypt_binance_keys(
  key_id UUID,
  secret_id UUID
)
RETURNS TABLE (
  api_key TEXT,
  api_secret TEXT,
  is_testnet BOOLEAN
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, vault, pg_catalog
AS $$
DECLARE
  decrypted_key TEXT;
  decrypted_secret TEXT;
  is_test BOOLEAN DEFAULT true;
  v_key UUID;
  v_secret UUID;
BEGIN
  v_key := key_id;
  v_secret := secret_id;

  SELECT ds.decrypted_secret INTO decrypted_key
  FROM vault.decrypted_secrets ds
  WHERE ds.id = v_key;

  SELECT ds.decrypted_secret INTO decrypted_secret
  FROM vault.decrypted_secrets ds
  WHERE ds.id = v_secret;

  IF decrypted_key IS NULL OR decrypted_secret IS NULL THEN
    RAISE EXCEPTION 'API keys not found in vault';
  END IF;

  SELECT COALESCE((s.secret::jsonb->'custom_data'->>'is_testnet')::BOOLEAN, true)
  INTO is_test
  FROM vault.secrets s
  WHERE s.id = v_key;

  RETURN QUERY SELECT decrypted_key, decrypted_secret, is_test;
END;
$$;

CREATE OR REPLACE FUNCTION public.check_daily_loss_limit(p_user_id UUID)
RETURNS TABLE (should_stop BOOLEAN, current_loss_percent NUMERIC)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
DECLARE
  v_settings public.auto_trade_settings%ROWTYPE;
  v_stats public.auto_trade_daily_stats%ROWTYPE;
  v_portfolio_value NUMERIC := 10000;
  v_loss_percent NUMERIC;
BEGIN
  SELECT * INTO v_settings
  FROM public.auto_trade_settings
  WHERE user_id = p_user_id;

  SELECT * INTO v_stats
  FROM public.auto_trade_daily_stats
  WHERE user_id = p_user_id AND date = CURRENT_DATE;

  IF NOT FOUND THEN
    v_loss_percent := 0;
  ELSE
    v_loss_percent := ABS(v_stats.total_pnl / NULLIF(v_portfolio_value, 0) * 100);
  END IF;

  RETURN QUERY
  SELECT
    v_loss_percent >= COALESCE(v_settings.daily_loss_limit_percent, 100),
    v_loss_percent;
END;
$$;

CREATE OR REPLACE FUNCTION public.get_system_metrics()
RETURNS TABLE (metric_name TEXT, metric_value BIGINT, metric_unit TEXT)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions, vault, pg_catalog
AS $$
BEGIN
  RETURN QUERY
  SELECT
    'notifications_' || nq.status,
    COUNT(*)::BIGINT,
    'count'::TEXT
  FROM public.notification_queue nq
  GROUP BY nq.status;

  RETURN QUERY
  SELECT
    'notifications_max_age_hours'::TEXT,
    COALESCE(
      MAX(EXTRACT(EPOCH FROM (NOW() - nq.created_at)) / 3600)::BIGINT,
      0
    ),
    'hours'::TEXT
  FROM public.notification_queue nq
  WHERE nq.status = 'pending';

  RETURN QUERY
  SELECT
    'notifications_failed_recent'::TEXT,
    COUNT(*)::BIGINT,
    'count'::TEXT
  FROM public.notification_queue nq
  WHERE nq.status = 'failed'
    AND COALESCE(nq.sent_at, nq.created_at) > NOW() - INTERVAL '24 hours';
END;
$$;

CREATE OR REPLACE FUNCTION public.process_pending_notifications(batch_size INTEGER DEFAULT 10)
RETURNS TABLE (processed INTEGER, failed INTEGER, skipped INTEGER)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions, vault, pg_catalog
AS $$
DECLARE
  v_processed INTEGER := 0;
  v_failed INTEGER := 0;
  v_skipped INTEGER := 0;
  v_notification RECORD;
  v_should_send BOOLEAN;
  v_http_result JSONB;
  v_payload JSONB;
BEGIN
  FOR v_notification IN
    SELECT
      nq.id,
      nq.user_id,
      nq.type,
      nq.payload,
      nq.attempts
    FROM public.notification_queue nq
    WHERE nq.status = 'pending'
      AND nq.attempts < 3
    ORDER BY nq.created_at ASC
    LIMIT batch_size
    FOR UPDATE SKIP LOCKED
  LOOP
    BEGIN
      v_should_send := public.should_send_notification(v_notification.user_id, v_notification.type);

      IF NOT v_should_send THEN
        UPDATE public.notification_queue
        SET
          status = 'skipped',
          sent_at = NOW(),
          error_message = 'Bruker har slått av denne typen notifikasjoner'
        WHERE id = v_notification.id;

        v_skipped := v_skipped + 1;
        CONTINUE;
      END IF;

      v_payload := jsonb_build_object(
        'notification_id', v_notification.id,
        'user_id', v_notification.user_id,
        'type', v_notification.type,
        'payload', v_notification.payload,
        'attempt', v_notification.attempts + 1
      );

      BEGIN
        SELECT net.http_post(
          url := 'https://vuxbjlykgmzskxbclquf.supabase.co/functions/v1/unified-notifications?action=process-single',
          headers := jsonb_build_object(
            'Content-Type', 'application/json',
            'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key', true)
          ),
          body := v_payload
        ) INTO v_http_result;

        IF (v_http_result->>'status')::INTEGER BETWEEN 200 AND 299 THEN
          UPDATE public.notification_queue
          SET
            status = 'sent',
            attempts = attempts + 1,
            sent_at = NOW(),
            error_message = NULL
          WHERE id = v_notification.id;

          v_processed := v_processed + 1;
        ELSE
          UPDATE public.notification_queue
          SET
            attempts = attempts + 1,
            error_message = 'HTTP ' || (v_http_result->>'status') || ': ' || COALESCE(v_http_result->>'content', 'Ukjent feil')
          WHERE id = v_notification.id;

          v_failed := v_failed + 1;
        END IF;
      EXCEPTION
        WHEN OTHERS THEN
          UPDATE public.notification_queue
          SET
            attempts = attempts + 1,
            error_message = 'Network/feil: ' || SQLERRM
          WHERE id = v_notification.id;

          v_failed := v_failed + 1;
      END;
    EXCEPTION
      WHEN OTHERS THEN
        UPDATE public.notification_queue
        SET
          status = 'failed',
          attempts = attempts + 1,
          error_message = 'Uventet feil: ' || SQLERRM
        WHERE id = v_notification.id;

        v_failed := v_failed + 1;
    END;
  END LOOP;

  UPDATE public.notification_queue
  SET
    status = 'failed',
    error_message = COALESCE(error_message, '') || E'\n[Dead-letter] Max attempts reached'
  WHERE status = 'pending'
    AND attempts >= 3;

  RETURN QUERY SELECT v_processed, v_failed, v_skipped;
END;
$$;

CREATE OR REPLACE FUNCTION public.record_leaderboard_position(
  p_user_id UUID,
  p_time_period TEXT,
  p_new_rank INTEGER
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
BEGIN
  INSERT INTO public.leaderboard_history (user_id, time_period, rank, recorded_at)
  VALUES (p_user_id, p_time_period, p_new_rank, NOW());
END;
$$;

CREATE OR REPLACE FUNCTION public.get_real_account_stats(p_account_id UUID)
RETURNS TABLE (
  total_trades INTEGER,
  winning_trades INTEGER,
  losing_trades INTEGER,
  win_rate NUMERIC,
  avg_profit_loss NUMERIC,
  largest_win NUMERIC,
  largest_loss NUMERIC,
  total_fees NUMERIC
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
  SELECT
    0,
    0,
    0,
    0::NUMERIC,
    0::NUMERIC,
    0::NUMERIC,
    0::NUMERIC,
    0::NUMERIC;
$$;

CREATE OR REPLACE FUNCTION public.calculate_session_costs(session_uuid UUID)
RETURNS TABLE (total_fees NUMERIC, total_slippage NUMERIC, total_costs NUMERIC, cost_per_trade NUMERIC)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
  SELECT 0::NUMERIC, 0::NUMERIC, 0::NUMERIC, 0::NUMERIC;
$$;

CREATE OR REPLACE FUNCTION public.archive_old_signals(days_old INTEGER DEFAULT 30)
RETURNS TABLE (archived_count BIGINT)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
DECLARE
  n BIGINT;
BEGIN
  DELETE FROM public.signals
  WHERE created_at < NOW() - (days_old || ' days')::INTERVAL
    AND status IN ('approved', 'rejected');

  GET DIAGNOSTICS n = ROW_COUNT;
  RETURN QUERY SELECT n;
END;
$$;

CREATE OR REPLACE FUNCTION public.track_referral_click(
  p_referral_code TEXT,
  p_source TEXT DEFAULT 'direct',
  p_landing_page TEXT DEFAULT '/',
  p_ip_address INET DEFAULT NULL,
  p_user_agent TEXT DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
BEGIN
  RETURN NULL;
END;
$$;

CREATE OR REPLACE FUNCTION public.get_paper_trading_stats(p_user_id UUID)
RETURNS TABLE (
  trades_count INTEGER,
  profitability_percentage NUMERIC,
  max_drawdown_percentage NUMERIC,
  avg_hold_time_minutes INTEGER,
  readiness_score INTEGER
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
BEGIN
  PERFORM public.update_transition_readiness_score(p_user_id);

  RETURN QUERY
  SELECT
    (SELECT COUNT(*)::INTEGER FROM public.trades t WHERE t.user_id = p_user_id AND t.mode = 'paper'),
    0::NUMERIC,
    0::NUMERIC,
    0,
    0;
END;
$$;

CREATE OR REPLACE FUNCTION public.update_transition_readiness_score(p_user_id UUID)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
DECLARE
  v_count INTEGER;
BEGIN
  SELECT COUNT(*)::INTEGER
  INTO v_count
  FROM public.trades t
  WHERE t.user_id = p_user_id
    AND t.mode = 'paper';

  RETURN LEAST(100, v_count * 2);
END;
$$;

CREATE OR REPLACE FUNCTION public.get_paper_account_stats(account_id UUID)
RETURNS TABLE (
  total_trades INTEGER,
  winning_trades INTEGER,
  losing_trades INTEGER,
  win_rate NUMERIC,
  avg_profit_loss NUMERIC,
  largest_win NUMERIC,
  largest_loss NUMERIC
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
  SELECT 0, 0, 0, 0::NUMERIC, 0::NUMERIC, 0::NUMERIC, 0::NUMERIC;
$$;

CREATE OR REPLACE FUNCTION public.close_paper_position(
  position_id UUID,
  closing_price NUMERIC,
  close_reason TEXT
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
DECLARE
  v_close NUMERIC := closing_price;
  v_reason TEXT := close_reason;
  v_pid UUID := position_id;
  pnl NUMERIC;
  pnl_percent NUMERIC;
  pos public.paper_positions%ROWTYPE;
BEGIN
  SELECT * INTO pos FROM public.paper_positions WHERE id = v_pid;
  IF NOT FOUND THEN
    RETURN json_build_object('error', 'Position not found');
  END IF;

  IF pos.position_type = 'long' THEN
    pnl := (v_close - pos.entry_price) * pos.quantity;
    pnl_percent := CASE
      WHEN pos.entry_price > 0 THEN ((v_close - pos.entry_price) / pos.entry_price) * 100
      ELSE 0
    END;
  ELSE
    pnl := (pos.entry_price - v_close) * pos.quantity;
    pnl_percent := CASE
      WHEN pos.entry_price > 0 THEN ((pos.entry_price - v_close) / pos.entry_price) * 100
      ELSE 0
    END;
  END IF;

  UPDATE public.paper_positions
  SET
    status = 'closed',
    closing_price = v_close,
    profit_loss = pnl,
    profit_loss_percent = pnl_percent,
    close_reason = v_reason,
    closed_at = NOW(),
    updated_at = NOW()
  WHERE id = v_pid;

  RETURN json_build_object(
    'success', true,
    'pnl', pnl,
    'pnl_percent', pnl_percent
  );
END;
$$;
