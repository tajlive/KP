-- ============================================================================
-- 20260727120000: ÉN balanse-sannhet — triggeren skriver ikke lenger
-- user_profiles.paper_balance / wallets.balance / portfolios.current_balance
--
-- Rotårsak ("balanse-krigen", E2E 2026-07-25/26):
--   paper_accounts.current_balance er DOKUMENTERT source of truth (AGENTS.md).
--   Cron klarpakke-hourly_balance_sync heler user_profiles.paper_balance fra
--   paper_accounts — men DENNE triggeren skrev SUM(current_capital_nok over
--   aktive sesjoner) til user_profiles.paper_balance, wallets.balance og
--   portfolios.current_balance på HVER trade. To sannheter i krig:
--   prod-drift 92 418,17 (paper_accounts) vs 172 084,20 (profiles/wallets).
--   Sesjonskapital-summen er en ANNEN semantikk enn kontobalanse og
--   divergerer ved session-restarts, kapitaljusteringer og sesjoner som
--   aldri gikk gjennom paper_accounts.
--
-- Fiksen: triggeren gjør KUN det den skal — oppdatere trading_sessions
-- (kapital, open_position, tellere). Skriving til profiles/wallets/
-- portfolios er fjernet. Hourly-sync (paper_accounts → profiles/wallets)
-- er nå eneste skriver på den stien, og paper_accounts er eneste sannhet.
--
-- Basert på 20260727000000_fix_trigger_weighted_entry.sql (F2-versjonen,
-- applied i prod) — kun de tre UPDATE-setningene er fjernet, resten er
-- atferdsidentisk.
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
            -- F2: vektet snittinngang (ikke siste pris)
            'entry_price',
              (
                COALESCE((open_position->>'quantity')::numeric, 0)
                  * COALESCE((open_position->>'entry_price')::numeric, NEW.price::numeric)
                + NEW.quantity * NEW.price::numeric
              )
              / NULLIF(COALESCE((open_position->>'quantity')::numeric, 0) + NEW.quantity, 0),
            -- F2: tidligste kjøpstid beholdes
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

  -- FJERNET (balanse-krigen): UPDATE user_profiles SET paper_balance =
  --   SUM(current_capital_nok over aktive sesjoner) ...
  -- FJERNET: UPDATE wallets SET balance = SUM(...) ...
  -- FJERNET: UPDATE portfolios SET current_balance = SUM(...) ...
  -- Disse skal kun skrives fra paper_accounts.current_balance (hourly sync
  -- + init-flyter). Sesjons-sum er ikke kontobalanse.

  RETURN NEW;
END;
$function$;

COMMIT;

-- ── Verifikasjon (manuell etter apply): ─────────────────────────────────────
-- Kjør et paper-kjøp og verifisér at user_profiles.paper_balance og
-- wallets.balance IKKE endrer seg på trade (kun ved hourly sync/init).
