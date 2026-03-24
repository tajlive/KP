-- Fix fallback seed for environments where trading_signals.signal_type
-- check-constraint does not allow value 'fallback'.
-- Use canonical value 'technical' for seeded rows.

SET statement_timeout = '30s';

CREATE OR REPLACE FUNCTION public.seed_signal_if_stale(
  p_max_age_minutes INTEGER DEFAULT 20
)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
DECLARE
  v_latest TIMESTAMPTZ;
  v_count INTEGER := 0;
BEGIN
  SELECT MAX(created_at) INTO v_latest FROM public.trading_signals;

  IF v_latest IS NULL OR v_latest < NOW() - make_interval(mins => p_max_age_minutes) THEN
    INSERT INTO public.trading_signals (
      symbol,
      action,
      confidence,
      entry_price,
      stop_loss,
      target_price,
      reasoning,
      signal_type,
      status,
      created_at
    )
    VALUES (
      'BTCUSDT',
      'buy',
      55,
      NULL,
      NULL,
      NULL,
      'Fallback signal: edge signal-engine stale or unavailable',
      'technical',
      'active',
      NOW()
    );
    v_count := 1;

    INSERT INTO public.bot_health (
      bot_name,
      status,
      last_heartbeat,
      last_error,
      metadata,
      updated_at
    )
    VALUES (
      'signal-engine',
      'warning',
      NOW(),
      'PG fallback seed: verify Edge signal-engine (pg_cron net.http_post) and DB secrets (service role).',
      jsonb_build_object('source', 'pg_fallback_seed', 'seeded_at', NOW()),
      NOW()
    )
    ON CONFLICT (bot_name) DO UPDATE SET
      last_heartbeat = EXCLUDED.last_heartbeat,
      status = EXCLUDED.status,
      last_error = EXCLUDED.last_error,
      metadata = COALESCE(public.bot_health.metadata, '{}'::jsonb) || EXCLUDED.metadata,
      updated_at = NOW();
  END IF;

  RETURN v_count;
END;
$$;

