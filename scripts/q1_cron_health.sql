SELECT detected_at, source, job_name, status_code, timed_out, error_detail
FROM cron_health_events
WHERE detected_at >= NOW() - INTERVAL '24 hours'
ORDER BY detected_at DESC
LIMIT 50;
