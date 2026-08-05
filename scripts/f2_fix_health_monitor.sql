-- Fiks supabase-health-monitor: bruk klarpakke_trigger_cron i stedet for rå net.http_post
-- Rotårsak: current_setting('app.app_url', true) og current_setting('app.cron_secret', true) returnerer NULL
-- Løsning: Bruk samme mønster som klarpakke-cron-health og klarpakke-health-check
SELECT cron.unschedule('supabase-health-monitor');
SELECT cron.schedule('supabase-health-monitor', '*/5 * * * *', 'SELECT klarpakke_trigger_cron(''/api/cron/supabase-health'')');
