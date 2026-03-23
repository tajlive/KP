-- Enterprise 2026: SECURITY DEFINER-funksjoner med eksplisitt search_path og public.*-kvalifisering.
-- Unngår avvik mot public.trades når search_path er endret, og følger sikkerhetsmønster for DEFINER.

CREATE OR REPLACE FUNCTION public.calculate_daily_loss(p_user_id UUID, p_session_id UUID)
RETURNS NUMERIC
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  daily_loss NUMERIC;
BEGIN
  SELECT COALESCE(SUM(
    CASE
      WHEN t.side::text = 'sell' AND t.price < (
        SELECT AVG(t2.price) FROM public.trades t2
        WHERE t2.session_id = p_session_id
        AND t2.side::text = 'buy'
        AND t2.created_at::date = CURRENT_DATE
      ) THEN (t.price - (
        SELECT AVG(t2.price) FROM public.trades t2
        WHERE t2.session_id = p_session_id
        AND t2.side::text = 'buy'
        AND t2.created_at::date = CURRENT_DATE
      )) * t.quantity
      ELSE 0
    END
  ), 0) INTO daily_loss
  FROM public.trades t
  WHERE t.user_id = p_user_id
  AND t.session_id = p_session_id
  AND t.created_at::date = CURRENT_DATE
  AND t.side::text = 'sell';

  RETURN daily_loss;
END;
$$;

CREATE OR REPLACE FUNCTION public.is_bot_healthy(p_bot_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  bot_record RECORD;
BEGIN
  SELECT * INTO bot_record FROM public.bot_health WHERE id = p_bot_id;

  IF NOT FOUND THEN
    RETURN false;
  END IF;

  IF bot_record.status != 'running' THEN
    RETURN false;
  END IF;

  IF bot_record.last_heartbeat < NOW() - INTERVAL '5 minutes' THEN
    RETURN false;
  END IF;

  IF bot_record.consecutive_errors >= COALESCE(bot_record.max_consecutive_errors, 3) THEN
    RETURN false;
  END IF;

  RETURN true;
END;
$$;
