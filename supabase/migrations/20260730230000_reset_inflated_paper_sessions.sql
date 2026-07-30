-- System-rydding: tilbakestill alle paper-sesjoner med inflert kapital.
-- Årsak: smart-trader-v3 brukte USDT-priser mot NOK-kapital og solgte
-- posisjoner fra galt par, noe som ga inflerte current_capital-verdier.
-- Denne migrasjonen tilbakestiller de berørte sesjonene til startkapital
-- og arkiverer dem, slik at brukerne kan starte ferske paper-sesjoner.
-- Idempotent — trygg å kjøre flere ganger.

BEGIN;

-- 1) Marker handler fra korrumperte paper-sesjoner som avbrutt/ugyldige
UPDATE trades
SET status = 'cancelled'
WHERE session_id IN (
  SELECT id
  FROM trading_sessions
  WHERE mode = 'paper'
    AND (current_capital_nok > 200000 OR current_capital_nok < 0)
)
  AND status = 'filled';

-- 2) Tilbakestill de berørte sesjonene
UPDATE trading_sessions
SET
  status = 'stopped',
  archived = true,
  archived_at = COALESCE(archived_at, now()),
  current_capital_nok = starting_capital_nok,
  current_capital = starting_capital_nok,
  total_pnl = 0,
  open_position = null,
  smart_trader_enabled = false,
  error_message = COALESCE(
    error_message,
    'Auto-reset: inflert paper-saldo nullstilt av systemvedlikehold 2026-07-30'
  ),
  updated_at = now()
WHERE mode = 'paper'
  AND (current_capital_nok > 200000 OR current_capital_nok < 0);

-- 3) Sørg for at ingen aktive paper-sesjoner har igjen feil open_position
UPDATE trading_sessions
SET open_position = null, updated_at = now()
WHERE mode = 'paper'
  AND status = 'active'
  AND open_position IS NOT NULL;

COMMIT;
