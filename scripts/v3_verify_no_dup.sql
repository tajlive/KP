-- Sjekk om det fortsatt finnes duplikater for e2e-testbrukeren
SELECT trading_pair, COUNT(*) as antall, 
  SUM(CASE WHEN status = 'active' THEN 1 ELSE 0 END) as aktive,
  SUM(CASE WHEN archived THEN 1 ELSE 0 END) as arkivert
FROM trading_sessions
WHERE user_id = '1016b26e-f165-4046-a356-a1146bc98af9'
GROUP BY trading_pair
HAVING COUNT(*) > 1;
