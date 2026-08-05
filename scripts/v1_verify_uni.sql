-- Verifiser at det kun finnes én aktiv UNIUSDT-sesjon for e2e-testbrukeren nå
SELECT id, status, trading_pair, archived, started_at, last_status_message
FROM trading_sessions
WHERE user_id = '1016b26e-f165-4046-a356-a1146bc98af9'
  AND trading_pair = 'UNIUSDT'
ORDER BY started_at DESC;
