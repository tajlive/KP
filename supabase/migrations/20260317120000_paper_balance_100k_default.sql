-- ============================================================================
-- Paper trading initial balance: 1M NOK → 100K NOK
-- New users and new configs get 100 000 NOK paper balance by default.
-- ============================================================================

-- user_profiles.paper_balance
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'user_profiles' AND column_name = 'paper_balance') THEN
    ALTER TABLE public.user_profiles ALTER COLUMN paper_balance SET DEFAULT 100000.00;
    RAISE NOTICE 'user_profiles.paper_balance default set to 100000';
  END IF;
END $$;
-- user_trading_config.paper_balance (if exists)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'user_trading_config' AND column_name = 'paper_balance') THEN
    ALTER TABLE public.user_trading_config ALTER COLUMN paper_balance SET DEFAULT 100000.00;
    RAISE NOTICE 'user_trading_config.paper_balance default set to 100000';
  END IF;
END $$;
