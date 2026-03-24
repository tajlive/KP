-- ============================================================================
-- DB lint / remote: tom search_path + schema-drift (runtime: supabase db query + db lint)
-- ============================================================================
-- 1) Funksjoner med search_path="" får ikke resolved public.* under lint/kompilering.
-- 2) decrypt_binance_keys: <<fn>> ble tolket som tabell — bruk lokale variabler.
-- 3) sync_binance_balances: remote har UNIQUE(connection_id, asset), ikke (user_id, asset).
-- 4) Utvalgte kropp-fikser: profiles → user_profiles, feil tabellnavn/kolonner.
-- ============================================================================

-- A) Bulk: sett search_path for alle public-funksjoner som eksplisitt har tom streng
DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN
    SELECT
      format(
        '%I.%I(%s)',
        n.nspname,
        p.proname,
        pg_get_function_identity_arguments(p.oid)
      ) AS sig
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
      AND p.prokind = 'f'
      AND p.proconfig IS NOT NULL
      AND EXISTS (
        SELECT 1
        FROM unnest(p.proconfig) AS x(q)
        WHERE x.q = 'search_path=""'
      )
  LOOP
    BEGIN
      EXECUTE format(
        'ALTER FUNCTION %s SET search_path = public, extensions, vault, pg_catalog',
        r.sig
      );
    EXCEPTION
      WHEN OTHERS THEN
        RAISE WARNING 'db_lint search_path skip %: %', r.sig, SQLERRM;
    END;
  END LOOP;
END;
$$;

-- B) decrypt_binance_keys (RPC-navn uendret)
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

  SELECT COALESCE((s.secret->'custom_data'->>'is_testnet')::BOOLEAN, true)
  INTO is_test
  FROM vault.secrets s
  WHERE s.id = v_key;

  RETURN QUERY SELECT decrypted_key, decrypted_secret, is_test;
END;
$$;

-- C) Binance sync: slett rader for bruker uten connection_id, deretter insert (unngår feil ON CONFLICT)
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
  i INTEGER;
  n INTEGER;
BEGIN
  IF p_balances IS NULL OR jsonb_typeof(p_balances) <> 'array' THEN
    RETURN QUERY SELECT 0, 0::NUMERIC;
    RETURN;
  END IF;

  DELETE FROM public.binance_balances
  WHERE user_id = p_user_id
    AND connection_id IS NULL;

  n := COALESCE(jsonb_array_length(p_balances), 0);
  FOR i IN 0 .. n - 1 LOOP
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

-- D) Profil / admin (profiles finnes ikke på remote)
CREATE OR REPLACE FUNCTION public.is_admin(user_uuid UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1
    FROM public.user_profiles up
    WHERE up.id = user_uuid AND up.role = 'admin'
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.set_subscription_tier(
  p_user_id UUID,
  p_tier TEXT,
  p_status TEXT DEFAULT 'active'
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
BEGIN
  UPDATE public.user_profiles
  SET
    subscription_tier = p_tier,
    subscription_status = p_status,
    updated_at = NOW()
  WHERE id = p_user_id OR user_id = p_user_id;

  RETURN FOUND;
END;
$$;

ALTER TABLE public.user_profiles
  ADD COLUMN IF NOT EXISTS paper_trades_count INTEGER NOT NULL DEFAULT 0;

CREATE OR REPLACE FUNCTION public.increment_paper_trades_count(user_uuid UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
BEGIN
  UPDATE public.user_profiles
  SET
    paper_trades_count = paper_trades_count + 1,
    updated_at = NOW()
  WHERE id = user_uuid;
END;
$$;

CREATE OR REPLACE FUNCTION public.set_trading_mode(user_uuid UUID, new_mode TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
DECLARE
  has_keys BOOLEAN;
BEGIN
  IF new_mode = 'live' THEN
    SELECT (up.binance_connected = true OR up.binance_api_key_id IS NOT NULL)
    INTO has_keys
    FROM public.user_profiles up
    WHERE up.id = user_uuid;

    IF NOT COALESCE(has_keys, false) THEN
      RAISE EXCEPTION 'Binance API key not configured';
    END IF;
  END IF;

  UPDATE public.user_profiles
  SET
    preferred_trading_mode = new_mode,
    updated_at = NOW()
  WHERE id = user_uuid;

  RETURN TRUE;
END;
$$;

CREATE OR REPLACE FUNCTION public.compute_leaderboard_monthly(
  p_month DATE DEFAULT (date_trunc('month', NOW()))::DATE
)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
DECLARE
  v_count INTEGER;
BEGIN
  WITH user_points AS (
    SELECT
      user_id,
      SUM(points) AS total_points,
      jsonb_build_object(
        'modules_completed', COUNT(*) FILTER (WHERE event_type = 'module_completed'),
        'quizzes_passed', COUNT(*) FILTER (WHERE event_type = 'quiz_passed'),
        'trades_count', COUNT(*) FILTER (WHERE event_type IN ('paper_trade_closed_profit', 'paper_trade_closed_loss')),
        'win_rate', CASE
          WHEN COUNT(*) FILTER (WHERE event_type IN ('paper_trade_closed_profit', 'paper_trade_closed_loss')) > 0
          THEN (
            COUNT(*) FILTER (WHERE event_type = 'paper_trade_closed_profit')::FLOAT
            / NULLIF(
              COUNT(*) FILTER (WHERE event_type IN ('paper_trade_closed_profit', 'paper_trade_closed_loss')),
              0
            )
          ) * 100
          ELSE 0
        END
      ) AS stats
    FROM public.learning_events
    WHERE created_at >= p_month
      AND created_at < p_month + INTERVAL '1 month'
    GROUP BY user_id
  ),
  ranked AS (
    SELECT
      user_id,
      total_points,
      stats,
      ROW_NUMBER() OVER (ORDER BY total_points DESC) AS rank_num
    FROM user_points
  )
  INSERT INTO public.leaderboard_monthly (month, user_id, display_name, points, rank, stats)
  SELECT
    p_month,
    r.user_id,
    COALESCE(up.display_name, up.full_name, 'Trader'),
    r.total_points,
    r.rank_num,
    r.stats
  FROM ranked r
  JOIN public.user_profiles up ON up.id = r.user_id
  ON CONFLICT (month, user_id)
  DO UPDATE SET
    points = EXCLUDED.points,
    rank = EXCLUDED.rank,
    stats = EXCLUDED.stats,
    updated_at = NOW();

  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END;
$$;

CREATE OR REPLACE FUNCTION public.get_leaderboard(
  p_timeframe TEXT DEFAULT 'all_time',
  p_limit INTEGER DEFAULT 10
)
RETURNS TABLE (
  rank BIGINT,
  session_id UUID,
  user_id UUID,
  username TEXT,
  strategy_name TEXT,
  total_return_pct NUMERIC,
  win_rate NUMERIC,
  total_trades INTEGER,
  profit_nok NUMERIC,
  followers_count INTEGER,
  is_own_session BOOLEAN
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
DECLARE
  v_current_user_id UUID := auth.uid();
  v_date_filter TIMESTAMPTZ;
BEGIN
  v_date_filter := CASE p_timeframe
    WHEN 'today' THEN NOW() - INTERVAL '1 day'
    WHEN 'week' THEN NOW() - INTERVAL '7 days'
    WHEN 'month' THEN NOW() - INTERVAL '30 days'
    ELSE '1970-01-01'::TIMESTAMPTZ
  END;

  RETURN QUERY
  WITH ranked_sessions AS (
    SELECT
      s.id AS sid,
      s.user_id AS uid,
      s.strategy_id::TEXT AS strategy_name,
      CASE
        WHEN COALESCE(s.initial_capital, 0) > 0
        THEN (s.total_pnl / s.initial_capital) * 100
        ELSE 0
      END AS total_pnl_pct,
      CASE
        WHEN COALESCE(s.total_trades, 0) > 0
        THEN (s.winning_trades::NUMERIC / s.total_trades::NUMERIC) * 100
        ELSE 0
      END AS win_rate,
      s.total_trades,
      s.total_pnl AS total_pnl_nok,
      0::INTEGER AS followers_count,
      COALESCE(up.display_name, up.full_name, split_part(up.email::TEXT, '@', 1)) AS uname,
      ROW_NUMBER() OVER (
        ORDER BY
          CASE
            WHEN COALESCE(s.initial_capital, 0) > 0 THEN (s.total_pnl / s.initial_capital) * 100
            ELSE 0
          END DESC
      ) AS rn
    FROM public.trading_sessions s
    LEFT JOIN public.user_profiles up ON up.id = s.user_id
    WHERE s.mode = 'paper'
      AND s.status = 'active'
      AND s.started_at >= v_date_filter
  )
  SELECT
    rs.rn,
    rs.sid,
    rs.uid,
    CASE
      WHEN rs.uid = v_current_user_id THEN rs.uname
      ELSE 'Trader #' || LEFT(rs.uid::TEXT, 6)
    END,
    rs.strategy_name,
    rs.total_pnl_pct,
    rs.win_rate,
    rs.total_trades,
    rs.total_pnl_nok,
    rs.followers_count,
    rs.uid = v_current_user_id
  FROM ranked_sessions rs
  WHERE rs.rn <= p_limit
  ORDER BY rs.rn;
END;
$$;

-- E) Kolonne- / tabellnavn
CREATE OR REPLACE FUNCTION public.count_user_strategies(
  p_user_id UUID,
  p_mode TEXT DEFAULT NULL
)
RETURNS INTEGER
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
  SELECT COUNT(*)::INTEGER
  FROM public.user_strategies
  WHERE user_id = p_user_id
    AND is_active = true
    AND (p_mode IS NULL OR mode = p_mode);
$$;

CREATE OR REPLACE FUNCTION public.get_available_auto_budget(p_user_id UUID)
RETURNS TABLE (
  binance_balance_nok DOUBLE PRECISION,
  max_auto_budget_nok DOUBLE PRECISION,
  allocated_in_open_trades_nok DOUBLE PRECISION,
  available_auto_budget_nok DOUBLE PRECISION
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
  SELECT
    COALESCE(ps.total_value_nok, 0)::DOUBLE PRECISION AS binance_balance_nok,
    COALESCE(ps.total_value_nok, 0)::DOUBLE PRECISION
      * (COALESCE(ats.max_position_percent, 10)::DOUBLE PRECISION / 100) AS max_auto_budget_nok,
    COALESCE(
      (
        SELECT SUM(at.amount * COALESCE(at.price, 0))
        FROM public.auto_trades at
        WHERE at.user_id = p_user_id
          AND at.status = 'open'
      ),
      0
    )::DOUBLE PRECISION AS allocated_in_open_trades_nok,
    COALESCE(ps.total_value_nok, 0)::DOUBLE PRECISION
      * (COALESCE(ats.max_position_percent, 10)::DOUBLE PRECISION / 100)
      - COALESCE(
        (
          SELECT SUM(at.amount * COALESCE(at.price, 0))
          FROM public.auto_trades at
          WHERE at.user_id = p_user_id
            AND at.status = 'open'
        ),
        0
      )::DOUBLE PRECISION AS available_auto_budget_nok
  FROM (SELECT p_user_id AS uid) AS u
  LEFT JOIN public.portfolio_summary ps ON ps.user_id = u.uid
  LEFT JOIN public.auto_trade_settings ats ON ats.user_id = u.uid;
$$;

CREATE OR REPLACE FUNCTION public.get_portfolio_overview_v2(p_user_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
DECLARE
  v_result JSONB;
  v_total_value NUMERIC := 0;
  v_total_invested NUMERIC := 0;
  v_position_count INTEGER := 0;
BEGIN
  SELECT COALESCE(SUM(usd_value), 0), COUNT(*)
  INTO v_total_value, v_position_count
  FROM public.binance_balances
  WHERE user_id = p_user_id AND COALESCE(free, 0) + COALESCE(locked, 0) > 0;

  IF v_total_value = 0 THEN
    SELECT
      COALESCE(SUM(current_balance), 0),
      COALESCE(SUM(total_invested), 0),
      COUNT(*)
    INTO v_total_value, v_total_invested, v_position_count
    FROM public.portfolios
    WHERE user_id = p_user_id;
  END IF;

  v_result := jsonb_build_object(
    'totalValue', v_total_value,
    'totalInvested', v_total_invested,
    'positionCount', v_position_count,
    'hasRealAccount', EXISTS (
      SELECT 1
      FROM public.exchange_api_keys
      WHERE user_id = p_user_id AND is_active = true
    ),
    'lastSynced', (SELECT MAX(updated_at) FROM public.binance_balances WHERE user_id = p_user_id)
  );

  RETURN v_result;
END;
$$;

-- F) Heartbeat / followers (unified view er ikke alltid UPDATE-bar)
CREATE OR REPLACE FUNCTION public.update_session_heartbeat(p_session_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
BEGIN
  UPDATE public.trading_sessions
  SET
    last_heartbeat = NOW(),
    updated_at = NOW()
  WHERE id = p_session_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.increment_followers(session_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
BEGIN
  NULL;
END;
$$;

-- G) Idempotency key: digest i extensions
CREATE OR REPLACE FUNCTION public.generate_trade_idempotency_key(
  p_session_id UUID,
  p_side trade_side,
  p_timestamp TIMESTAMPTZ
)
RETURNS TEXT
LANGUAGE plpgsql
IMMUTABLE
SECURITY DEFINER
SET search_path = public, extensions, pg_catalog
AS $$
BEGIN
  RETURN encode(
    extensions.digest(
      concat(p_session_id::TEXT, '-', p_side::TEXT, '-', (EXTRACT(EPOCH FROM p_timestamp))::BIGINT::TEXT),
      'sha256'
    ),
    'hex'
  );
END;
$$;

-- H) Paper trade RPC → public.trades (aktiv paper session påkrevd)
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
  v_reason TEXT;
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
    s.slippage_amount,
    s.reason
  INTO v_exec_price, v_slippage_bps, v_slippage_amt, v_reason
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
