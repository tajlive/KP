-- ============================================================================
-- KLA-130: Create kltbalances table with 500 KLT welcome bonus + auth trigger
-- ============================================================================

-- Create kltbalances table (simpler version with 500 KLT default)
CREATE TABLE IF NOT EXISTS public.kltbalances (
    userid UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    balance BIGINT NOT NULL DEFAULT 500 CHECK (balance >= 0),
    total_earned BIGINT NOT NULL DEFAULT 500,
    total_spent BIGINT NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add comment
COMMENT ON TABLE public.kltbalances IS 'User KLT balances with 500 welcome bonus';

-- Enable RLS
ALTER TABLE public.kltbalances ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Users can only see their own balance
CREATE POLICY "Users can view own klt balance"
    ON public.kltbalances FOR SELECT
    USING (auth.uid() = userid);

-- RLS Policy: Service role can manage all balances
CREATE POLICY "Service can manage klt balances"
    ON public.kltbalances FOR ALL
    USING (true)
    WITH CHECK (true);

-- Grant permissions
GRANT SELECT ON public.kltbalances TO authenticated;
GRANT ALL ON public.kltbalances TO service_role;

-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_kltbalances_userid ON public.kltbalances(userid);

-- ============================================================================
-- Function: Add 500 KLT to new users on signup
-- ============================================================================
CREATE OR REPLACE FUNCTION public.handle_new_user_klt()
RETURNS TRIGGER AS $$
BEGIN
    -- Insert 500 KLT welcome bonus
    INSERT INTO public.kltbalances (userid, balance, total_earned)
    VALUES (NEW.id, 500, 500)
    ON CONFLICT (userid) DO NOTHING;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop existing trigger if exists
DROP TRIGGER IF EXISTS new_user_klt_bonus ON auth.users;

-- Create trigger to give 500 KLT on new user signup
CREATE TRIGGER new_user_klt_bonus
    AFTER INSERT ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_new_user_klt();

-- ============================================================================
-- PG_CRON: Daily KLT bonus for active users (5 KLT per day)
-- ============================================================================

-- Enable pg_cron extension if not already enabled
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Schedule daily KLT bonus for users older than 1 day
SELECT cron.schedule(
    'daily-klt-bonus',
    '0 0 * * *',  -- Every day at midnight
    $$
    INSERT INTO public.kltbalances (userid, balance, total_earned)
    SELECT 
        id as userid,
        5 as balance,
        5 as total_earned
    FROM auth.users
    WHERE created_at < NOW() - INTERVAL '1 day'
      AND NOT EXISTS (
          SELECT 1 FROM public.kltbalances WHERE userid = auth.users.id
      )
    ON CONFLICT (userid) 
    DO UPDATE SET 
        balance = kltbalances.balance + 5,
        total_earned = kltbalances.total_earned + 5,
        updated_at = NOW()
    $$
);

-- Verify setup
DO $$
BEGIN
    RAISE NOTICE 'KLA-130 COMPLETE: kltbalances table created with 500 KLT welcome bonus';
    RAISE NOTICE 'Trigger: new_user_klt_bonus active on auth.users';
    RAISE NOTICE 'Daily cron job: daily-klt-bonus scheduled';
END $$;
