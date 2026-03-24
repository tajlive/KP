-- Permanent fix for signal pipeline cron:
-- 1) signal-engine-5min: build HTTP headers with jsonb_build_object (safe JSON)
-- 2) seed_signal_if_stale: use lowercase action ('buy') to satisfy constraint

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
      'fallback',
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

DO $$
BEGIN
  BEGIN
    PERFORM cron.unschedule('signal-engine-5min');
  EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'signal-engine-5min unschedule: %', SQLERRM;
  END;

  PERFORM cron.schedule(
    'signal-engine-5min',
    '*/5 * * * *',
    $sql$
    SELECT net.http_post(
      url := 'https://vuxbjlykgmzskxbclquf.supabase.co/functions/v1/signal-engine',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || COALESCE(current_setting('app.settings.service_role_key', true), '')
      ),
      body := '{}'::jsonb
    ) AS request_id;
    $sql$
  );
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'signal-engine-5min schedule: %', SQLERRM;
END $$;

