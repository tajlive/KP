SELECT checked_at, issue_type, severity, session_id, user_id, details, action_taken
FROM pilot_guard_log
WHERE checked_at >= NOW() - INTERVAL '24 hours'
ORDER BY checked_at DESC
LIMIT 20;
