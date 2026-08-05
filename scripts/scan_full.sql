-- Feiljeger: komplett systemskanning siste 24t
-- Dato: 2026-08-05

-- 1. cron_health_events siste 24t (ikke-200, timeouts)
SELECT detected_at, source, job_name, status_code, timed_out, error_detail
FROM cron_health_events
WHERE detected_at >= NOW() - INTERVAL '24 hours'
ORDER BY detected_at DESC
LIMIT 50;

-- 2. bot_health: error/warning/stale
SELECT bot_name, status, last_heartbeat, error_count, consecutive_errors, last_error
FROM bot_health
WHERE status IN ('error','warning')
   OR last_heartbeat < NOW() - INTERVAL '10 minutes'
ORDER BY last_heartbeat DESC
LIMIT 20;

-- 3. trading_sessions: crashed, error_message, stale active
SELECT id, user_id, mode, status, started_at, last_heartbeat, error_message, archived, current_capital_nok
FROM trading_sessions
WHERE (status = 'crashed' AND created_at >= NOW() - INTERVAL '24 hours')
   OR (error_message IS NOT NULL AND created_at >= NOW() - INTERVAL '24 hours')
   OR (status = 'active' AND last_heartbeat < NOW() - INTERVAL '10 minutes')
ORDER BY last_heartbeat DESC NULLS LAST
LIMIT 20;

-- 4. trades: failed siste 24t
SELECT id, user_id, mode, trading_pair, side, price, quantity, status, reason_code, created_at
FROM trades
WHERE status = 'failed'
  AND created_at >= NOW() - INTERVAL '24 hours'
ORDER BY created_at DESC
LIMIT 20;

-- 5. Finn tabeller med error/alert/log i navnet
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
  AND (table_name ILIKE '%error%' OR table_name ILIKE '%alert%' OR table_name ILIKE '%log%' OR table_name ILIKE '%guard%')
ORDER BY table_name;

-- 6. JokerTrade monitor: sesjoner med error_message
SELECT user_id, trading_pair, current_capital_nok, total_pnl, pnl_pct, error_message, last_heartbeat
FROM jokertrade_monitor
WHERE error_message IS NOT NULL
   OR last_heartbeat < NOW() - INTERVAL '15 minutes'
ORDER BY last_heartbeat DESC NULLS LAST
LIMIT 20;

-- 7. Siste 20 trades uansett status (for mønstersjekk)
SELECT id, user_id, mode, trading_pair, side, price, quantity, status, created_at, venue
FROM trades
WHERE created_at >= NOW() - INTERVAL '24 hours'
ORDER BY created_at DESC
LIMIT 20;
