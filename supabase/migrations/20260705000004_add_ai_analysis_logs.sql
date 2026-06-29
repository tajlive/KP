-- Migration: Add AI analysis logs table
-- Date: 2026-07-05
-- Description: Creates the ai_analysis_logs table for free AI auto-trading analysis history
--
-- NOTE: This supersedes the older definition in
-- supabase/migrations/_historical/20260217094000_ai_auto_trading.sql.
-- Existing data is preserved; only missing columns and the foreign-key
-- action are updated (ON DELETE SET NULL to avoid losing log rows).

CREATE TABLE IF NOT EXISTS public.ai_analysis_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  symbol TEXT NOT NULL,
  prediction_action TEXT NOT NULL CHECK (prediction_action IN ('BUY', 'SELL', 'HOLD')),
  prediction_confidence DECIMAL(4,3) NOT NULL,
  sentiment_score DECIMAL(4,3) NOT NULL,
  fear_greed_index INTEGER,
  rsi DECIMAL(5,2),
  target_price DECIMAL(20,8),
  stop_loss DECIMAL(20,8),
  reason TEXT,
  executed BOOLEAN DEFAULT false,
  trade_id UUID REFERENCES paper_trades(id) ON DELETE SET NULL,
  timestamp TIMESTAMPTZ DEFAULT NOW()
);

-- Safely add columns that may be missing from older table definitions.
ALTER TABLE public.ai_analysis_logs
  ADD COLUMN IF NOT EXISTS id UUID,
  ADD COLUMN IF NOT EXISTS user_id UUID,
  ADD COLUMN IF NOT EXISTS symbol TEXT,
  ADD COLUMN IF NOT EXISTS prediction_action TEXT,
  ADD COLUMN IF NOT EXISTS prediction_confidence DECIMAL(4,3),
  ADD COLUMN IF NOT EXISTS sentiment_score DECIMAL(4,3),
  ADD COLUMN IF NOT EXISTS fear_greed_index INTEGER,
  ADD COLUMN IF NOT EXISTS rsi DECIMAL(5,2),
  ADD COLUMN IF NOT EXISTS target_price DECIMAL(20,8),
  ADD COLUMN IF NOT EXISTS stop_loss DECIMAL(20,8),
  ADD COLUMN IF NOT EXISTS reason TEXT,
  ADD COLUMN IF NOT EXISTS executed BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS trade_id UUID,
  ADD COLUMN IF NOT EXISTS timestamp TIMESTAMPTZ DEFAULT NOW();

-- Ensure the trade_id foreign key uses ON DELETE SET NULL. This is safe because
-- SET NULL is less restrictive than the default NO ACTION / RESTRICT.
ALTER TABLE public.ai_analysis_logs
  DROP CONSTRAINT IF EXISTS ai_analysis_logs_trade_id_fkey;
ALTER TABLE public.ai_analysis_logs
  ADD CONSTRAINT ai_analysis_logs_trade_id_fkey
  FOREIGN KEY (trade_id) REFERENCES paper_trades(id) ON DELETE SET NULL;

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_ai_analysis_logs_user_id ON public.ai_analysis_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_ai_analysis_logs_symbol ON public.ai_analysis_logs(symbol);
CREATE INDEX IF NOT EXISTS idx_ai_analysis_logs_timestamp ON public.ai_analysis_logs(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_ai_analysis_logs_user_timestamp ON public.ai_analysis_logs(user_id, timestamp DESC);

-- Enable RLS
ALTER TABLE public.ai_analysis_logs ENABLE ROW LEVEL SECURITY;

-- Users can only view their own AI logs
DROP POLICY IF EXISTS "Users can view own AI logs" ON public.ai_analysis_logs;
CREATE POLICY "Users can view own AI logs"
  ON public.ai_analysis_logs FOR SELECT
  USING (user_id = auth.uid());

-- Users can only insert their own AI logs
DROP POLICY IF EXISTS "Users can insert own AI logs" ON public.ai_analysis_logs;
CREATE POLICY "Users can insert own AI logs"
  ON public.ai_analysis_logs FOR INSERT
  WITH CHECK (user_id = auth.uid());

-- Users can only update their own AI logs
DROP POLICY IF EXISTS "Users can update own AI logs" ON public.ai_analysis_logs;
CREATE POLICY "Users can update own AI logs"
  ON public.ai_analysis_logs FOR UPDATE
  USING (user_id = auth.uid());

-- Service role can manage all AI logs
DROP POLICY IF EXISTS "Service role full access AI logs" ON public.ai_analysis_logs;
CREATE POLICY "Service role full access AI logs"
  ON public.ai_analysis_logs FOR ALL TO service_role
  USING (true) WITH CHECK (true);

-- Comments
COMMENT ON TABLE public.ai_analysis_logs IS 'AI auto-trading analysis logs using free Cloudflare Workers AI';
COMMENT ON COLUMN public.ai_analysis_logs.prediction_action IS 'AI predicted action: BUY, SELL, or HOLD';
COMMENT ON COLUMN public.ai_analysis_logs.prediction_confidence IS 'AI confidence score 0.0-1.0';
COMMENT ON COLUMN public.ai_analysis_logs.sentiment_score IS 'Aggregated sentiment score -1.0 to 1.0';
COMMENT ON COLUMN public.ai_analysis_logs.fear_greed_index IS 'Market fear & greed index 0-100';

-- Grants
GRANT SELECT, INSERT, UPDATE ON public.ai_analysis_logs TO authenticated;
GRANT ALL ON public.ai_analysis_logs TO service_role;
