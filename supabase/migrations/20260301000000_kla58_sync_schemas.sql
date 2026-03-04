-- ============================================================================
-- KLA-58: Sync Onboarding, Portfolios and Strategies Schema
-- ============================================================================

-- 1. Ensure onboarding_progress has all required columns for OnboardingFlow.tsx
CREATE TABLE IF NOT EXISTS public.onboarding_progress (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
    step1_completed BOOLEAN DEFAULT false,
    step2_completed BOOLEAN DEFAULT false,
    step3_completed BOOLEAN DEFAULT false,
    step4_completed BOOLEAN DEFAULT false,
    step5_completed BOOLEAN DEFAULT false,
    step2_started_at TIMESTAMPTZ,
    is_completed BOOLEAN DEFAULT false,
    completed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(user_id)
);

DO $$
BEGIN
    -- step1_completed
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'onboarding_progress' AND column_name = 'step1_completed') THEN
        ALTER TABLE public.onboarding_progress ADD COLUMN step1_completed BOOLEAN DEFAULT false;
    END IF;
    -- step2_completed
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'onboarding_progress' AND column_name = 'step2_completed') THEN
        ALTER TABLE public.onboarding_progress ADD COLUMN step2_completed BOOLEAN DEFAULT false;
    END IF;
    -- step3_completed
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'onboarding_progress' AND column_name = 'step3_completed') THEN
        ALTER TABLE public.onboarding_progress ADD COLUMN step3_completed BOOLEAN DEFAULT false;
    END IF;
    -- step4_completed
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'onboarding_progress' AND column_name = 'step4_completed') THEN
        ALTER TABLE public.onboarding_progress ADD COLUMN step4_completed BOOLEAN DEFAULT false;
    END IF;
    -- step5_completed
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'onboarding_progress' AND column_name = 'step5_completed') THEN
        ALTER TABLE public.onboarding_progress ADD COLUMN step5_completed BOOLEAN DEFAULT false;
    END IF;
    -- step2_started_at
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'onboarding_progress' AND column_name = 'step2_started_at') THEN
        ALTER TABLE public.onboarding_progress ADD COLUMN step2_started_at TIMESTAMPTZ;
    END IF;
    -- is_completed
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'onboarding_progress' AND column_name = 'is_completed') THEN
        ALTER TABLE public.onboarding_progress ADD COLUMN is_completed BOOLEAN DEFAULT false;
    END IF;
    -- completed_at
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'onboarding_progress' AND column_name = 'completed_at') THEN
        ALTER TABLE public.onboarding_progress ADD COLUMN completed_at TIMESTAMPTZ;
    END IF;
END $$;

-- 2. Ensure user_portfolios and user_strategies are accessible
-- Sometimes 404/400 happens if columns are missing or types are wrong.
-- For user_portfolios we need: user_id, mode, total_value, cash_balance, invested_value, total_pnl, daily_pnl, total_trades, win_rate
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

-- user_strategies
CREATE TABLE IF NOT EXISTS public.user_strategies (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
    strategy_type text NOT NULL,
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

-- 3. RLS - Critical for 400/404/406 access
ALTER TABLE public.onboarding_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_portfolios ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_strategies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trades ENABLE ROW LEVEL SECURITY;

-- Reset and apply policies
DROP POLICY IF EXISTS "Users can manage own onboarding progress" ON public.onboarding_progress;
DROP POLICY IF EXISTS "own_data" ON public.onboarding_progress;
CREATE POLICY "own_data" ON public.onboarding_progress FOR ALL USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can manage own portfolios" ON public.user_portfolios;
DROP POLICY IF EXISTS "own_data" ON public.user_portfolios;
CREATE POLICY "own_data" ON public.user_portfolios FOR ALL USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can manage own strategies" ON public.user_strategies;
DROP POLICY IF EXISTS "own_data" ON public.user_strategies;
CREATE POLICY "own_data" ON public.user_strategies FOR ALL USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can manage own trades" ON public.trades;
DROP POLICY IF EXISTS "own_data" ON public.trades;
CREATE POLICY "own_data" ON public.trades FOR ALL USING (auth.uid() = user_id);

-- Grants
GRANT ALL ON public.onboarding_progress TO authenticated;
GRANT ALL ON public.onboarding_progress TO service_role;
GRANT ALL ON public.user_portfolios TO authenticated;
GRANT ALL ON public.user_portfolios TO service_role;
GRANT ALL ON public.user_strategies TO authenticated;
GRANT ALL ON public.user_strategies TO service_role;
GRANT ALL ON public.trades TO authenticated;
GRANT ALL ON public.trades TO service_role;

-- 4. Final cleanup for trades table - resolving 400 errors
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'trades' AND column_name = 'mode') THEN
        ALTER TABLE public.trades ADD COLUMN mode TEXT DEFAULT 'paper';
    END IF;
END $$;
