-- Kjør denne SQL i Supabase SQL Editor: https://supabase.com/dashboard/project/vuxbjlykgmzskxbclquf/sql

-- Brukerens aktive strategier
CREATE TABLE IF NOT EXISTS public.user_strategies (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  strategy_type text NOT NULL CHECK (strategy_type IN (
    'dca_trygg', 'trend_balansert', 'multisignal_aktiv', 'grid_bot', 'ai_copy'
  )),
  is_active boolean DEFAULT false,
  mode text NOT NULL DEFAULT 'paper' CHECK (mode IN ('paper', 'live')),
  config jsonb DEFAULT '{}',
  started_at timestamptz,
  stopped_at timestamptz,
  total_trades integer DEFAULT 0,
  total_pnl numeric DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(user_id, strategy_type, mode)
);

-- Alle handler (paper + live i samme tabell)
CREATE TABLE IF NOT EXISTS public.trades (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  strategy_id uuid REFERENCES public.user_strategies(id),
  mode text NOT NULL DEFAULT 'paper' CHECK (mode IN ('paper', 'live')),
  symbol text NOT NULL DEFAULT 'BTCUSDT',
  side text NOT NULL CHECK (side IN ('buy', 'sell')),
  amount numeric NOT NULL,
  amount_nok numeric,
  entry_price numeric,
  exit_price numeric,
  pnl numeric DEFAULT 0,
  pnl_pct numeric DEFAULT 0,
  strategy_type text,
  signal_reason text,
  ai_explanation text,
  status text DEFAULT 'open' CHECK (status IN ('open', 'closed', 'cancelled')),
  created_at timestamptz DEFAULT now(),
  closed_at timestamptz
);

-- Porteføljeoversikt
CREATE TABLE IF NOT EXISTS public.user_portfolios (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  mode text NOT NULL DEFAULT 'paper' CHECK (mode IN ('paper', 'live')),
  total_value numeric DEFAULT 1000000,
  cash_balance numeric DEFAULT 1000000,
  invested_value numeric DEFAULT 0,
  total_pnl numeric DEFAULT 0,
  daily_pnl numeric DEFAULT 0,
  total_trades integer DEFAULT 0,
  win_rate numeric DEFAULT 0,
  updated_at timestamptz DEFAULT now(),
  UNIQUE(user_id, mode)
);

-- Grid bot state
CREATE TABLE IF NOT EXISTS public.grid_bot_state (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  strategy_id uuid REFERENCES public.user_strategies(id),
  upper_price numeric NOT NULL,
  lower_price numeric NOT NULL,
  grid_levels integer DEFAULT 10,
  grid_orders jsonb DEFAULT '[]',
  grid_mode text DEFAULT 'neutral',
  total_grid_profit numeric DEFAULT 0,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

-- Leaderboard
CREATE TABLE IF NOT EXISTS public.leaderboard (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name text NOT NULL,
  total_return_pct numeric DEFAULT 0,
  sharpe_ratio numeric DEFAULT 0,
  max_drawdown_pct numeric DEFAULT 0,
  strategy_type text,
  total_trades integer DEFAULT 0,
  win_rate numeric DEFAULT 0,
  updated_at timestamptz DEFAULT now()
);

-- Onboarding
CREATE TABLE IF NOT EXISTS public.onboarding_progress (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
  current_step integer DEFAULT 1,
  step_1_completed_at timestamptz,
  step_2_completed_at timestamptz,
  step_3_completed_at timestamptz,
  step_4_completed_at timestamptz,
  step_5_completed_at timestamptz,
  created_at timestamptz DEFAULT now()
);

-- RLS
ALTER TABLE public.user_strategies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trades ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_portfolios ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.grid_bot_state ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.leaderboard ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.onboarding_progress ENABLE ROW LEVEL SECURITY;

-- Drop eksisterende policies først
DROP POLICY IF EXISTS "own_data" ON public.user_strategies;
DROP POLICY IF EXISTS "own_data" ON public.trades;
DROP POLICY IF EXISTS "own_data" ON public.user_portfolios;
DROP POLICY IF EXISTS "own_data" ON public.grid_bot_state;
DROP POLICY IF EXISTS "own_data" ON public.onboarding_progress;
DROP POLICY IF EXISTS "read_all" ON public.leaderboard;

-- Opprett policies på nytt
CREATE POLICY "own_data" ON public.user_strategies FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "own_data" ON public.trades FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "own_data" ON public.user_portfolios FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "own_data" ON public.grid_bot_state FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "own_data" ON public.onboarding_progress FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "read_all" ON public.leaderboard FOR SELECT USING (true);

-- Auto-opprett paper portfolio ved signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.user_portfolios (user_id, mode, total_value, cash_balance)
  VALUES (NEW.id, 'paper', 1000000, 1000000);
  INSERT INTO public.onboarding_progress (user_id) VALUES (NEW.id);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Legg til mode kolonne hvis den mangler
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'trades' AND column_name = 'mode') THEN
    ALTER TABLE public.trades ADD COLUMN mode text NOT NULL DEFAULT 'paper' CHECK (mode IN ('paper', 'live'));
  END IF;
END $$;

-- Indexer
CREATE INDEX IF NOT EXISTS idx_trades_user_mode ON public.trades(user_id, mode);
CREATE INDEX IF NOT EXISTS idx_trades_created ON public.trades(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_strategies_active ON public.user_strategies(user_id, is_active);
