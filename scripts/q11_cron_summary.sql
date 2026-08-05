-- 4. Telle cron_health_events per feilkilde siste 24t
SELECT source, job_name, status_code, COUNT(*) as antall, MIN(detected_at) as første, MAX(detected_at) as siste
FROM cron_health_events
WHERE detected_at >= NOW() - INTERVAL '24 hours'
GROUP BY source, job_name, status_code
ORDER BY antall DESC;
