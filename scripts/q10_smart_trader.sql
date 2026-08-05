SELECT created_at, event_type, details, session_id, user_id
FROM smart_trader_log
WHERE event_type IN ('error','crash','timeout') AND created_at >= NOW() - INTERVAL '24 hours'
ORDER BY created_at DESC
LIMIT 20;
