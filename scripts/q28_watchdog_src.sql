-- Sjekk cron_watchdog definisjon
SELECT proname, prosrc FROM pg_proc WHERE proname = 'cron_watchdog';
