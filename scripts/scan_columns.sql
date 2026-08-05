-- Feiljeger: finn kolonner i relevante tabeller
SELECT table_name, column_name, data_type
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name IN ('cron_health_events','trading_sessions','trades','bot_health','jokertrade_guard_log','jokertrade_monitor')
ORDER BY table_name, ordinal_position;
