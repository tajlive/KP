-- Sjekk detect-crashed-sessions cron-definisjon
SELECT jobid, jobname, schedule, command, active
FROM cron.job
WHERE jobname LIKE '%detect-crashed%';
