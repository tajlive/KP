-- ============================================================================
-- PERFORMANCE OPTIMIZATION — 2026-04-30
-- Basert på pg_stat_statements + pg_stat_user_indexes analyse
-- ============================================================================

-- ─── 1. DROP UBruKTE INDEKSER (~100 MB spart, raskere writes) ──────────────

-- 95 MB wasted, 0 scans. unified_notifications er 2.1 GB med 25.4M INSERTs.
-- Dette er største enkelt-vinst.
DROP INDEX IF EXISTS idx_unified_notifications_user_id;

-- 4 MB wasted, 0 scans — SKIPPED: dette er en UNIQUE CONSTRAINT, ikke en frittstående indeks.
-- Beholdes for data-integritet. Vurder å fjerne constraint hvis idempotency-key
-- ikke lenger er påkrevd.
-- ALTER TABLE unified_trades DROP CONSTRAINT IF EXISTS unified_trades_idempotency_key_key;

-- 200 KB wasted, 0 scans
DROP INDEX IF EXISTS idx_ai_feature_store_created;

-- 192 KB wasted, 0 scans
DROP INDEX IF EXISTS idx_cron_job_runs_status;

-- 152 KB wasted, 0 scans
DROP INDEX IF EXISTS idx_trading_signals_ensemble_run;

-- 72 KB wasted, 0 scans (agent_id IS NOT NULL partial, aldri brukt)
DROP INDEX IF EXISTS idx_trading_signals_agent;

-- ─── 2. NYE INDEKSER for treigeste funksjoner ──────────────────────────────

-- detect_crashed_sessions():
-- UPDATE trading_sessions SET status='crashed' 
-- WHERE status='active' AND last_heartbeat < now() - '5 min'
-- Eksisterende partial indexes dekker status='active' men ikke last_heartbeat.
CREATE INDEX IF NOT EXISTS idx_trading_sessions_heartbeat_active
  ON trading_sessions(last_heartbeat)
  WHERE status = 'active';

-- seed_signal_if_stale():
-- SELECT MAX(created_at) FROM trading_signals
-- Eksisterende idx_trading_signals_signal_type_agent har created_at DESC 
-- som 3. kolonne — ikke optimal for MAX(created_at) alene.
CREATE INDEX IF NOT EXISTS idx_trading_signals_created_at
  ON trading_signals(created_at DESC);

-- process_pending_notifications() / notification_queue:
-- WHERE status='pending' AND attempts < 3 ORDER BY created_at ASC LIMIT batch_size
-- Eksisterende idx_notifications_pending dekker status='pending' + created_at,
-- men attempts < 3 er ikke indeksert. Med mange retries kan dette bli tregt.
CREATE INDEX IF NOT EXISTS idx_notification_queue_pending_attempts
  ON notification_queue(created_at ASC)
  WHERE status = 'pending' AND attempts < 3;

-- unified_trades — høy seq_scan (23K) selv med mange indekser.
-- Ofte queried med user_id + status + opened_at range.
-- Sikre at composite eksisterer (sjekk først — opprett hvis mangler).
CREATE INDEX IF NOT EXISTS idx_unified_trades_user_status_opened
  ON unified_trades(user_id, status, opened_at DESC);

-- ─── 3. FUNKSJONS-OPTIMALISERING: detect_crashed_sessions ─────────────────

-- Original: UPDATE ... RETURNING + LOOP + INSERT (N+1 pattern)
-- Optimalisert: INSERT ... SELECT i én operasjon
CREATE OR REPLACE FUNCTION detect_crashed_sessions()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Enkel INSERT ... SELECT i stedet for UPDATE RETURNING + LOOP
  INSERT INTO notification_queue (user_id, type, payload, status)
  SELECT 
    ts.user_id,
    'bot_crashed',
    jsonb_build_object('session_id', ts.id, 'detected_at', NOW()),
    'pending'
  FROM trading_sessions ts
  WHERE ts.status = 'active'
    AND ts.last_heartbeat < NOW() - INTERVAL '5 minutes'
    AND NOT EXISTS (
      SELECT 1 FROM notification_queue nq
      WHERE nq.user_id = ts.user_id
        AND nq.type = 'bot_crashed'
        AND nq.payload->>'session_id' = ts.id::text
        AND nq.created_at > NOW() - INTERVAL '1 hour'
    );

  -- Oppdater status på én gang
  UPDATE trading_sessions
  SET status = 'crashed', updated_at = NOW()
  WHERE status = 'active'
    AND last_heartbeat < NOW() - INTERVAL '5 minutes';
END;
$$;

-- ─── 4. FUNKSJONS-OPTIMALISERING: seed_signal_if_stale ─────────────────────

-- Original: SELECT MAX(created_at) uten indeks-støtte
-- Med ny idx_trading_signals_created_at blir dette raskt,
-- men vi kan også optimalisere logikken.
CREATE OR REPLACE FUNCTION seed_signal_if_stale(p_max_age_minutes INTEGER DEFAULT 5)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_latest TIMESTAMPTZ;
  v_count INTEGER := 0;
BEGIN
  -- Bruk indeksert kolonne direkte
  SELECT MAX(created_at) INTO v_latest FROM trading_signals;

  IF v_latest IS NULL OR v_latest < NOW() - make_interval(mins => p_max_age_minutes) THEN
    INSERT INTO trading_signals (
      symbol, action, confidence, entry_price, stop_loss,
      target_price, reasoning, signal_type, status, created_at
    ) VALUES (
      'BTCUSDT', 'buy', 55, NULL, NULL, NULL,
      'Fallback signal: edge signal-engine stale or unavailable',
      'technical', 'active', NOW()
    );
    v_count := 1;

    INSERT INTO bot_health (
      bot_name, status, last_heartbeat, last_error, metadata, updated_at
    ) VALUES (
      'signal-engine', 'warning', NOW(),
      'PG fallback seed: verify Edge signal-engine (pg_cron net.http_post) and DB secrets (service role).',
      jsonb_build_object('source', 'pg_fallback_seed', 'seeded_at', NOW()),
      NOW()
    )
    ON CONFLICT (bot_name) DO UPDATE SET
      last_heartbeat = EXCLUDED.last_heartbeat,
      status = EXCLUDED.status,
      last_error = EXCLUDED.last_error,
      metadata = COALESCE(bot_health.metadata, '{}'::jsonb) || EXCLUDED.metadata,
      updated_at = NOW();
  END IF;

  RETURN v_count;
END;
$$;

-- ─── 5. VACUUM ANALYZE på endrede tabeller ─────────────────────────────────

-- Oppdater stats etter index-endringer
ANALYZE trading_sessions;
ANALYZE trading_signals;
ANALYZE notification_queue;
ANALYZE unified_notifications;
ANALYZE unified_trades;

-- ─── KOMMENTARER ──────────────────────────────────────────────────────────

COMMENT ON FUNCTION detect_crashed_sessions() IS 
  'Optimalisert: INSERT ... SELECT + dedup sjekk i stedet for UPDATE RETURNING + LOOP';
COMMENT ON FUNCTION seed_signal_if_stale(INTEGER) IS 
  'Optimalisert: støttes av idx_trading_signals_created_at for rask MAX(created_at)';
