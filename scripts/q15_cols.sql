SELECT table_name, column_name
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name IN ('client_errors','system_alerts','smart_trader_log','pilot_guard_log','auto_trading_circuit_breaker_logs')
ORDER BY table_name, ordinal_position;
