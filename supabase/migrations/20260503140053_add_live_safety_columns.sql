-- Add live trading safety columns for go-live
-- 2026-05-03

-- User must explicitly accept risk before going live
ALTER TABLE public.user_profiles
ADD COLUMN IF NOT EXISTS risk_accepted_at TIMESTAMPTZ;

-- Track user's live phase: none -> micro -> small -> full
ALTER TABLE public.user_profiles
ADD COLUMN IF NOT EXISTS live_phase TEXT NOT NULL DEFAULT 'none'
CHECK (live_phase IN ('none', 'micro', 'small', 'full'));

-- Track expected vs actual PnL for backtest validation
ALTER TABLE public.trading_sessions
ADD COLUMN IF NOT EXISTS backtest_expected_pnl NUMERIC;

-- Index for quick lookup of users ready for live
CREATE INDEX IF NOT EXISTS idx_user_profiles_live_ready
ON public.user_profiles(live_phase, tier)
WHERE live_phase != 'none';

COMMENT ON COLUMN public.user_profiles.risk_accepted_at IS 'Timestamp when user explicitly accepted trading risks';
COMMENT ON COLUMN public.user_profiles.live_phase IS 'Live trading phase: none|micro|small|full';
COMMENT ON COLUMN public.trading_sessions.backtest_expected_pnl IS 'Expected PnL from backtest for this session config';
