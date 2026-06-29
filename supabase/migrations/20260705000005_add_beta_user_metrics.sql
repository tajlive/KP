-- ============================================================================
-- Beta user daily metrics
--
-- Stores per-day trading/performance metrics for users enrolled in the beta
-- program. One row per user per day. Written by service_role jobs/crons and
-- read by authenticated users via /api/trading/v3/beta/status.
--
-- NOTE: This merges with the broader v3.0 table definition in
-- supabase/migrations/v3_0/20260406000000_v3_0_rl_beta_whitelabel.sql.
-- Only the columns used by the current API are enforced here; any extra v3.0
-- columns are preserved. No existing data is dropped or altered.
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.beta_user_metrics (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at         TIMESTAMPTZ DEFAULT now(),
  user_id            UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  date               DATE NOT NULL,
  daily_pnl          NUMERIC(18, 8),
  ending_balance     NUMERIC(18, 8),
  initial_capital    NUMERIC(18, 8),
  kill_switch_count  INTEGER DEFAULT 0,
  losing_trades      INTEGER DEFAULT 0,
  total_trades       INTEGER DEFAULT 0,
  winning_trades     INTEGER DEFAULT 0
);

-- Safely add columns that may be missing from older table definitions.
ALTER TABLE public.beta_user_metrics
  ADD COLUMN IF NOT EXISTS id UUID,
  ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT now(),
  ADD COLUMN IF NOT EXISTS user_id UUID,
  ADD COLUMN IF NOT EXISTS date DATE,
  ADD COLUMN IF NOT EXISTS daily_pnl NUMERIC(18, 8),
  ADD COLUMN IF NOT EXISTS ending_balance NUMERIC(18, 8),
  ADD COLUMN IF NOT EXISTS initial_capital NUMERIC(18, 8),
  ADD COLUMN IF NOT EXISTS kill_switch_count INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS losing_trades INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS total_trades INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS winning_trades INTEGER DEFAULT 0;

-- Unique index is created separately so it is also applied when the table
-- already exists from an older migration.
CREATE UNIQUE INDEX IF NOT EXISTS uq_beta_user_metrics_user_date
  ON public.beta_user_metrics (user_id, date);

-- Index for the main lookup pattern: today's metrics + historical per-user queries
CREATE INDEX IF NOT EXISTS idx_beta_user_metrics_user_id_date
  ON public.beta_user_metrics (user_id, date DESC);
-- Index for peak-balance lookups ordered by ending_balance
CREATE INDEX IF NOT EXISTS idx_beta_user_metrics_user_id_balance
  ON public.beta_user_metrics (user_id, ending_balance DESC);

-- Row Level Security
ALTER TABLE public.beta_user_metrics ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS beta_user_metrics_select_own ON public.beta_user_metrics;
CREATE POLICY beta_user_metrics_select_own
  ON public.beta_user_metrics
  FOR SELECT TO authenticated
  USING (user_id = (select auth.uid()));
DROP POLICY IF EXISTS beta_user_metrics_service_all ON public.beta_user_metrics;
CREATE POLICY beta_user_metrics_service_all
  ON public.beta_user_metrics
  FOR ALL TO service_role
  USING (true)
  WITH CHECK (true);

-- Grants
GRANT SELECT ON public.beta_user_metrics TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.beta_user_metrics TO service_role;
