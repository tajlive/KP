SELECT detected_at, status_code, error_detail
FROM cron_health_events
WHERE detected_at >= NOW() - INTERVAL '24 hours'
  AND source = 'http_response'
  AND status_code IN (500,503,405,401)
ORDER BY detected_at DESC
LIMIT 10;
