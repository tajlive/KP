-- Feiljeger-rapport: systematisk skanning siste 24t
-- Kjør: supabase db query --db-url "$(supabase status --output json | jq -r '.DB_URL')" -f scripts/scan_all.sql
-- Eller: supabase db query med riktig connection

-- 1. Finn tabeller med health/log/alert/error i navnet
SELECT table_schema, table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
  AND (table_name ILIKE '%health%' 
    OR table_name ILIKE '%log%' 
    OR table_name ILIKE '%error%' 
    OR table_name ILIKE '%alert%'
    OR table_name ILIKE '%cron%'
    OR table_name ILIKE '%trade%'
    OR table_name ILIKE '%session%')
ORDER BY table_name;

-- 2. Sjekk om cron_health_events finnes
SELECT COUNT(*) as cron_health_events_count FROM cron_health_events 
WHERE start_time >= NOW() - INTERVAL '24 hours';

-- 3. Siste 20 hendelser fra cron_health_events
SELECT * FROM cron_health_events 
WHERE start_time >= NOW() - INTERVAL '24 hours' 
ORDER BY start_time DESC 
LIMIT 20;
