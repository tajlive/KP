-- Verifiser at supabase-health-monitor nå bruker klarpakke_trigger_cron
SELECT jobid, jobname, command
FROM cron.job
WHERE jobname = 'supabase-health-monitor';
