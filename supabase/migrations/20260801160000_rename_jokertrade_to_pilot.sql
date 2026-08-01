-- 20260801160000_rename_jokertrade_to_pilot.sql
-- ============================================================
-- Rename JokerTrade → Pilot (Toms beslutning 2026-08-01):
--   joker_trade       → pilot_trade
--   joker_explanation → pilot_explanation
--   jokertrade_health_guard  → pilot_health_guard
--   jokertrade_emergency_stop → pilot_emergency_stop
--   jokertrade_resume         → pilot_resume
-- + on_trade_create_event oppdateres (refererer kolonnene).
-- Data bevares 1:1 (rename, ingen transformasjon). Idempotent.
-- ============================================================

-- 1) Kolonner på trades (append-only ledger — rename bevarer historikk)
ALTER TABLE public.trades RENAME COLUMN joker_trade TO pilot_trade;
ALTER TABLE public.trades RENAME COLUMN joker_explanation TO pilot_explanation;

-- 2) Funksjoner (admin/manuelle — ingen kode-kallere, ingen trigger-binding)
ALTER FUNCTION public.jokertrade_health_guard() RENAME TO pilot_health_guard;
ALTER FUNCTION public.jokertrade_emergency_stop(text) RENAME TO pilot_emergency_stop;
ALTER FUNCTION public.jokertrade_resume(text) RENAME TO pilot_resume;

-- 3) on_trade_create_event — leser de renamede kolonnene + ny tekst
CREATE OR REPLACE FUNCTION public.on_trade_create_event()
RETURNS TRIGGER AS $$
DECLARE
  v_display_name TEXT;
BEGIN
  -- Kun for pilot_trades
  IF NEW.pilot_trade IS NOT TRUE THEN
    RETURN NEW;
  END IF;

  -- Hent brukerens display_name
  SELECT COALESCE(display_name, 'Trader') INTO v_display_name
  FROM public.user_profiles
  WHERE id = NEW.user_id;

  -- Opprett live_event
  INSERT INTO public.live_events (type, title, description, user_display_name, metadata, created_at)
  VALUES (
    'trade',
    CASE WHEN NEW.side = 'buy' THEN '🃏 Kjøp' ELSE '🃏 Salg' END || ' ' || COALESCE(NEW.trading_pair, ''),
    COALESCE(NEW.pilot_explanation, '🎭 PilotTrade'),
    v_display_name,
    jsonb_build_object(
      'trade_id', NEW.id,
      'side', NEW.side,
      'trading_pair', NEW.trading_pair,
      'quantity', NEW.quantity,
      'price', NEW.price
    ),
    COALESCE(NEW.executed_at, now())
  )
  ON CONFLICT DO NOTHING;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
