SELECT user_id, trading_pair, current_capital_nok, total_pnl, pnl_pct, error_message, last_heartbeat
FROM jokertrade_monitor
WHERE error_message IS NOT NULL
   OR last_heartbeat < NOW() - INTERVAL '15 minutes'
ORDER BY last_heartbeat DESC NULLS LAST
LIMIT 20;
