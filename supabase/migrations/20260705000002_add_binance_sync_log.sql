-- Migration: Add binance_sync_log table
-- Tracks Binance portfolio sync attempts per user for observability and debugging.
--
-- NOTE: This merges with the older definition in
-- supabase/migrations/_historical/20250213000000_binance_portfolio_sync.sql.
-- Existing data is preserved and RLS policies/grants are added.

-- 1. TABLE
CREATE TABLE IF NOT EXISTS public.binance_sync_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    status TEXT NOT NULL CHECK (status IN ('success', 'error', 'in_progress')),
    message TEXT,
    balances_synced INTEGER DEFAULT 0,
    positions_synced INTEGER DEFAULT 0,
    started_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    completed_at TIMESTAMP WITH TIME ZONE,
    error_details TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Safely add columns that may be missing from older table definitions.
ALTER TABLE public.binance_sync_log
  ADD COLUMN IF NOT EXISTS id UUID,
  ADD COLUMN IF NOT EXISTS user_id UUID,
  ADD COLUMN IF NOT EXISTS status TEXT,
  ADD COLUMN IF NOT EXISTS message TEXT,
  ADD COLUMN IF NOT EXISTS balances_synced INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS positions_synced INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS started_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  ADD COLUMN IF NOT EXISTS completed_at TIMESTAMP WITH TIME ZONE,
  ADD COLUMN IF NOT EXISTS error_details TEXT,
  ADD COLUMN IF NOT EXISTS created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

COMMENT ON TABLE public.binance_sync_log IS 'Logs each Binance portfolio sync attempt per user.';
COMMENT ON COLUMN public.binance_sync_log.status IS 'Sync status: success, error, or in_progress.';
COMMENT ON COLUMN public.binance_sync_log.error_details IS 'Detailed error payload when status is error.';

-- 2. INDEXES
CREATE INDEX IF NOT EXISTS idx_binance_sync_log_user
    ON public.binance_sync_log(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_binance_sync_log_status
    ON public.binance_sync_log(status, created_at DESC);

-- 3. ROW LEVEL SECURITY
ALTER TABLE public.binance_sync_log ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can view own binance sync logs" ON public.binance_sync_log;
CREATE POLICY "Users can view own binance sync logs"
    ON public.binance_sync_log FOR SELECT
    USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can insert own binance sync logs" ON public.binance_sync_log;
CREATE POLICY "Users can insert own binance sync logs"
    ON public.binance_sync_log FOR INSERT
    WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "Service role full access binance sync log" ON public.binance_sync_log;
CREATE POLICY "Service role full access binance sync log"
    ON public.binance_sync_log FOR ALL TO service_role
    USING (true) WITH CHECK (true);

-- 4. GRANTS
GRANT SELECT, INSERT ON public.binance_sync_log TO authenticated;
GRANT ALL ON public.binance_sync_log TO service_role;
