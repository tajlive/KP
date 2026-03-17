-- =============================================================================
-- Enable Supabase Realtime for core app tables (postgres_changes)
-- Used by: PaperTradingList, PaperTradingSessionDetail, usePulseData,
--          NotificationTray, useTrading, admin dashboards, BotStatusCard, etc.
-- Free tier: 200 peak concurrent connections, 2M messages/month (no cost).
-- Idempotent: only adds tables not already in supabase_realtime.
-- =============================================================================

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'trading_sessions') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE trading_sessions;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'trades') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE trades;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'notifications') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE notifications;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'user_profiles') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE user_profiles;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'beta_signups') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE beta_signups;
  END IF;
END $$;
