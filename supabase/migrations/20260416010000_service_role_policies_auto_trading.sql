-- Migration: Add service_role policies for auto-trading pipeline
-- The Edge Functions and cron jobs run as service_role and need 
-- explicit RLS policies to access tables with RLS enabled.
-- Without these, all service_role queries return empty results.

-- ============================================================================
-- auto_trade_log: Used by both Edge Function and Vercel cron to log trades
-- ============================================================================
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'auto_trade_log' 
    AND policyname = 'Service role full access auto_trade_log'
  ) THEN
    CREATE POLICY "Service role full access auto_trade_log"
      ON auto_trade_log FOR ALL TO service_role
      USING (true) WITH CHECK (true);
  END IF;
END $$;

-- ============================================================================
-- auto_trading_trades: Used by auto-trade executor for trade records
-- ============================================================================
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'auto_trading_trades' 
    AND policyname = 'Service role full access auto_trading_trades'
  ) THEN
    CREATE POLICY "Service role full access auto_trading_trades"
      ON auto_trading_trades FOR ALL TO service_role
      USING (true) WITH CHECK (true);
  END IF;
END $$;

-- ============================================================================
-- trades: Core trade table used by tick engine and paper trading
-- ============================================================================
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'trades' 
    AND policyname = 'Service role full access trades'
  ) THEN
    CREATE POLICY "Service role full access trades"
      ON trades FOR ALL TO service_role
      USING (true) WITH CHECK (true);
  END IF;
END $$;

-- ============================================================================
-- trading_sessions: Read/update by tick engine for balance and heartbeat
-- ============================================================================
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'trading_sessions' 
    AND policyname = 'Service role full access trading_sessions'
  ) THEN
    CREATE POLICY "Service role full access trading_sessions"
      ON trading_sessions FOR ALL TO service_role
      USING (true) WITH CHECK (true);
  END IF;
END $$;

-- ============================================================================
-- auto_trade_settings: Read by auto-trade to find active traders
-- ============================================================================
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'auto_trade_settings' 
    AND policyname = 'Service role full access auto_trade_settings'
  ) THEN
    CREATE POLICY "Service role full access auto_trade_settings"
      ON auto_trade_settings FOR ALL TO service_role
      USING (true) WITH CHECK (true);
  END IF;
END $$;

-- ============================================================================
-- sonar_sentiment_cache: Used by Edge Function for caching sentiment
-- ============================================================================
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'sonar_sentiment_cache' 
    AND policyname = 'Service role full access sonar_sentiment_cache'
  ) THEN
    CREATE POLICY "Service role full access sonar_sentiment_cache"
      ON sonar_sentiment_cache FOR ALL TO service_role
      USING (true) WITH CHECK (true);
  END IF;
END $$;
