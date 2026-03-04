-- Migration for KLA-100, KLA-94, KLA-91, KLA-98
-- Author: Senior Full-Stack Engineer
-- Date: 2026-03-02
-- Description: Dashboard enhancements, copy trading, marketplace, and onboarding

-- ============================================================================
-- 1. KLA-100: BotStatusDashboard enhancements
-- ============================================================================

-- Add columns to user_strategies (formerly trading_sessions) if they don't exist
ALTER TABLE IF EXISTS public.user_strategies 
ADD COLUMN IF NOT EXISTS last_analysis_details JSONB DEFAULT '{}'::jsonb,
ADD COLUMN IF NOT EXISTS next_expected_action_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS last_status_message TEXT,
ADD COLUMN IF NOT EXISTS is_public BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS is_marketplace_listed BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS performance_fee_pct DECIMAL DEFAULT 0.0,
ADD COLUMN IF NOT EXISTS subscriber_count INTEGER DEFAULT 0;

-- Also add to trading_sessions if still used
ALTER TABLE IF EXISTS public.trading_sessions 
ADD COLUMN IF NOT EXISTS last_analysis_details JSONB DEFAULT '{}'::jsonb,
ADD COLUMN IF NOT EXISTS next_expected_action_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS last_status_message TEXT;

-- ============================================================================
-- 2. KLA-98: Onboarding enhancements
-- ============================================================================

-- Add onboarding columns to profiles if they don't exist
ALTER TABLE IF EXISTS public.profiles
ADD COLUMN IF NOT EXISTS onboarding_completed BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS onboarding_step TEXT DEFAULT 'new',
ADD COLUMN IF NOT EXISTS display_name TEXT,
ADD COLUMN IF NOT EXISTS bio TEXT,
ADD COLUMN IF NOT EXISTS avatar_url TEXT,
ADD COLUMN IF NOT EXISTS is_public_creator BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS performance_fee_percent DECIMAL DEFAULT 0.0,
ADD COLUMN IF NOT EXISTS setup_completed_at TIMESTAMPTZ;

-- Create onboarding_progress table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.onboarding_progress (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    current_step INTEGER DEFAULT 1,
    goal TEXT,
    selected_strategy_type TEXT,
    completed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(user_id)
);

-- ============================================================================
-- 3. KLA-94: Copy Trading 2.0 - trader_profiles table
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.trader_profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    display_name TEXT NOT NULL,
    bio TEXT,
    avatar_url TEXT,
    is_public BOOLEAN DEFAULT FALSE,
    performance_fee_pct DECIMAL DEFAULT 0.0,
    follower_count INTEGER DEFAULT 0,
    verified BOOLEAN DEFAULT FALSE,
    all_time_roi DECIMAL DEFAULT 0.0,
    win_rate DECIMAL DEFAULT 0.0,
    sharpe_ratio DECIMAL DEFAULT 0.0,
    total_trades INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(user_id)
);

-- ============================================================================
-- 4. KLA-94: Copy Trading 2.0 - leaderboard_bots table
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.leaderboard_bots (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    display_name TEXT NOT NULL,
    avatar_url TEXT,
    pnl_30d DECIMAL DEFAULT 0.0,
    pnl_90d DECIMAL DEFAULT 0.0,
    pnl_all_time DECIMAL DEFAULT 0.0,
    win_rate DECIMAL DEFAULT 0.0,
    sharpe_ratio DECIMAL DEFAULT 0.0,
    follower_count INTEGER DEFAULT 0,
    performance_fee_pct DECIMAL DEFAULT 0.0,
    strategy_type TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    rank INTEGER,
    updated_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(user_id)
);

-- ============================================================================
-- 5. KLA-91: Strategy Marketplace tables
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.marketplace_listings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    seller_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    strategy_id UUID REFERENCES public.user_strategies(id) ON DELETE SET NULL,
    title TEXT NOT NULL,
    description TEXT,
    price_model TEXT DEFAULT 'free', -- 'free', 'subscription', 'one_time'
    price_nok DECIMAL DEFAULT 0.0,
    backtest_summary JSONB DEFAULT '{}'::jsonb,
    category TEXT,
    status TEXT DEFAULT 'draft', -- 'draft', 'published', 'archived'
    subscriber_count INTEGER DEFAULT 0,
    rating DECIMAL DEFAULT 0.0,
    review_count INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.marketplace_subscriptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    subscriber_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    listing_id UUID REFERENCES public.marketplace_listings(id) ON DELETE CASCADE NOT NULL,
    user_strategy_id UUID REFERENCES public.user_strategies(id) ON DELETE SET NULL,
    status TEXT DEFAULT 'active', -- 'active', 'cancelled', 'expired'
    started_at TIMESTAMPTZ DEFAULT now(),
    expires_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(subscriber_id, listing_id)
);

-- ============================================================================
-- 6. Performance Fees table (for copy trading)
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.performance_fees (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    creator_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    follower_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    strategy_id UUID REFERENCES public.user_strategies(id) ON DELETE CASCADE,
    amount DECIMAL NOT NULL,
    currency TEXT DEFAULT 'NOK',
    pnl_snapshot DECIMAL NOT NULL,
    status TEXT DEFAULT 'pending', -- 'pending', 'paid', 'cancelled'
    created_at TIMESTAMPTZ DEFAULT now(),
    paid_at TIMESTAMPTZ
);

-- ============================================================================
-- 7. Enable RLS on all new tables
-- ============================================================================

ALTER TABLE public.onboarding_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trader_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.leaderboard_bots ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.marketplace_listings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.marketplace_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.performance_fees ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- 8. RLS Policies for onboarding_progress
-- ============================================================================

CREATE POLICY "Users can view own onboarding progress" 
    ON public.onboarding_progress FOR SELECT 
    USING (user_id = auth.uid());

CREATE POLICY "Users can insert own onboarding progress" 
    ON public.onboarding_progress FOR INSERT 
    WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own onboarding progress" 
    ON public.onboarding_progress FOR UPDATE 
    USING (user_id = auth.uid());

-- ============================================================================
-- 9. RLS Policies for trader_profiles
-- ============================================================================

CREATE POLICY "Public trader profiles are viewable by everyone" 
    ON public.trader_profiles FOR SELECT 
    USING (is_public = TRUE);

CREATE POLICY "Users can view own private trader profile" 
    ON public.trader_profiles FOR SELECT 
    USING (user_id = auth.uid());

CREATE POLICY "Users can manage own trader profile" 
    ON public.trader_profiles FOR ALL 
    USING (user_id = auth.uid());

-- ============================================================================
-- 10. RLS Policies for leaderboard_bots
-- ============================================================================

CREATE POLICY "Leaderboard bots are viewable by everyone" 
    ON public.leaderboard_bots FOR SELECT 
    TO PUBLIC USING (TRUE);

CREATE POLICY "Only system can manage leaderboard bots" 
    ON public.leaderboard_bots FOR ALL 
    USING (FALSE);

-- ============================================================================
-- 11. RLS Policies for marketplace_listings
-- ============================================================================

CREATE POLICY "Published marketplace listings are viewable by everyone" 
    ON public.marketplace_listings FOR SELECT 
    USING (status = 'published' OR seller_id = auth.uid());

CREATE POLICY "Users can manage own marketplace listings" 
    ON public.marketplace_listings FOR ALL 
    USING (seller_id = auth.uid());

-- ============================================================================
-- 12. RLS Policies for marketplace_subscriptions
-- ============================================================================

CREATE POLICY "Users can view own subscriptions" 
    ON public.marketplace_subscriptions FOR SELECT 
    USING (subscriber_id = auth.uid());

CREATE POLICY "Users can create own subscriptions" 
    ON public.marketplace_subscriptions FOR INSERT 
    WITH CHECK (subscriber_id = auth.uid());

CREATE POLICY "Users can update own subscriptions" 
    ON public.marketplace_subscriptions FOR UPDATE 
    USING (subscriber_id = auth.uid());

-- ============================================================================
-- 13. RLS Policies for performance_fees
-- ============================================================================

CREATE POLICY "Creators can see fees owed to them" 
    ON public.performance_fees FOR SELECT 
    USING (creator_id = auth.uid());

CREATE POLICY "Followers can see fees they owe" 
    ON public.performance_fees FOR SELECT 
    USING (follower_id = auth.uid());

-- ============================================================================
-- 14. Indexes for performance
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_user_strategies_user_id ON public.user_strategies(user_id);
CREATE INDEX IF NOT EXISTS idx_user_strategies_status ON public.user_strategies(status);
CREATE INDEX IF NOT EXISTS idx_user_strategies_is_public ON public.user_strategies(is_public);
CREATE INDEX IF NOT EXISTS idx_user_strategies_is_marketplace_listed ON public.user_strategies(is_marketplace_listed);

CREATE INDEX IF NOT EXISTS idx_onboarding_progress_user_id ON public.onboarding_progress(user_id);
CREATE INDEX IF NOT EXISTS idx_trader_profiles_user_id ON public.trader_profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_trader_profiles_is_public ON public.trader_profiles(is_public);
CREATE INDEX IF NOT EXISTS idx_leaderboard_bots_pnl_30d ON public.leaderboard_bots(pnl_30d DESC);
CREATE INDEX IF NOT EXISTS idx_leaderboard_bots_rank ON public.leaderboard_bots(rank);
CREATE INDEX IF NOT EXISTS idx_marketplace_listings_status ON public.marketplace_listings(status);
CREATE INDEX IF NOT EXISTS idx_marketplace_listings_category ON public.marketplace_listings(category);
CREATE INDEX IF NOT EXISTS idx_marketplace_subscriptions_subscriber_id ON public.marketplace_subscriptions(subscriber_id);

-- ============================================================================
-- 15. Trigger for updated_at columns
-- ============================================================================

CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply updated_at trigger to new tables
DROP TRIGGER IF EXISTS set_onboarding_progress_updated_at ON public.onboarding_progress;
CREATE TRIGGER set_onboarding_progress_updated_at
    BEFORE UPDATE ON public.onboarding_progress
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

DROP TRIGGER IF EXISTS set_trader_profiles_updated_at ON public.trader_profiles;
CREATE TRIGGER set_trader_profiles_updated_at
    BEFORE UPDATE ON public.trader_profiles
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

DROP TRIGGER IF EXISTS set_leaderboard_bots_updated_at ON public.leaderboard_bots;
CREATE TRIGGER set_leaderboard_bots_updated_at
    BEFORE UPDATE ON public.leaderboard_bots
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

DROP TRIGGER IF EXISTS set_marketplace_listings_updated_at ON public.marketplace_listings;
CREATE TRIGGER set_marketplace_listings_updated_at
    BEFORE UPDATE ON public.marketplace_listings
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

DROP TRIGGER IF EXISTS set_marketplace_subscriptions_updated_at ON public.marketplace_subscriptions;
CREATE TRIGGER set_marketplace_subscriptions_updated_at
    BEFORE UPDATE ON public.marketplace_subscriptions
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
