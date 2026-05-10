SELECT 
  SUM(pnl_amount) as total_pnl, 
  COUNT(*) as trade_count,
  MIN(created_at) as first_trade,
  MAX(created_at) as last_trade
FROM public.trades 
WHERE user_id = '6408d389-2021-4a2f-92b6-bebf0459a398';
