-- Create backtests table for storing backtest results
CREATE TABLE IF NOT EXISTS public.auto_trading_backtests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  strategy_id UUID REFERENCES public.auto_trading_strategies(id) ON DELETE CASCADE NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  initial_capital DECIMAL(20, 2) NOT NULL DEFAULT 100000,
  symbols TEXT[] NOT NULL DEFAULT ARRAY['BTCUSDT', 'ETHUSDT'],
  result JSONB NOT NULL,
  is_valid BOOLEAN NOT NULL DEFAULT false,
  confidence_score INTEGER NOT NULL DEFAULT 0,
  recommendation TEXT NOT NULL DEFAULT 'reject',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.auto_trading_backtests ENABLE ROW LEVEL SECURITY;

-- RLS Policies
DROP POLICY IF EXISTS "Users can view own backtests" ON public.auto_trading_backtests;
CREATE POLICY "Users can view own backtests" 
  ON public.auto_trading_backtests FOR SELECT 
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own backtests" ON public.auto_trading_backtests;
CREATE POLICY "Users can insert own backtests" 
  ON public.auto_trading_backtests FOR INSERT 
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own backtests" ON public.auto_trading_backtests;
CREATE POLICY "Users can update own backtests" 
  ON public.auto_trading_backtests FOR UPDATE 
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own backtests" ON public.auto_trading_backtests;
CREATE POLICY "Users can delete own backtests" 
  ON public.auto_trading_backtests FOR DELETE 
  USING (auth.uid() = user_id);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_backtests_user_id ON public.auto_trading_backtests(user_id);
CREATE INDEX IF NOT EXISTS idx_backtests_strategy_id ON public.auto_trading_backtests(strategy_id);
CREATE INDEX IF NOT EXISTS idx_backtests_created_at ON public.auto_trading_backtests(created_at DESC);

-- Add is_paper column to auto_trading_trades if not exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'auto_trading_trades' AND column_name = 'is_paper'
  ) THEN
    ALTER TABLE public.auto_trading_trades ADD COLUMN is_paper BOOLEAN NOT NULL DEFAULT false;
  END IF;
END $$;

-- Add comment
COMMENT ON TABLE public.auto_trading_backtests IS 'Stores backtest results from the backtest-engine';
