-- Fix stale trading_sessions aggregation data
-- Session-tabellen hadde losing_trades = 3 men faktisk 401
-- Dette gjorde at dashboard viste 75% winrate mens analyse viste 2.33%

UPDATE trading_sessions s
SET 
  total_trades = sub.actual_trades,
  winning_trades = sub.actual_wins,
  losing_trades = sub.actual_losses,
  total_pnl = sub.actual_pnl
FROM (
  SELECT 
    s.id,
    COUNT(t.id)::int AS actual_trades,
    COUNT(*) FILTER (WHERE public.calculate_effective_pnl(t.realized_pnl, t.total_value, t.side::text) > 0)::int AS actual_wins,
    COUNT(*) FILTER (WHERE public.calculate_effective_pnl(t.realized_pnl, t.total_value, t.side::text) < 0)::int AS actual_losses,
    COALESCE(SUM(public.calculate_effective_pnl(t.realized_pnl, t.total_value, t.side::text)), 0) AS actual_pnl
  FROM trading_sessions s
  LEFT JOIN trades t ON t.session_id = s.id
  GROUP BY s.id
) sub
WHERE s.id = sub.id;

-- Fremtidig: endre get_dashboard_metrics RPC til a aggregere fra trades (ikke session-kolonner)
-- for a unnga at session-data blir stale igjen.
