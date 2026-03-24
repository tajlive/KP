-- Unngå tvetydighet mellom parametre og kolonnenavn (db lint ERROR 42702).
-- Parameternavn kan ikke endres med CREATE OR REPLACE — kopier til lokale variabler.
CREATE OR REPLACE FUNCTION public.close_paper_position(
  position_id UUID,
  closing_price NUMERIC,
  close_reason TEXT
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
DECLARE
  v_close NUMERIC := closing_price;
  v_reason TEXT := close_reason;
  v_pid UUID := position_id;
  pnl NUMERIC;
  pnl_percent NUMERIC;
  pos public.paper_positions%ROWTYPE;
BEGIN
  SELECT * INTO pos FROM public.paper_positions WHERE id = v_pid;
  IF NOT FOUND THEN
    RETURN json_build_object('error', 'Position not found');
  END IF;

  IF pos.position_type = 'long' THEN
    pnl := (v_close - pos.entry_price) * pos.quantity;
    pnl_percent := CASE
      WHEN pos.entry_price > 0 THEN ((v_close - pos.entry_price) / pos.entry_price) * 100
      ELSE 0
    END;
  ELSE
    pnl := (pos.entry_price - v_close) * pos.quantity;
    pnl_percent := CASE
      WHEN pos.entry_price > 0 THEN ((pos.entry_price - v_close) / pos.entry_price) * 100
      ELSE 0
    END;
  END IF;

  UPDATE public.paper_positions
  SET
    status = 'closed',
    closing_price = v_close,
    profit_loss = pnl,
    profit_loss_percent = pnl_percent,
    close_reason = v_reason,
    closed_at = NOW(),
    updated_at = NOW()
  WHERE id = v_pid;

  RETURN json_build_object(
    'success', true,
    'pnl', pnl,
    'pnl_percent', pnl_percent
  );
END;
$$;
