-- ============================================================================
-- MIGRATION: Add missing foreign key constraints
-- Date: 2026-02-25
-- Author: KIMI Audit
-- ============================================================================
-- Purpose: Ensure referential integrity
-- Risk: MEDIUM - May fail if orphaned data exists
-- ============================================================================

BEGIN;

-- ============================================================================
-- STEP 1: Add FK to trading_sessions.user_id (if not exists)
-- ============================================================================
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'fk_trading_sessions_user'
    AND table_name = 'trading_sessions'
  ) THEN
    ALTER TABLE trading_sessions
      ADD CONSTRAINT fk_trading_sessions_user
      FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
    RAISE NOTICE 'Added FK: trading_sessions.user_id -> auth.users.id';
  END IF;
END $$;

-- ============================================================================
-- STEP 2: Add FK to trades.session_id (verify existing)
-- ============================================================================
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'fk_trades_session'
    AND table_name = 'trades'
  ) THEN
    -- First clean up orphaned trades
    DELETE FROM trades 
    WHERE session_id IS NOT NULL 
    AND NOT EXISTS (
      SELECT 1 FROM trading_sessions ts WHERE ts.id = trades.session_id
    );
    
    ALTER TABLE trades
      ADD CONSTRAINT fk_trades_session
      FOREIGN KEY (session_id) REFERENCES trading_sessions(id) ON DELETE CASCADE;
    RAISE NOTICE 'Added FK: trades.session_id -> trading_sessions.id';
  END IF;
END $$;

-- ============================================================================
-- STEP 3: Add FK to trades.user_id
-- ============================================================================
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'fk_trades_user'
    AND table_name = 'trades'
  ) THEN
    -- Clean up orphaned trades
    DELETE FROM trades 
    WHERE NOT EXISTS (
      SELECT 1 FROM auth.users u WHERE u.id = trades.user_id
    );
    
    ALTER TABLE trades
      ADD CONSTRAINT fk_trades_user
      FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
    RAISE NOTICE 'Added FK: trades.user_id -> auth.users.id';
  END IF;
END $$;

-- ============================================================================
-- STEP 4: Add FK for copy-trading leader_trade_id
-- ============================================================================
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'fk_trades_leader'
    AND table_name = 'trades'
  ) THEN
    ALTER TABLE trades
      ADD CONSTRAINT fk_trades_leader
      FOREIGN KEY (leader_trade_id) REFERENCES trades(id) ON DELETE SET NULL;
    RAISE NOTICE 'Added FK: trades.leader_trade_id -> trades.id';
  END IF;
END $$;

-- ============================================================================
-- STEP 5: Add FK for copy_trading_follows
-- ============================================================================
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'fk_copy_follows_follower'
    AND table_name = 'copy_trading_follows'
  ) THEN
    ALTER TABLE copy_trading_follows
      ADD CONSTRAINT fk_copy_follows_follower
      FOREIGN KEY (follower_id) REFERENCES auth.users(id) ON DELETE CASCADE;
    RAISE NOTICE 'Added FK: copy_trading_follows.follower_id -> auth.users.id';
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'fk_copy_follows_leader'
    AND table_name = 'copy_trading_follows'
  ) THEN
    ALTER TABLE copy_trading_follows
      ADD CONSTRAINT fk_copy_follows_leader
      FOREIGN KEY (leader_id) REFERENCES auth.users(id) ON DELETE CASCADE;
    RAISE NOTICE 'Added FK: copy_trading_follows.leader_id -> auth.users.id';
  END IF;
END $$;

-- ============================================================================
-- STEP 6: Add check constraints for data integrity
-- ============================================================================
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'chk_trades_positive_quantity'
    AND table_name = 'trades'
  ) THEN
    ALTER TABLE trades
      ADD CONSTRAINT chk_trades_positive_quantity
      CHECK (quantity > 0);
    RAISE NOTICE 'Added CHECK: trades.quantity > 0';
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'chk_trades_positive_price'
    AND table_name = 'trades'
  ) THEN
    ALTER TABLE trades
      ADD CONSTRAINT chk_trades_positive_price
      CHECK (price > 0);
    RAISE NOTICE 'Added CHECK: trades.price > 0';
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'chk_sessions_positive_capital'
    AND table_name = 'trading_sessions'
  ) THEN
    ALTER TABLE trading_sessions
      ADD CONSTRAINT chk_sessions_positive_capital
      CHECK (current_capital >= 0 AND initial_capital > 0);
    RAISE NOTICE 'Added CHECK: trading_sessions capital constraints';
  END IF;
END $$;

-- ============================================================================
-- STEP 7: Create indexes for FK columns
-- ============================================================================
CREATE INDEX IF NOT EXISTS idx_trades_user_session 
  ON trades (user_id, session_id);

CREATE INDEX IF NOT EXISTS idx_trades_leader 
  ON trades (leader_trade_id) WHERE leader_trade_id IS NOT NULL;

-- ============================================================================
-- STEP 8: Verify all constraints
-- ============================================================================
DO $$
DECLARE
  constraint_record RECORD;
BEGIN
  RAISE NOTICE 'Current Foreign Keys:';
  FOR constraint_record IN 
    SELECT 
      tc.table_name,
      tc.constraint_name,
      kcu.column_name,
      ccu.table_name AS foreign_table,
      ccu.column_name AS foreign_column
    FROM information_schema.table_constraints tc
    JOIN information_schema.key_column_usage kcu 
      ON tc.constraint_name = kcu.constraint_name
    JOIN information_schema.constraint_column_usage ccu 
      ON ccu.constraint_name = tc.constraint_name
    WHERE tc.constraint_type = 'FOREIGN KEY'
    AND tc.table_name IN ('trading_sessions', 'trades', 'copy_trading_follows')
  LOOP
    RAISE NOTICE '  %.% -> %.%', 
      constraint_record.table_name, 
      constraint_record.column_name,
      constraint_record.foreign_table,
      constraint_record.foreign_column;
  END LOOP;
END $$;

COMMIT;

-- ============================================================================
-- VERIFICATION QUERIES
-- ============================================================================
/*
-- List all foreign keys
SELECT 
  tc.table_name,
  tc.constraint_name,
  kcu.column_name,
  ccu.table_name AS foreign_table,
  ccu.column_name AS foreign_column
FROM information_schema.table_constraints tc
JOIN information_schema.key_column_usage kcu 
  ON tc.constraint_name = kcu.constraint_name
JOIN information_schema.constraint_column_usage ccu 
  ON ccu.constraint_name = tc.constraint_name
WHERE tc.constraint_type = 'FOREIGN KEY'
ORDER BY tc.table_name;

-- Check for orphaned records
SELECT 'trades with invalid session' as check_name, COUNT(*)
FROM trades t
WHERE NOT EXISTS (SELECT 1 FROM trading_sessions ts WHERE ts.id = t.session_id)

UNION ALL

SELECT 'trades with invalid user', COUNT(*)
FROM trades t
WHERE NOT EXISTS (SELECT 1 FROM auth.users u WHERE u.id = t.user_id);
*/
