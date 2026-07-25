-- ============================================================================
-- 20260726120000: Par-normalisering + orphan-posisjonsredning (samlet)
--
-- Bakgrunn (verifisert i prod 2026-07-25):
--   1. trading_pair finnes i TO formater ("BTCUSDT" og "BTC/USDT") — bryter
--      all gruppering per par og den tidligere unike delindeksen.
--   2. Stoppede sesjoner etterlater åpne posisjoner (orphans) som ALDRI
--      selges fordi exit-logikken kun kjører på aktive sesjoner.
--      Prod-bevis: 63 stoppede sesjoner, 8 med open_position.
--
-- Denne migrasjonen:
--   A. Normaliserer trading_pair til kanonisk format ("BTCUSDT") overalt.
--   B. Slår sammen orphan-posisjoner fra stoppede sesjoner og flytter dem
--      til brukerens aktive sesjon for samme (normaliserte) par.
--      Vektet snittinngang, tidligste entry_time, maks highest_price.
--      FIFO-lots konkateneres (sortering håndteres i kode ved neste tick).
--   C. Nullstiller orphans etter flytting → migrasjonen er IDEMPOTENT.
--
-- Merk: brukerdata seedes/modifiseres ikke — kun posisjons-eierskap flyttes
-- innen samme bruker. Ingen trades røres (historikken bevares).
-- ============================================================================

BEGIN;

-- ── A. Normaliser trading_pair til "BTCUSDT"-format ─────────────────────────
UPDATE trading_sessions
SET trading_pair = upper(replace(trading_pair, '/', ''))
WHERE trading_pair LIKE '%/%' OR trading_pair <> upper(trading_pair);

-- ── B+C. Adopter orphan-posisjoner til aktive sesjoner ──────────────────────
WITH orphans AS (
  SELECT
    s.id,
    s.user_id,
    s.trading_pair AS npair,
    s.open_position
  FROM trading_sessions s
  WHERE s.status = 'stopped'
    AND s.archived = false
    AND s.open_position IS NOT NULL
    AND (s.open_position->>'quantity')::numeric > 0
),
targets AS (
  -- Én aktiv sesjon per bruker+par (nyeste vinner)
  SELECT DISTINCT ON (a.user_id, a.trading_pair)
    a.id,
    a.user_id,
    a.trading_pair AS npair,
    a.open_position
  FROM trading_sessions a
  WHERE a.status = 'active'
    AND a.archived = false
  ORDER BY a.user_id, a.trading_pair, a.created_at DESC
),
-- Behandle target sin eksisterende posisjon som et ekstra lot i summen
all_positions AS (
  SELECT
    t.id AS target_id,
    o.id AS source_id,
    o.open_position AS pos
  FROM orphans o
  JOIN targets t ON t.user_id = o.user_id AND t.npair = o.npair

  UNION ALL

  SELECT
    t.id AS target_id,
    NULL::uuid AS source_id,
    t.open_position AS pos
  FROM targets t
  WHERE t.open_position IS NOT NULL
    AND (t.open_position->>'quantity')::numeric > 0
    AND EXISTS (
      SELECT 1 FROM orphans o
      JOIN targets t2 ON t2.user_id = o.user_id AND t2.npair = o.npair
      WHERE t2.id = t.id
    )
),
merged AS (
  SELECT
    target_id,
    jsonb_build_object(
      'side', 'long',
      'quantity',
        sum((pos->>'quantity')::numeric),
      'entry_price',
        sum((pos->>'quantity')::numeric * (pos->>'entry_price')::numeric)
        / nullif(sum((pos->>'quantity')::numeric), 0),
      'entry_time',
        min(pos->>'entry_time'),
      'highest_price',
        max(coalesce(
          (pos->>'highest_price')::numeric,
          (pos->>'entry_price')::numeric
        ))
    ) AS new_position,
    array_agg(source_id) FILTER (WHERE source_id IS NOT NULL) AS orphan_ids
  FROM all_positions
  GROUP BY target_id
),
updated AS (
  UPDATE trading_sessions a
  SET open_position = m.new_position
  FROM merged m
  WHERE a.id = m.target_id
  RETURNING a.id
),
cleared AS (
  UPDATE trading_sessions s
  SET open_position = NULL
  WHERE s.id IN (
    SELECT unnest(orphan_ids) FROM merged
  )
  RETURNING s.id
)
SELECT
  (SELECT count(*) FROM updated) AS posisjoner_adoptert,
  (SELECT count(*) FROM cleared) AS orphans_nullstilt;

COMMIT;

-- ── Verifikasjon (kjøres etterpå, manuelt): ─────────────────────────────────
-- 1. SELECT count(*) FROM trading_sessions WHERE trading_pair LIKE '%/%';
--    → skal være 0
-- 2. SELECT count(*) FROM trading_sessions
--    WHERE status='stopped' AND archived=false AND open_position IS NOT NULL;
--    → skal være 0
-- 3. Re-kjøring av migrasjonen skal gi posisjoner_adoptert = 0 (idempotent).
