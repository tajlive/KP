SELECT 
  status, 
  COUNT(*) as count,
  AVG(price) as avg_price,
  SUM(realized_pnl) as total_realized_pnl
FROM public.trades 
WHERE user_id = '6408d389-2021-4a2f-92b6-bebf0459a398'
GROUP BY status;
