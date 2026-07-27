-- Fase 4: Aggregert trade-flyt per sesjon/paar for invariant-overvåking.
-- Brukes av cron balance-drift-check til å detektere oversalg (solgt > kjøpt)
-- uten å hente alle trades til app-laget. Samme filtre som Fase 2-recompute
-- (mode='paper', side buy/sell, quantity).

CREATE OR REPLACE VIEW public.session_position_flows AS
SELECT session_id,
       trading_pair,
       SUM(CASE WHEN side = 'buy' THEN quantity ELSE 0 END) AS bought_qty,
       SUM(CASE WHEN side = 'sell' THEN quantity ELSE 0 END) AS sold_qty
FROM public.trades
WHERE mode = 'paper'
GROUP BY session_id, trading_pair;
