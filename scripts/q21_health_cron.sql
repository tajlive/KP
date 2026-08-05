-- Sjekk supabase-health-monitor cron-definisjon
SELECT jobid, jobname, schedule, command, active
FROM cron.job
WHERE jobname LIKE '%health%' OR jobname LIKE '%monitor%';
