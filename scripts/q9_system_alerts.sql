SELECT created_at, severity, component, message, details
FROM system_alerts
WHERE created_at >= NOW() - INTERVAL '24 hours'
ORDER BY created_at DESC
LIMIT 20;
