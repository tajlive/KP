-- Sjekk for duplikate aktive paper-sesjoner per bruker+par (bortsett fra e2e-testbrukeren)
SELECT user_id, trading_pair, COUNT(*) as antall_aktive
FROM trading_sessions
WHERE mode = 'paper' AND status = 'active' AND archived = FALSE
GROUP BY user_id, trading_pair
HAVING COUNT(*) > 1;
