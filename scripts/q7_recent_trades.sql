SELECT id, user_id, mode, trading_pair, side, price, quantity, status, created_at, venue
FROM trades
WHERE created_at >= NOW() - INTERVAL '24 hours'
ORDER BY created_at DESC
LIMIT 20;
