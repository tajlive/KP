SELECT created_at, trigger_type, trigger_value, action, session_id, user_id
FROM auto_trading_circuit_breaker_logs
WHERE created_at >= NOW() - INTERVAL '24 hours'
ORDER BY created_at DESC
LIMIT 20;
