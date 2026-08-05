-- Sjekk klarpakke_trigger_cron definisjon
SELECT prosrc FROM pg_proc WHERE proname = 'klarpakke_trigger_cron';
