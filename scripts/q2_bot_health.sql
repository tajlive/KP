SELECT bot_name, status, last_heartbeat, error_count, consecutive_errors, last_error
FROM bot_health
WHERE status IN ('error','warning')
   OR last_heartbeat < NOW() - INTERVAL '10 minutes'
ORDER BY last_heartbeat DESC
LIMIT 20;
