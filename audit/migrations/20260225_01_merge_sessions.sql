-- ============================================================================
-- MIGRATION: Merge auto_trading_sessions → trading_sessions
-- Dato: 2026-02-25
-- Formål: Fikse P0.3 - Duplikate session tabeller
-- ============================================================================

BEGIN;

-- ============================================================================
-- STEP 1: Legg til manglende kolonner i trading_sessions
-- ============================================================================

-- Sjekk om kolonner eksisterer
DO $$
BEGIN
  -- is_paper_trading (for å erstatte mode)
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'trading_sessions' AND column_name = 'is_paper_trading'
  ) THEN
    ALTER TABLE trading_sessions ADD COLUMN is_paper_trading BOOLEAN DEFAULT true;
  END IF;
  
  -- strategy_name (for kompatibilitet med auto_trading_sessions)
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'trading_sessions' AND column_name = 'strategy_name'
  ) THEN
    ALTER TABLE trading_sessions ADD COLUMN strategy_name TEXT;
  END IF;
  
  -- config_id (FK til user_auto_trading_configs)
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'trading_sessions' AND column_name = 'config_id'
  ) THEN
    ALTER TABLE trading_sessions ADD COLUMN config_id UUID REFERENCES user_auto_trading_configs(id);
  END IF;
  
  -- phase (paper/micro/small/full)
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'trading_sessions' AND column_name = 'phase'
  ) THEN
    ALTER TABLE trading_sessions ADD COLUMN phase TEXT DEFAULT 'paper';
  END IF;
  
  -- losing_trades (mangler i trading_sessions)
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'trading_sessions' AND column_name = 'losing_trades'
  ) THEN
    ALTER TABLE trading_sessions ADD COLUMN losing_trades INTEGER DEFAULT 0;
  END IF;
  
  -- max_drawdown_pct
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'trading_sessions' AND column_name = 'max_drawdown_pct'
  ) THEN
    ALTER TABLE trading_sessions ADD COLUMN max_drawdown_pct NUMERIC(8,2) DEFAULT 0;
  END IF;
  
  -- pause_reason
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'trading_sessions' AND column_name = 'pause_reason'
  ) THEN
    ALTER TABLE trading_sessions ADD COLUMN pause_reason TEXT;
  END IF;
END $$;

-- ============================================================================
-- STEP 2: Migrer data fra auto_trading_sessions til trading_sessions
-- ============================================================================

-- Opprett en mapping tabell for å holde styr på gamle → nye IDs
CREATE TABLE IF NOT EXISTS _session_migration_map (
  old_session_id UUID PRIMARY KEY REFERENCES auto_trading_sessions(id),
  new_session_id UUID NOT NULL REFERENCES trading_sessions(id),
  migrated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Migrer hver session
INSERT INTO trading_sessions (
  user_id,
  mode,
  status,
  strategy_id,
  strategy_name,
  trading_pair,
  config_id,
  phase,
  current_capital,
  initial_capital,
  total_trades,
  winning_trades,
  losing_trades,
  total_pnl,
  max_drawdown_pct,
  pause_reason,
  last_heartbeat,
  last_tick_at,
  crash_count,
  started_at,
  stopped_at,
  is_paper_trading,
  open_position,
  created_at,
  updated_at
)
SELECT 
  ats.user_id,
  CASE WHEN ats.is_paper_trading THEN 'paper'::trading_mode ELSE 'live'::trading_mode END,
  CASE 
    WHEN ats.status = 'error' THEN 'crashed'::session_status
    ELSE ats.status::session_status
  END,
  COALESCE((
    SELECT id::text FROM auto_trading_strategies 
    WHERE name = ats.strategy_name LIMIT 1
  ), 'dca') as strategy_id,
  ats.strategy_name,
  COALESCE((
    SELECT trading_pair FROM trading_sessions 
    WHERE user_id = ats.user_id LIMIT 1
  ), 'BTC/USDT') as trading_pair,
  ats.config_id,
  ats.phase,
  ats.current_capital_nok,
  ats.starting_capital_nok,
  ats.total_trades,
  ats.winning_trades,
  ats.losing_trades,
  ats.total_pnl_nok,
  ats.max_drawdown_pct,
  ats.pause_reason,
  COALESCE(ats.updated_at, ats.started_at) as last_heartbeat,
  NULL as last_tick_at,
  0 as crash_count,
  ats.started_at,
  ats.ended_at as stopped_at,
  ats.is_paper_trading,
  NULL as open_position,  -- Tapt data - må reconstruct fra trades hvis mulig
  ats.created_at,
  ats.updated_at
FROM auto_trading_sessions ats
WHERE NOT EXISTS (
  SELECT 1 FROM _session_migration_map m 
  WHERE m.old_session_id = ats.id
)
ON CONFLICT DO NOTHING
RETURNING id, (SELECT id FROM auto_trading_sessions WHERE id = trading_sessions.id);

-- ============================================================================
-- STEP 3: Oppdater mapping tabell
-- ============================================================================

INSERT INTO _session_migration_map (old_session_id, new_session_id)
SELECT 
  ats.id as old_session_id,
  ts.id as new_session_id
FROM auto_trading_sessions ats
JOIN trading_sessions ts ON (
  ts.user_id = ats.user_id 
  AND ts.started_at = ats.started_at
  AND ts.strategy_name = ats.strategy_name
)
WHERE NOT EXISTS (
  SELECT 1 FROM _session_migration_map m 
  WHERE m.old_session_id = ats.id
);

-- ============================================================================
-- STEP 4: Verifiser migrering
-- ============================================================================

DO $$
DECLARE
  v_old_count INTEGER;
  v_new_count INTEGER;
  v_migrated_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO v_old_count FROM auto_trading_sessions;
  SELECT COUNT(*) INTO v_new_count FROM trading_sessions;
  SELECT COUNT(*) INTO v_migrated_count FROM _session_migration_map;
  
  RAISE NOTICE 'Migrering status:';
  RAISE NOTICE '  - Gamle sessions (auto_trading_sessions): %', v_old_count;
  RAISE NOTICE '  - Nye sessions (trading_sessions): %', v_new_count;
  RAISE NOTICE '  - Migrerte mappings: %', v_migrated_count;
  
  IF v_migrated_count < v_old_count THEN
    RAISE WARNING '⚠️  % sessions ble ikke migrert!', v_old_count - v_migrated_count;
  END IF;
END $$;

COMMIT;
