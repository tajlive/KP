-- ============================================================================
-- KLARPAKKE SYSTEM CRITICAL REPAIR - DATABASE UNIFICATION
-- Dato: 2026-02-25
-- Formål: Fjerne split-brain arkitektur, unify til single source of truth
-- ============================================================================

BEGIN;

-- ============================================================================
-- STEP 1: Sikkerhetskopier data før migrering
-- ============================================================================

CREATE TABLE IF NOT EXISTS _migration_backup_auto_sessions AS 
SELECT * FROM auto_trading_sessions;

CREATE TABLE IF NOT EXISTS _migration_backup_auto_trades AS 
SELECT * FROM auto_trading_trades;

CREATE TABLE IF NOT EXISTS _migration_backup_user_configs AS 
SELECT * FROM user_auto_trading_configs;

-- ============================================================================
-- STEP 2: Legg til manglende kolonner i trading_sessions
-- ============================================================================

DO $$
BEGIN
  -- Risk config (JSONB for fleksibel risk management)
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'trading_sessions' AND column_name = 'risk_config'
  ) THEN
    ALTER TABLE trading_sessions ADD COLUMN risk_config JSONB DEFAULT '{
      "maxPositionSizePercent": 2,
      "stopLossPercent": 1,
      "trailingStopLossPercent": 1.5,
      "maxDailyLossPercent": 5,
      "maxDailyTrades": 10,
      "maxDrawdownPercent": 15,
      "maxLeverage": 1
    }'::jsonb;
  END IF;
  
  -- Allocated capital percentage
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'trading_sessions' AND column_name = 'allocated_capital_pct'
  ) THEN
    ALTER TABLE trading_sessions ADD COLUMN allocated_capital_pct NUMERIC(5,2) DEFAULT 10.00;
  END IF;
  
  -- Phase (paper/micro/small/full)
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'trading_sessions' AND column_name = 'phase'
  ) THEN
    ALTER TABLE trading_sessions ADD COLUMN phase TEXT DEFAULT 'paper' 
      CHECK (phase IN ('paper', 'micro', 'small', 'full'));
  END IF;
  
  -- Losing trades (mangler i trading_sessions)
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'trading_sessions' AND column_name = 'losing_trades'
  ) THEN
    ALTER TABLE trading_sessions ADD COLUMN losing_trades INTEGER DEFAULT 0;
  END IF;
  
  -- Max drawdown
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'trading_sessions' AND column_name = 'max_drawdown_pct'
  ) THEN
    ALTER TABLE trading_sessions ADD COLUMN max_drawdown_pct NUMERIC(8,2) DEFAULT 0;
  END IF;
  
  -- Config reference
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'trading_sessions' AND column_name = 'config_id'
  ) THEN
    ALTER TABLE trading_sessions ADD COLUMN config_id UUID;
  END IF;
END $$;

-- ============================================================================
-- STEP 3: Opprett mapping for strategy name → strategy_id
-- ============================================================================

CREATE TABLE IF NOT EXISTS _strategy_name_mapping (
  strategy_name TEXT PRIMARY KEY,
  strategy_id TEXT NOT NULL
);

INSERT INTO _strategy_name_mapping (strategy_name, strategy_id) VALUES
  ('Konservativ', 'dca'),
  ('Balansert', 'multi_signal'),
  ('Aggressiv', 'trend_follow'),
  ('Custom', 'grid'),
  ('DCA', 'dca'),
  ('Paper Trading', 'dca')
ON CONFLICT (strategy_name) DO UPDATE SET strategy_id = EXCLUDED.strategy_id;

-- ============================================================================
-- STEP 4: Migrer data fra auto_trading_sessions til trading_sessions
-- ============================================================================

INSERT INTO trading_sessions (
  id,
  user_id,
  mode,
  status,
  strategy_id,
  strategy_config,
  trading_pair,
  config_id,
  phase,
  current_capital,
  initial_capital,
  allocated_capital_pct,
  total_trades,
  winning_trades,
  losing_trades,
  total_pnl,
  max_drawdown_pct,
  last_heartbeat,
  last_tick_at,
  crash_count,
  started_at,
  stopped_at,
  risk_config,
  created_at,
  updated_at
)
SELECT 
  ats.id,
  ats.user_id,
  CASE WHEN ats.is_paper_trading THEN 'paper'::trading_mode ELSE 'live'::trading_mode END,
  CASE 
    WHEN ats.status = 'error' THEN 'crashed'::session_status
    ELSE ats.status::session_status
  END,
  COALESCE(m.strategy_id, 'dca') as strategy_id,
  jsonb_build_object(
    'phase', ats.phase,
    'original_strategy_name', ats.strategy_name
  ) as strategy_config,
  COALESCE(uatc.allowed_symbols, ARRAY['BTC/USDT'])[1] as trading_pair,
  ats.config_id,
  ats.phase,
  ats.current_capital_nok,
  ats.starting_capital_nok,
  ats.allocated_capital_pct,
  ats.total_trades,
  ats.winning_trades,
  ats.losing_trades,
  ats.total_pnl_nok,
  ats.max_drawdown_pct,
  COALESCE(ats.updated_at, ats.started_at) as last_heartbeat,
  NULL as last_tick_at,
  0 as crash_count,
  ats.started_at,
  ats.ended_at as stopped_at,
  jsonb_build_object(
    'maxPositionSizePercent', COALESCE(uatc.allocated_capital_pct, 10),
    'stopLossPercent', 1,
    'trailingStopLossPercent', 1.5,
    'maxDailyLossPercent', COALESCE(s.daily_loss_limit_pct, 10),
    'maxDailyTrades', COALESCE(s.max_trades_per_day, 10),
    'maxDrawdownPercent', 15,
    'maxLeverage', COALESCE(s.max_leverage, 1)
  ) as risk_config,
  ats.created_at,
  ats.updated_at
FROM auto_trading_sessions ats
LEFT JOIN _strategy_name_mapping m ON m.strategy_name = ats.strategy_name
LEFT JOIN user_auto_trading_configs uatc ON uatc.id = ats.config_id
LEFT JOIN auto_trading_strategies s ON s.id = uatc.strategy_id
WHERE NOT EXISTS (
  SELECT 1 FROM trading_sessions ts WHERE ts.id = ats.id
)
ON CONFLICT (id) DO NOTHING;

-- ============================================================================
-- STEP 5: Migrer data fra auto_trading_trades til trades
-- ============================================================================

-- Legg til manglende kolonner i trades hvis de ikke finnes
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'trades' AND column_name = 'stop_loss_price'
  ) THEN
    ALTER TABLE trades ADD COLUMN stop_loss_price NUMERIC(18,8);
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'trades' AND column_name = 'take_profit_price'
  ) THEN
    ALTER TABLE trades ADD COLUMN take_profit_price NUMERIC(18,8);
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'trades' AND column_name = 'close_reason'
  ) THEN
    ALTER TABLE trades ADD COLUMN close_reason TEXT;
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'trades' AND column_name = 'exit_price'
  ) THEN
    ALTER TABLE trades ADD COLUMN exit_price NUMERIC(18,8);
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'trades' AND column_name = 'opened_at'
  ) THEN
    ALTER TABLE trades ADD COLUMN opened_at TIMESTAMPTZ;
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'trades' AND column_name = 'closed_at'
  ) THEN
    ALTER TABLE trades ADD COLUMN closed_at TIMESTAMPTZ;
  END IF;
END $$;

-- Migrer trades
INSERT INTO trades (
  id,
  session_id,
  user_id,
  idempotency_key,
  mode,
  trading_pair,
  side,
  order_type,
  quantity,
  price,
  exit_price,
  total_value,
  fee,
  status,
  realized_pnl,
  strategy_signal,
  stop_loss_price,
  take_profit_price,
  close_reason,
  opened_at,
  closed_at,
  executed_at,
  created_at
)
SELECT 
  att.id,
  att.session_id,
  att.user_id,
  'migrated-' || att.id::text as idempotency_key,
  'paper'::trading_mode as mode,
  CASE 
    WHEN att.symbol LIKE '%USDT' THEN 
      SUBSTRING(att.symbol FROM 1 FOR LENGTH(att.symbol) - 4) || '/USDT'
    WHEN att.symbol LIKE '%BTC' THEN 
      SUBSTRING(att.symbol FROM 1 FOR LENGTH(att.symbol) - 3) || '/BTC'
    ELSE att.symbol || '/USDT'
  END as trading_pair,
  CASE 
    WHEN att.side = 'LONG' THEN 'buy'::trade_side
    ELSE 'sell'::trade_side
  END as side,
  'market'::order_type as order_type,
  att.quantity,
  att.entry_price as price,
  att.exit_price,
  att.position_value_nok as total_value,
  COALESCE(att.fees_nok, 0) as fee,
  CASE 
    WHEN att.status = 'OPEN' THEN 'pending'::trade_status
    WHEN att.status = 'CLOSED' THEN 'filled'::trade_status
    WHEN att.status = 'STOPPED' THEN 'cancelled'::trade_status
    WHEN att.status = 'LIQUIDATED' THEN 'failed'::trade_status
    ELSE 'filled'::trade_status
  END as status,
  att.pnl_nok as realized_pnl,
  jsonb_build_object(
    'entry_price', att.entry_price,
    'stop_loss', att.stop_loss_price,
    'take_profit', att.take_profit_price,
    'risk_score', att.risk_score,
    'market_volatility', att.market_volatility_pct,
    'original_side', att.side,
    'original_status', att.status
  ) as strategy_signal,
  att.stop_loss_price,
  att.take_profit_price,
  att.close_reason,
  att.opened_at,
  att.closed_at,
  COALESCE(att.closed_at, att.opened_at) as executed_at,
  att.created_at
FROM auto_trading_trades att
WHERE NOT EXISTS (
  SELECT 1 FROM trades t WHERE t.id = att.id
)
ON CONFLICT (idempotency_key) DO NOTHING;

-- ============================================================================
-- STEP 6: Oppdater triggers for trades tabellen
-- ============================================================================

-- Fjern eksisterende triggers
DROP TRIGGER IF EXISTS on_trade_inserted ON trades;
DROP TRIGGER IF EXISTS on_trade_update_session ON trades;
DROP TRIGGER IF EXISTS on_trade_notify ON trades;

-- Trigger: Oppdater session state etter trade
CREATE OR REPLACE FUNCTION trigger_update_session_state()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE trading_sessions
  SET 
    current_capital = CASE
      WHEN NEW.side = 'buy' THEN current_capital - NEW.total_value - NEW.fee
      WHEN NEW.side = 'sell' THEN current_capital + NEW.total_value - NEW.fee
    END,
    open_position = CASE
      WHEN NEW.side = 'buy' AND NEW.status NOT IN ('cancelled', 'failed') THEN jsonb_build_object(
        'side', 'long',
        'quantity', NEW.quantity,
        'entry_price', NEW.price,
        'entry_time', NEW.executed_at
      )
      WHEN NEW.side = 'sell' THEN NULL
    END,
    total_trades = total_trades + 1,
    winning_trades = CASE
      WHEN NEW.realized_pnl > 0 THEN winning_trades + 1
      ELSE winning_trades
    END,
    losing_trades = CASE
      WHEN NEW.realized_pnl < 0 THEN losing_trades + 1
      ELSE losing_trades
    END,
    total_pnl = total_pnl + COALESCE(NEW.realized_pnl, 0),
    last_tick_at = now(),
    updated_at = now()
  WHERE id = NEW.session_id;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_trade_update_session
  AFTER INSERT ON trades
  FOR EACH ROW
  EXECUTE FUNCTION trigger_update_session_state();

-- Trigger: Copy-trading fan-out
CREATE OR REPLACE FUNCTION trigger_copy_trade_fanout()
RETURNS TRIGGER AS $$
DECLARE
  follow RECORD;
  leader_capital NUMERIC(15,2);
  follower_session RECORD;
  scaled_quantity NUMERIC(18,8);
BEGIN
  IF NEW.is_copy = true THEN
    RETURN NEW;
  END IF;

  SELECT current_capital INTO leader_capital
  FROM trading_sessions
  WHERE id = NEW.session_id;

  FOR follow IN
    SELECT cf.*, up.tier
    FROM copy_trading_follows cf
    JOIN user_profiles up ON up.id = cf.follower_id
    WHERE cf.leader_id = NEW.user_id
      AND cf.is_active = true
  LOOP
    SELECT * INTO follower_session
    FROM trading_sessions
    WHERE user_id = follow.follower_id
      AND trading_pair = NEW.trading_pair
      AND status = 'active'
    LIMIT 1;
    
    IF follower_session IS NULL THEN
      CONTINUE;
    END IF;

    scaled_quantity := CASE
      WHEN leader_capital > 0 THEN
        (follower_session.current_capital / leader_capital) * NEW.quantity * follow.scale_factor
      ELSE 0
    END;

    IF scaled_quantity < 0.00000001 THEN
      CONTINUE;
    END IF;

    IF follow.max_trade_size IS NOT NULL THEN
      scaled_quantity := LEAST(scaled_quantity, follow.max_trade_size / NEW.price);
    END IF;

    INSERT INTO copy_trade_queue (
      leader_trade_id, follower_id, follow_id,
      trading_pair, side, quantity, price, mode
    ) VALUES (
      NEW.id, follow.follower_id, follow.id,
      NEW.trading_pair, NEW.side, scaled_quantity, NEW.price, follower_session.mode
    )
    ON CONFLICT (leader_trade_id, follower_id) DO NOTHING;
  END LOOP;

  PERFORM pg_notify('copy_trade_queue', json_build_object(
    'leader_trade_id', NEW.id,
    'count', (SELECT COUNT(*) FROM copy_trade_queue WHERE leader_trade_id = NEW.id AND status = 'pending')
  )::text);

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_trade_inserted
  AFTER INSERT ON trades
  FOR EACH ROW
  EXECUTE FUNCTION trigger_copy_trade_fanout();

-- Trigger: Notifikasjoner
CREATE OR REPLACE FUNCTION trigger_trade_notification()
RETURNS TRIGGER AS $$
DECLARE
  should_notify BOOLEAN;
BEGIN
  SELECT email_on_trade INTO should_notify
  FROM user_profiles WHERE id = NEW.user_id;

  IF should_notify THEN
    INSERT INTO notification_queue (user_id, type, payload)
    VALUES (NEW.user_id, 'trade_executed', jsonb_build_object(
      'trade_id', NEW.id,
      'side', NEW.side,
      'quantity', NEW.quantity,
      'price', NEW.price,
      'trading_pair', NEW.trading_pair,
      'is_copy', NEW.is_copy,
      'realized_pnl', NEW.realized_pnl
    ));
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_trade_notify
  AFTER INSERT ON trades
  FOR EACH ROW
  EXECUTE FUNCTION trigger_trade_notification();

-- ============================================================================
-- STEP 7: Slett gamle tabeller (CASCADE for å fjerne alle dependencies)
-- ============================================================================

-- Fjern RLS policies først
DROP POLICY IF EXISTS "Users can view own sessions" ON auto_trading_sessions;
DROP POLICY IF EXISTS "Users can insert own sessions" ON auto_trading_sessions;
DROP POLICY IF EXISTS "Users can update own sessions" ON auto_trading_sessions;
DROP POLICY IF EXISTS "Users can view own trades" ON auto_trading_trades;
DROP POLICY IF EXISTS "Users can view own config" ON user_auto_trading_configs;
DROP POLICY IF EXISTS "Users can update own config" ON user_auto_trading_configs;
DROP POLICY IF EXISTS "Users can insert own config" ON user_auto_trading_configs;

-- Fjern triggers på gamle tabeller
DROP TRIGGER IF EXISTS on_auto_trade_update_session ON auto_trading_trades;
DROP TRIGGER IF EXISTS on_auto_trade_notify ON auto_trading_trades;
DROP TRIGGER IF EXISTS on_auto_trade_update_metrics ON auto_trading_trades;
DROP TRIGGER IF EXISTS update_auto_trading_sessions_updated_at ON auto_trading_sessions;
DROP TRIGGER IF EXISTS update_user_auto_trading_configs_updated_at ON user_auto_trading_configs;

-- Slett tabeller (CASCADE)
DROP TABLE IF EXISTS auto_trading_trades CASCADE;
DROP TABLE IF EXISTS auto_trading_sessions CASCADE;
DROP TABLE IF EXISTS user_auto_trading_configs CASCADE;

-- Slett helper tabeller
DROP TABLE IF EXISTS _strategy_name_mapping CASCADE;

-- ============================================================================
-- STEP 8: Verifiser migrering
-- ============================================================================

DO $$
DECLARE
  v_session_count INTEGER;
  v_trade_count INTEGER;
  v_backup_session_count INTEGER;
  v_backup_trade_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO v_backup_session_count FROM _migration_backup_auto_sessions;
  SELECT COUNT(*) INTO v_backup_trade_count FROM _migration_backup_auto_trades;
  SELECT COUNT(*) INTO v_session_count FROM trading_sessions;
  SELECT COUNT(*) INTO v_trade_count FROM trades WHERE idempotency_key LIKE 'migrated-%';
  
  RAISE NOTICE '══════════════════════════════════════════════════════════';
  RAISE NOTICE 'MIGRERING KOMPLETT';
  RAISE NOTICE '══════════════════════════════════════════════════════════';
  RAISE NOTICE 'Backup sessions: %', v_backup_session_count;
  RAISE NOTICE 'Backup trades: %', v_backup_trade_count;
  RAISE NOTICE 'Migrated to trading_sessions: %', v_session_count;
  RAISE NOTICE 'Migrated to trades: %', v_trade_count;
  RAISE NOTICE '══════════════════════════════════════════════════════════';
  
  -- Verifiser at gamle tabeller er slettet
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'auto_trading_sessions') THEN
    RAISE EXCEPTION 'FEIL: auto_trading_sessions finnes fremdeles!';
  END IF;
  
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'auto_trading_trades') THEN
    RAISE EXCEPTION 'FEIL: auto_trading_trades finnes fremdeles!';
  END IF;
  
  RAISE NOTICE '✅ Alle gamle tabeller er slettet';
  RAISE NOTICE '✅ Unified trading system er aktiv';
END $$;

COMMIT;
