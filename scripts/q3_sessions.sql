SELECT id, user_id, mode, status, started_at, last_heartbeat, error_message, archived, current_capital_nok
FROM trading_sessions
WHERE (status = 'crashed' AND created_at >= NOW() - INTERVAL '24 hours')
   OR (error_message IS NOT NULL AND created_at >= NOW() - INTERVAL '24 hours')
   OR (status = 'active' AND last_heartbeat < NOW() - INTERVAL '10 minutes')
ORDER BY last_heartbeat DESC NULLS LAST
LIMIT 20;
