SELECT id, user_id, mode, trading_pair, side, price, quantity, status, reason_code, created_at
FROM trades
WHERE status = 'failed'
  AND created_at >= NOW() - INTERVAL '24 hours'
ORDER BY created_at DESC
LIMIT 20;
