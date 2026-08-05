-- E2E-testbruker: alle sesjoner
SELECT id, mode, status, trading_pair, current_capital_nok, starting_capital_nok, archived, started_at, stopped_at, last_heartbeat, error_message
FROM trading_sessions
WHERE user_id = '1016b26e-f165-4046-a356-a1146bc98af9'
ORDER BY started_at DESC;
