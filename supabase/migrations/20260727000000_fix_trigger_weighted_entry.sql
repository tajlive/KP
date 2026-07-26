-- ============================================================================
-- 20260727000000: Fiks entry_price/entry_time i trigger_update_session_state
--
-- E2E-funn F2 (2026-07-25): triggeren bygger open_position for paper-trades,
-- men satte entry_price = SISTE kjøpspris og entry_time = SISTE kjøpstid på
-- hvert kjøp. Riktig semantikk (speiler src/lib/trading/position-math.ts):
--   - entry_price = vektet snitt over ALLE kjøp
--   - entry_time  = tidligste kjøpstid (time-exit regner fra første kjøp)
--   - quantity    = akkumulert sum (uendret semantikk)
--
-- Ingen data endres — kun funksjonsdefinisjonen.
-- ============================================================================

BEGIN;

CREATE OR REPLACE FUNCTION public.trigger_update_session_state()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $function$
BEGIN
  IF NEW.mode = 'paper' THEN
    UPDATE public.trading_sessions
    SET
      current_capital = CASE
        WHEN NEW.side::text = 'buy' THEN current_capital - NEW.total_value - COALESCE(NEW.fee, 0)
        WHEN NEW.side::text = 'sell' THEN current_capital + NEW.total_value - COALESCE(NEW.fee, 0)
        ELSE current_capital
      END,
      current_capital_nok = CASE
        WHEN NEW.side::text = 'buy' THEN current_capital_nok - NEW.total_value - COALESCE(NEW.fee, 0)
        WHEN NEW.side::text = 'sell' THEN current_capital_nok + NEW.total_value - COALESCE(NEW.fee, 0)
        ELSE current_capital_nok
      END
    WHERE id = NEW.session_id;
  END IF;

  UPDATE public.trading_sessions
  SET
    open_position = CASE
      WHEN NEW.side::text = 'buy' THEN (
        SELECT jsonb_set(
          jsonb_build_object(
            'side', 'long',
            'quantity', COALESCE((open_position->>'quantity')::numeric, 0) + NEW.quantity,
            -- FIKS F2: vektet snittinngang (tidligere: siste pris overskrev)
            'entry_price',
              (
                COALESCE((open_position->>'quantity')::numeric, 0)
                  * COALESCE((open_position->>'entry_price')::numeric, NEW.price::numeric)
                + NEW.quantity * NEW.price::numeric
              )
              / NULLIF(COALESCE((open_position->>'quantity')::numeric, 0) + NEW.quantity, 0),
            -- FIKS F2: tidligste kjøpstid beholdes (tidligere: overskrevet)
            'entry_time',
              LEAST(
                COALESCE(open_position->>'entry_time', NEW.executed_at::text),
                NEW.executed_at::text
              )
          ),
          '{highest_price}',
          to_jsonb(GREATEST(
            COALESCE((open_position->>'highest_price')::numeric, 0),
            NEW.price::numeric
          ))
        )
      )
      WHEN NEW.side::text = 'sell' THEN CASE
        WHEN COALESCE((open_position->>'quantity')::numeric, 0) - NEW.quantity > 0 THEN jsonb_build_object(
          'side', 'long',
          'quantity', (open_position->>'quantity')::numeric - NEW.quantity,
          'entry_price', (open_position->>'entry_price')::numeric,
          'entry_time', open_position->>'entry_time',
          'highest_price', (open_position->>'highest_price')::numeric
        )
        ELSE NULL
      END
      ELSE open_position
    END,
    total_trades = total_trades + 1,
    winning_trades = CASE
      WHEN NEW.realized_pnl IS NOT NULL AND NEW.realized_pnl > 0 THEN winning_trades + 1
      ELSE winning_trades
    END,
    losing_trades = CASE
      WHEN NEW.realized_pnl IS NOT NULL AND NEW.realized_pnl < 0 THEN losing_trades + 1
      ELSE losing_trades
    END,
    total_pnl = total_pnl + COALESCE(NEW.realized_pnl, 0),
    last_tick_at = now(),
    updated_at = now()
  WHERE id = NEW.session_id;

  UPDATE public.user_profiles
  SET paper_balance = COALESCE((
    SELECT SUM(current_capital_nok)
    FROM public.trading_sessions
    WHERE user_id = NEW.user_id
      AND mode = 'paper'
      AND status = 'active'
  ), 0)
  WHERE id = NEW.user_id;

  UPDATE public.wallets
  SET balance = COALESCE((
    SELECT SUM(current_capital_nok)
    FROM public.trading_sessions
    WHERE user_id = NEW.user_id
      AND status = 'active'
  ), 0)
  WHERE user_id = NEW.user_id;

  UPDATE public.portfolios
  SET current_balance = COALESCE((
    SELECT SUM(current_capital_nok)
    FROM public.trading_sessions
    WHERE user_id = NEW.user_id
      AND status = 'active'
  ), 0)
  WHERE user_id = NEW.user_id;

  RETURN NEW;
END;
$function$;

COMMIT;

-- ── Verifikasjon (manuell etter apply): ─────────────────────────────────────
-- 1. Kjøp 1 enhet @ 100, deretter 3 enheter @ 200 →
--    open_position.entry_price skal være 175 (ikke 200), quantity 4,
--    entry_time fra første kjøp.
-- 2. Salg reduserer quantity, entry_price uendret.
