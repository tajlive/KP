-- Fallback signal seeder: keeps trading_signals non-empty if edge signal-engine fails.
-- Source of truth for scheduling remains Supabase pg_cron.

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
      'BUY',
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
  END IF;

  RETURN v_count;
END;
$$;

DO $$
BEGIN
  BEGIN
    PERFORM cron.unschedule('signal-fallback-seed-5min');
  EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'signal-fallback-seed-5min unschedule: %', SQLERRM;
  END;

  PERFORM cron.schedule(
    'signal-fallback-seed-5min',
    '*/5 * * * *',
    'SELECT public.seed_signal_if_stale(20);'
  );
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'signal-fallback-seed-5min schedule: %', SQLERRM;
END $$;

