-- ============================================================================
-- 20260727233000: FASE 1 trigger-hardening — inflasjonsfiks
--
-- ⚠️  KREVES: Toms godkjenning før apply (AGENTS.md: DB er hellig).
--     Denne filen er et utkast til gjennomgang — IKKE kjørt i prod ennå.
--
-- Bakgrunn (målt read-only i prod 2026-07-27):
--   • 340 paper-sesjoner har solgt mer enn de har kjøpt — 209 mrd NOK i
--     fantomsalg. Verste sesjon: 100 mrd NOK. Toms test-D CA: 100k → 1,48M
--     på 7,5 timer (54W/0L).
--   • Fase 0 (kode, commit 9996087d7, deployet) stoppet NYE tilfeller:
--     executeTrade avviser salg uten posisjon (NO_POSITION), clamper til
--     beholdning, og orphan-adopsjon verifiserer/normaliserer priser.
--   • Fase 1 (DENNE filen) låser invariantene ned i databasen slik at
--     ingen fremtidig kodefeil kan gjenåpne pengemaskinen.
--
-- To trigger-funksjoner erstattes (CREATE OR REPLACE = idempotent,
-- trigger-bindingene on_trade_update_session og compute_realized_pnl_trigger
-- på trades berøres ikke):
--
--   1) trigger_update_session_state:
--      FØR: paper-salg krediterte NEW.total_value UBETINGET — uavhengig av
--           om sesjonen eide noe. Det var selve pengemaskinen.
--      ETTER: kreditt = enhetspris × LEAST(solgt, beholdning) − forholdsmessig
--           gebyr. Oversalg logges til balance_sync_audit (warning).
--
--   2) trigger_compute_realized_pnl:
--      FØR: realized_pnl = (pris − basis) × qty for enhver basis — også
--           korrupt (4 492 mot pris 618 900 → +4 748 «gevinst» per trade),
--           og den OVERSTYRTE appens FIFO-verdi ved insert.
--      ETTER: P&L regnes kun når basis er i samme størrelsesorden som pris
--           (ratio 0.4–2.5, speiler kode-guarden). Ellers NULL + audit-rad.
--           NULL betyr også at vinn/tap-tellerne i (1) ikke telles opp.
--
-- BEVISST UTELATT (til Fase 2, etter data-sanering):
--   • CHECK-constraints (current_capital_nok >= 0 etc.): finnes 49 rader
--     med negativ kapital i dag (0 aktive). Constraints må inn ETTER
--     sanering, ellers blokkeres selve oppryddingsskrivingene.
--
-- Rollback: re-apply supabase/migrations/20260727120000_single_balance_truth.sql
-- (forrige versjon av funksjon 1) samt funksjon 2 fra prod-snapshot
-- (arkivert i commit-meldingen til Fase 0).
-- ============================================================================

BEGIN;

-- ─── 1) Kapital-kreditt: aldri mer enn faktisk beholdning ──────────────────
CREATE OR REPLACE FUNCTION public.trigger_update_session_state()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $function$
DECLARE
  v_held_qty NUMERIC := 0;
  v_effective_qty NUMERIC;
  v_unit_price NUMERIC;
  v_fee NUMERIC;
  v_credit NUMERIC;
BEGIN
  -- Les beholdning FØR noen oppdatering (kun nødvendig for paper-salg)
  IF NEW.mode = 'paper' AND NEW.side::text = 'sell' THEN
    SELECT COALESCE((open_position->>'quantity')::numeric, 0)
      INTO v_held_qty
      FROM public.trading_sessions
      WHERE id = NEW.session_id;
    v_held_qty := COALESCE(v_held_qty, 0);

    -- Audit ved oversalg-forsøk (skal ikke skje etter Fase 0 — hvis det
    -- likevel skjer, vil vi vite det: warning-rad, ikke stille korrupsjon)
    IF NEW.quantity > v_held_qty THEN
      INSERT INTO public.balance_sync_audit (user_id, check_type, status, details)
      VALUES (
        NEW.user_id,
        'sell_oversell_clamped',
        'warning',
        jsonb_build_object(
          'session_id', NEW.session_id,
          'trade_id', NEW.id,
          'requested_qty', NEW.quantity,
          'held_qty', v_held_qty,
          'total_value', NEW.total_value
        )
      );
    END IF;
  END IF;

  IF NEW.mode = 'paper' THEN
    -- INVARIANT: kreditt beregnes av effektiv (clampet) mengde
    v_effective_qty := CASE
      WHEN NEW.side::text = 'sell' THEN LEAST(NEW.quantity, GREATEST(v_held_qty, 0))
      ELSE NEW.quantity
    END;
    v_unit_price := CASE WHEN NEW.quantity > 0 THEN NEW.total_value / NEW.quantity ELSE 0 END;
    v_fee := COALESCE(NEW.fee, 0) * CASE WHEN NEW.quantity > 0 THEN v_effective_qty / NEW.quantity ELSE 0 END;
    v_credit := GREATEST(v_unit_price * v_effective_qty - v_fee, 0);

    UPDATE public.trading_sessions
    SET
      current_capital = CASE
        WHEN NEW.side::text = 'buy' THEN current_capital - NEW.total_value - COALESCE(NEW.fee, 0)
        WHEN NEW.side::text = 'sell' THEN current_capital + v_credit
        ELSE current_capital
      END,
      current_capital_nok = CASE
        WHEN NEW.side::text = 'buy' THEN current_capital_nok - NEW.total_value - COALESCE(NEW.fee, 0)
        WHEN NEW.side::text = 'sell' THEN current_capital_nok + v_credit
        ELSE current_capital_nok
      END
    WHERE id = NEW.session_id;
  END IF;

  -- Posisjon + statistikk — uendret fra 20260727120000_single_balance_truth
  UPDATE public.trading_sessions
  SET
    open_position = CASE
      WHEN NEW.side::text = 'buy' THEN (
        SELECT jsonb_set(
          jsonb_build_object(
            'side', 'long',
            'quantity', COALESCE((open_position->>'quantity')::numeric, 0) + NEW.quantity,
            'entry_price',
              (
                COALESCE((open_position->>'quantity')::numeric, 0)
                  * COALESCE((open_position->>'entry_price')::numeric, NEW.price::numeric)
                + NEW.quantity * NEW.price::numeric
              )
              / NULLIF(COALESCE((open_position->>'quantity')::numeric, 0) + NEW.quantity, 0),
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

  RETURN NEW;
END;
$function$;

-- ─── 2) P&L: nekt beregning mot implausibelt kostgrunnlag ──────────────────
CREATE OR REPLACE FUNCTION public.trigger_compute_realized_pnl()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $function$
DECLARE
  pos JSONB;
  pos_qty NUMERIC;
  pos_price NUMERIC;
  sell_qty NUMERIC;
  basis_ratio NUMERIC;
BEGIN
  IF NEW.side::text = 'sell' THEN
    SELECT open_position INTO pos
    FROM public.trading_sessions
    WHERE id = NEW.session_id;

    IF pos IS NOT NULL THEN
      pos_qty := COALESCE((pos->>'quantity')::numeric, 0);
      pos_price := COALESCE((pos->>'entry_price')::numeric, 0);
      sell_qty := LEAST(NEW.quantity, pos_qty);

      IF sell_qty > 0 AND pos_price > 0 THEN
        -- GUARD: P&L kun når basis og pris er i samme størrelsesorden
        -- (0.4–2.5×, speiler kode-guarden PRICE_CURRENCY_MISMATCH_FACTOR).
        -- Korrupt basis (4 492 vs 618 900) eller valuta-blanding (625 000
        -- NOK vs 64 500 USDT) ga fabrikkerte «wins» som matet Kelly-sizing,
        -- vinn/tap-tellere, leaderboard og forventningsberegninger.
        basis_ratio := pos_price / NULLIF(NEW.price, 0);

        IF basis_ratio IS NOT NULL AND basis_ratio >= 0.4 AND basis_ratio <= 2.5 THEN
          NEW.realized_pnl := (NEW.price - pos_price) * sell_qty - COALESCE(NEW.fee, 0);
        ELSE
          NEW.realized_pnl := NULL;
          INSERT INTO public.balance_sync_audit (user_id, check_type, status, details)
          VALUES (
            NEW.user_id,
            'pnl_skipped_implausible_basis',
            'warning',
            jsonb_build_object(
              'session_id', NEW.session_id,
              'trade_id', NEW.id,
              'sell_price', NEW.price,
              'entry_price', pos_price,
              'basis_ratio', basis_ratio,
              'sell_qty', sell_qty
            )
          );
        END IF;
      END IF;
    END IF;
  END IF;

  RETURN NEW;
END;
$function$;

COMMIT;

-- ============================================================================
-- VERIFIKASJON etter apply (manuell, read-only):
--
-- 1) Definisjonene er erstattet:
--    SELECT pg_get_functiondef(oid) FROM pg_proc
--    WHERE proname IN ('trigger_update_session_state','trigger_compute_realized_pnl');
--    -- skal inneholde 'sell_oversell_clamped' / 'pnl_skipped_implausible_basis'
--
-- 2) Normal handel fungerer (kjør ett lite paper-kjøp + -salg i UI):
--    SELECT * FROM trades WHERE mode='paper' ORDER BY executed_at DESC LIMIT 2;
--    -- realized_pnl skal være et troverdig lite tall, ikke ≈ total_value
--
-- 3) Ingen nye fantom-kreditter:
--    SELECT count(*) FROM balance_sync_audit
--    WHERE check_type IN ('sell_oversell_clamped','pnl_skipped_implausible_basis')
--      AND created_at > now() - interval '1 day';
--    -- 0 forventet ved normal drift; >0 betyr at en kode-sti fortsatt
--    -- forsøker oversalg (da har vi navnet på den i details)
--
-- 4) Fase 0-oppførsel intakt: Toms aktive sesjon skal IKKE vokse uten
--    reelle kjøp/salg mot beholdning.
-- ============================================================================
