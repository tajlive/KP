-- ============================================================================
-- 20260726120000: Par-normalisering + orphan-posisjonsredning (samlet)
--
-- Bakgrunn (verifisert i prod 2026-07-25):
--   1. trading_pair finnes i TO formater ("BTCUSDT" og "BTC/USDT") — bryter
--      all gruppering per par og den tidligere unike delindeksen.
--   2. Stoppede sesjoner etterlater åpne posisjoner (orphans) som ALDRI
--      selges fordi exit-logikken kun kjører på aktive sesjoner.
--      Prod-bevis: 63 stoppede sesjoner, 8 med open_position.
--      VIKTIG: stopp-flyten (api/trading-sessions/[id]/status) setter
--      archived=true ved stopp — orphanene er derfor i hovedsak ARKIVERTE.
--      Et archived=false-filter ville reddet ~0 av dem, og er fjernet
--      (2026-07-26, review-funn). Filteret på status='stopped' er
--      tilstrekkelig: aktive/pausede sesjoner eier sine posisjoner selv.
--
-- Denne migrasjonen:
--   A. Normaliserer trading_pair til kanonisk format ("BTCUSDT") overalt.
--   B. Slår sammen orphan-posisjoner fra stoppede sesjoner (uavhengig av
--      archived-flagget) og flytter dem til brukerens AKTIVE, ikke-arkiverte
--      sesjon for samme (normaliserte) par. Vektet snittinngang, tidligste
--      entry_time, maks highest_price. FIFO-lots konkateneres her i SQL
--      (sortert på timestamp); posisjoner uten lots får et syntetisk lot
--      bygget fra quantity/entry_price/entry_time.
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
  -- ALLE stoppede sesjoner med åpen posisjon — også arkiverte, fordi
  -- stopp-flyten arkiverer ved stopp (se header). status='stopped' er
  -- det semantiske filteret; archived sier bare noe om visning.
  SELECT
    s.id,
    s.user_id,
    s.trading_pair AS npair,
    s.open_position
  FROM trading_sessions s
  WHERE s.status = 'stopped'
    AND s.open_position IS NOT NULL
    AND (s.open_position->>'quantity')::numeric > 0
),
targets AS (
  -- Én aktiv, ikke-arkivert sesjon per bruker+par (nyeste vinner).
  -- archived=false beholdes HER: en posisjon skal aldri flyttes INN i
  -- en arkivert sesjon (den ville ikke blitt ticket).
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
-- Normalisér lots per posisjon: bruk eksisterende lots-array, eller
-- syntetisér ETT lot fra quantity/entry_price/entry_time (samme form
-- som position-ledger.ts: { id, quantity, entryPrice, timestamp,
-- originalQuantity }).
lots_per_position AS (
  SELECT
    target_id,
    CASE
      WHEN jsonb_typeof(pos->'lots') = 'array'
           AND jsonb_array_length(pos->'lots') > 0
        THEN pos->'lots'
      ELSE jsonb_build_array(
        jsonb_build_object(
          'id', 'migrated-' || coalesce(source_id::text, 'target-' || target_id::text),
          'quantity', (pos->>'quantity')::numeric,
          'entryPrice', (pos->>'entry_price')::numeric,
          'timestamp', pos->>'entry_time',
          'originalQuantity', (pos->>'quantity')::numeric
        )
      )
    END AS lots
  FROM all_positions
),
expanded_lots AS (
  SELECT
    lpp.target_id,
    lot AS lot_json,
    coalesce(lot->>'timestamp', '') AS ts
  FROM lots_per_position lpp,
       jsonb_array_elements(lpp.lots) AS lot
),
merged_lots AS (
  -- FIFO-rekkefølge: eldste lot først
  SELECT target_id, jsonb_agg(lot_json ORDER BY ts) AS lots
  FROM expanded_lots
  GROUP BY target_id
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
  SET open_position = m.new_position || jsonb_build_object('lots', ml.lots)
  FROM merged m
  JOIN merged_lots ml ON ml.target_id = m.target_id
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
--    WHERE status='stopped' AND open_position IS NOT NULL;
--    → skal være 0 (også arkiverte — de var hovedmengden, se header)
-- 3. Re-kjøring av migrasjonen skal gi posisjoner_adoptert = 0 (idempotent).
