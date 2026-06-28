DO $$
BEGIN
  PERFORM cron.unschedule('klarpakke-auto-trade');
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'Could not unschedule klarpakke-auto-trade: %', SQLERRM;
END $$;
