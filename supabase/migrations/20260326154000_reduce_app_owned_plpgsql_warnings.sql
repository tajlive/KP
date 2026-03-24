-- Reduce app-owned plpgsql/db-lint warnings.
-- Intentionally does not change extensions.* or pgsodium-related functions.

CREATE OR REPLACE FUNCTION public.can_create_strategy(
  p_user_id UUID,
  p_trading_mode TEXT
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
DECLARE
  v_tier_slug TEXT;
  v_max_strategies INTEGER;
  v_current_count INTEGER;
BEGIN
  SELECT tier_slug INTO v_tier_slug
  FROM subscriptions
  WHERE user_id = p_user_id AND status = 'active'
  ORDER BY created_at DESC
  LIMIT 1;

  IF v_tier_slug IS NULL THEN
    v_tier_slug := 'student';
  END IF;

  IF p_trading_mode = 'live' AND v_tier_slug = 'student' THEN
    RETURN false;
  END IF;

  SELECT auto_trade_max_strategies INTO v_max_strategies
  FROM public.get_user_entitlements(p_user_id);

  IF v_max_strategies = -1 THEN
    RETURN true;
  END IF;

  SELECT COUNT(*) INTO v_current_count
  FROM public.user_strategies
  WHERE user_id = p_user_id AND is_active = true;

  RETURN v_current_count < v_max_strategies;
END;
$$;

CREATE OR REPLACE FUNCTION public.increment_followers(session_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
BEGIN
  PERFORM session_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.place_paper_trade_with_slippage(
  p_user_id UUID,
  p_symbol VARCHAR,
  p_side VARCHAR,
  p_order_type VARCHAR,
  p_amount NUMERIC,
  p_requested_price NUMERIC
)
RETURNS TABLE (
  trade_id UUID,
  execution_price NUMERIC,
  slippage_bps NUMERIC,
  slippage_amount NUMERIC
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
DECLARE
  v_trade_id UUID;
  v_exec_price NUMERIC;
  v_slippage_bps NUMERIC;
  v_slippage_amt NUMERIC;
  v_session_id UUID;
BEGIN
  SELECT ts.id
  INTO v_session_id
  FROM public.trading_sessions ts
  WHERE ts.user_id = p_user_id
    AND ts.mode = 'paper'
    AND ts.status = 'active'
  ORDER BY ts.started_at DESC NULLS LAST
  LIMIT 1;

  IF v_session_id IS NULL THEN
    RAISE EXCEPTION 'no_active_paper_session';
  END IF;

  SELECT
    s.execution_price,
    s.slippage_bps,
    s.slippage_amount
  INTO v_exec_price, v_slippage_bps, v_slippage_amt
  FROM public.calculate_paper_slippage(
    p_symbol, p_side, p_order_type, p_amount, p_requested_price
  ) AS s
  LIMIT 1;

  INSERT INTO public.trades (
    session_id,
    user_id,
    mode,
    trading_pair,
    side,
    order_type,
    quantity,
    price,
    total_value,
    fee,
    status,
    executed_at
  )
  VALUES (
    v_session_id,
    p_user_id,
    'paper',
    p_symbol,
    p_side,
    p_order_type,
    p_amount,
    v_exec_price,
    p_amount * v_exec_price,
    0,
    'filled',
    NOW()
  )
  RETURNING id INTO v_trade_id;

  RETURN QUERY
  SELECT v_trade_id, v_exec_price, v_slippage_bps, v_slippage_amt;
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
  v_http_request_id BIGINT;
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
        ) INTO v_http_request_id;

        IF v_http_request_id IS NOT NULL THEN
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
            error_message = 'HTTP request id mangler'
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

CREATE OR REPLACE FUNCTION public.remove_binance_keys(p_user_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions, vault, pg_catalog
AS $$
DECLARE
  v_api_key_id TEXT;
  v_api_secret_id TEXT;
BEGIN
  SELECT
    binance_api_key_id::TEXT,
    binance_api_secret_id::TEXT
  INTO v_api_key_id, v_api_secret_id
  FROM public.user_profiles
  WHERE id = p_user_id;

  IF v_api_key_id ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$' THEN
    DELETE FROM vault.secrets WHERE id = v_api_key_id::UUID;
  END IF;

  IF v_api_secret_id ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$' THEN
    DELETE FROM vault.secrets WHERE id = v_api_secret_id::UUID;
  END IF;

  UPDATE public.user_profiles
  SET
    binance_api_key_id = NULL,
    binance_api_secret_id = NULL,
    binance_connected = false,
    updated_at = NOW()
  WHERE id = p_user_id;

  RETURN true;
END;
$$;

CREATE OR REPLACE FUNCTION public.send_push_to_user(
  user_uuid UUID,
  notification_title TEXT,
  notification_body TEXT,
  notification_data JSONB DEFAULT '{}'::jsonb
)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
DECLARE
  subscription_count INTEGER;
BEGIN
  PERFORM notification_title, notification_body, notification_data;

  SELECT COUNT(*) INTO subscription_count
  FROM public.push_subscriptions
  WHERE user_id = user_uuid;

  RETURN subscription_count;
END;
$$;

CREATE OR REPLACE FUNCTION public.submit_quiz_attempt(
  p_user_id UUID,
  p_quiz_slug TEXT,
  p_answers JSONB
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
DECLARE
  v_quiz_id UUID;
  v_quiz_record RECORD;
  v_correct_count INTEGER := 0;
  v_earned_points INTEGER := 0;
  v_score INTEGER;
  v_passed BOOLEAN;
  v_attempt_id UUID;
BEGIN
  SELECT * INTO v_quiz_record FROM public.quizzes WHERE slug = p_quiz_slug;

  IF v_quiz_record IS NULL THEN
    RETURN json_build_object('error', 'Quiz not found');
  END IF;

  v_quiz_id := v_quiz_record.id;

  SELECT COUNT(*) FILTER (WHERE (opt->>'is_correct')::BOOLEAN = true)
  INTO v_correct_count
  FROM public.quiz_questions qq,
       jsonb_array_elements(qq.options) AS opt,
       jsonb_array_elements(p_answers) AS ans
  WHERE qq.quiz_id = v_quiz_id
    AND qq.id = (ans->>'question_id')::UUID
    AND (opt->>'text') = (
      SELECT (jsonb_array_elements(qq2.options)->>'text')
      FROM public.quiz_questions qq2
      WHERE qq2.id = (ans->>'question_id')::UUID
      LIMIT 1 OFFSET (ans->>'selected_option_index')::INTEGER
    );

  v_score := (
    v_correct_count::FLOAT
    / (SELECT COUNT(*) FROM public.quiz_questions WHERE quiz_id = v_quiz_id)
    * 100
  )::INTEGER;
  v_passed := v_score >= v_quiz_record.pass_score;

  INSERT INTO public.quiz_attempts (user_id, quiz_id, score, passed, answers)
  VALUES (p_user_id, v_quiz_id, v_score, v_passed, p_answers)
  RETURNING id INTO v_attempt_id;

  IF v_passed THEN
    v_earned_points := CASE
      WHEN v_score = 100 THEN 50
      ELSE 25
    END;

    PERFORM public.award_learning_points(
      p_user_id,
      CASE WHEN v_score = 100 THEN 'quiz_perfect_score' ELSE 'quiz_passed' END,
      v_earned_points,
      jsonb_build_object('quiz_slug', p_quiz_slug, 'score', v_score)
    );
  END IF;

  RETURN json_build_object(
    'attempt_id', v_attempt_id,
    'score', v_score,
    'passed', v_passed,
    'pass_score', v_quiz_record.pass_score,
    'points_earned', v_earned_points,
    'correct_count', v_correct_count
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.sync_binance_balances(
  p_user_id UUID,
  p_balances JSONB
)
RETURNS TABLE (assets_synced INTEGER, total_usd_value NUMERIC)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
DECLARE
  v_asset TEXT;
  v_free NUMERIC;
  v_locked NUMERIC;
  v_count INTEGER := 0;
  v_total_usd NUMERIC := 0;
  v_item JSONB;
  v_n INTEGER;
BEGIN
  IF p_balances IS NULL OR jsonb_typeof(p_balances) <> 'array' THEN
    RETURN QUERY SELECT 0, 0::NUMERIC;
    RETURN;
  END IF;

  DELETE FROM public.binance_balances
  WHERE user_id = p_user_id
    AND connection_id IS NULL;

  v_n := COALESCE(jsonb_array_length(p_balances), 0);
  FOR i IN 0 .. v_n - 1 LOOP
    v_item := p_balances -> i;
    v_asset := v_item ->> 'asset';
    v_free := COALESCE((v_item ->> 'free')::NUMERIC, 0);
    v_locked := COALESCE((v_item ->> 'locked')::NUMERIC, 0);

    IF v_asset IS NULL OR v_asset = '' THEN
      CONTINUE;
    END IF;

    IF v_free > 0 OR v_locked > 0 THEN
      INSERT INTO public.binance_balances (user_id, connection_id, asset, free, locked)
      VALUES (p_user_id, NULL, v_asset, v_free, v_locked);
      v_count := v_count + 1;
    END IF;
  END LOOP;

  RETURN QUERY SELECT v_count, v_total_usd;
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
  PERFORM p_referral_code, p_source, p_landing_page, p_ip_address, p_user_agent;
  RETURN NULL;
END;
$$;

