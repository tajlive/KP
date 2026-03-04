-- ============================================================================
-- AUTO TRADE AKTIVIERING — Sprint 12
-- Oppretter tabeller for auto trade med krypterte Binance-nøkler og tier-grenser
-- ============================================================================

-- ── 1. user_binance_keys: Krypterte Binance API-nøkler ──────────────────────
CREATE TABLE IF NOT EXISTS public.user_binance_keys (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE NOT NULL,
  api_key TEXT NOT NULL, -- Kryptert med pgcrypto
  api_secret TEXT NOT NULL, -- Kryptert
  is_testnet BOOLEAN DEFAULT true, -- true = paper trading, false = live
  is_active BOOLEAN DEFAULT true,
  last_validated_at TIMESTAMPTZ,
  last_error TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Aktiver kryptering
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- RLS
ALTER TABLE public.user_binance_keys ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'user_binance_keys' AND policyname = 'users_own_keys'
  ) THEN
    CREATE POLICY users_own_keys ON public.user_binance_keys
      FOR ALL USING (auth.uid() = user_id);
  END IF;
END $$;

-- Service role for full access
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'user_binance_keys' AND policyname = 'service_role_keys'
  ) THEN
    CREATE POLICY service_role_keys ON public.user_binance_keys
      FOR ALL TO service_role USING (true) WITH CHECK (true);
  END IF;
END $$;

-- ── 2. user_strategies: Aktive strategikonfigurasjoner ──────────────────────
CREATE TABLE IF NOT EXISTS public.user_strategies (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  strategy_type TEXT NOT NULL CHECK (strategy_type IN (
    'dca_trygg', 'trend_balansert', 'multisignal_aktiv', 'grid_bot', 'ai_copy'
  )),
  config JSONB NOT NULL DEFAULT '{}'::jsonb,
  trading_mode TEXT NOT NULL DEFAULT 'paper' CHECK (trading_mode IN ('paper', 'live')),
  is_active BOOLEAN DEFAULT true,
  symbol TEXT DEFAULT 'BTCUSDT',
  capital_allocation NUMERIC DEFAULT 100, -- USDT amount
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  CONSTRAINT unique_user_strategy UNIQUE (user_id, strategy_type, trading_mode)
);

ALTER TABLE public.user_strategies ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'user_strategies' AND policyname = 'users_own_strategies'
  ) THEN
    CREATE POLICY users_own_strategies ON public.user_strategies
      FOR ALL USING (auth.uid() = user_id);
  END IF;
END $$;

-- Service role
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'user_strategies' AND policyname = 'service_role_strategies'
  ) THEN
    CREATE POLICY service_role_strategies ON public.user_strategies
      FOR ALL TO service_role USING (true) WITH CHECK (true);
  END IF;
END $$;

-- Index for performance
CREATE INDEX IF NOT EXISTS idx_user_strategies_active 
  ON public.user_strategies(user_id, is_active, trading_mode);

-- ── 3. grid_bot_state: Persistert grid-tilstand ─────────────────────────────
CREATE TABLE IF NOT EXISTS public.grid_bot_state (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  strategy_id UUID REFERENCES public.user_strategies(id) ON DELETE CASCADE NOT NULL,
  symbol TEXT NOT NULL,
  levels JSONB NOT NULL DEFAULT '[]'::jsonb,
  is_running BOOLEAN DEFAULT true,
  total_grid_profit NUMERIC DEFAULT 0,
  total_trades INTEGER DEFAULT 0,
  base_asset_held NUMERIC DEFAULT 0,
  quote_asset_held NUMERIC DEFAULT 0,
  upper_price NUMERIC,
  lower_price NUMERIC,
  grid_count INTEGER DEFAULT 10,
  started_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.grid_bot_state ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'grid_bot_state' AND policyname = 'users_own_grid_state'
  ) THEN
    CREATE POLICY users_own_grid_state ON public.grid_bot_state
      FOR ALL USING (auth.uid() = user_id);
  END IF;
END $$;

-- ── 4. trade_history: Alle trades (paper + live) ────────────────────────────
CREATE TABLE IF NOT EXISTS public.trade_history (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  strategy_type TEXT NOT NULL,
  symbol TEXT NOT NULL,
  side TEXT NOT NULL CHECK (side IN ('BUY', 'SELL')),
  entry_price NUMERIC NOT NULL,
  exit_price NUMERIC,
  quantity NUMERIC NOT NULL,
  pnl_usdt NUMERIC,
  pnl_pct NUMERIC,
  fee_usdt NUMERIC DEFAULT 0,
  trading_mode TEXT NOT NULL CHECK (trading_mode IN ('paper', 'live')),
  exit_reason TEXT CHECK (exit_reason IN ('take_profit', 'stop_loss', 'manual', 'circuit_breaker')),
  opened_at TIMESTAMPTZ DEFAULT now(),
  closed_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_trade_history_user ON public.trade_history(user_id, opened_at DESC);
CREATE INDEX IF NOT EXISTS idx_trade_history_mode ON public.trade_history(user_id, trading_mode, opened_at DESC);

ALTER TABLE public.trade_history ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'trade_history' AND policyname = 'users_own_trades'
  ) THEN
    CREATE POLICY users_own_trades ON public.trade_history
      FOR ALL USING (auth.uid() = user_id);
  END IF;
END $$;

-- ── 5. Oppdatert get_user_entitlements med auto_trade-grenser ───────────────
CREATE OR REPLACE FUNCTION public.get_user_entitlements(p_user_id UUID)
RETURNS TABLE (
  subscription_tier TEXT,
  subscription_status TEXT,
  is_trial_active BOOLEAN,
  is_trial_expired BOOLEAN,
  can_access_spot BOOLEAN,
  can_access_futures BOOLEAN,
  can_use_sms BOOLEAN,
  can_use_autotrade BOOLEAN,
  can_use_copy_trading BOOLEAN,
  can_use_limit_orders BOOLEAN,
  can_use_margin BOOLEAN,
  futures_quiz_passed BOOLEAN,
  trial_days_remaining INTEGER,
  -- Auto Trade grenser
  auto_trade_max_strategies INTEGER,
  auto_trade_max_positions INTEGER,
  auto_trade_allow_live BOOLEAN,
  auto_trade_allow_paper BOOLEAN
) AS $$
DECLARE
  v_tier_slug TEXT;
  v_status TEXT;
  v_trial_ends TIMESTAMPTZ;
  v_is_trial_active BOOLEAN;
  v_futures_quiz_passed BOOLEAN;
BEGIN
  -- Hent brukerens subscription info
  SELECT 
    s.tier_slug,
    s.status,
    s.current_period_end,
    COALESCE(
      (SELECT bool_or(qa.passed) 
       FROM quiz_attempts qa 
       JOIN quizzes q ON qa.quiz_id = q.id 
       WHERE qa.user_id = p_user_id AND q.slug = 'futures'),
      false
    )
  INTO v_tier_slug, v_status, v_trial_ends, v_futures_quiz_passed
  FROM subscriptions s
  WHERE s.user_id = p_user_id AND s.status = 'active'
  ORDER BY s.created_at DESC
  LIMIT 1;

  -- Default til student hvis ingen aktiv subscription
  IF v_tier_slug IS NULL THEN
    v_tier_slug := 'student';
    v_status := 'inactive';
  END IF;

  -- Sjekk trial status
  v_is_trial_active := v_status = 'trial' AND v_trial_ends > NOW();

  RETURN QUERY
  SELECT 
    v_tier_slug,
    v_status,
    v_is_trial_active,
    CASE WHEN v_trial_ends < NOW() AND v_status = 'trial' THEN true ELSE false END,
    -- can_access_spot: alle betalende tiers
    v_tier_slug IN ('bachelor', 'master', 'phd', 'professor') OR v_is_trial_active,
    -- can_access_futures: kun professor (med quiz)
    v_tier_slug = 'professor' AND v_futures_quiz_passed,
    -- can_use_sms: master og opp
    v_tier_slug IN ('master', 'phd', 'professor'),
    -- can_use_autotrade: master og opp
    v_tier_slug IN ('master', 'phd', 'professor'),
    -- can_use_copy_trading: master og opp
    v_tier_slug IN ('master', 'phd', 'professor'),
    -- can_use_limit_orders: bachelor og opp
    v_tier_slug IN ('bachelor', 'master', 'phd', 'professor'),
    -- can_use_margin: professor kun
    v_tier_slug = 'professor',
    v_futures_quiz_passed,
    CASE WHEN v_trial_ends > NOW() THEN EXTRACT(DAY FROM (v_trial_ends - NOW()))::INTEGER ELSE 0 END,
    -- Auto Trade grenser basert på tier
    CASE 
      WHEN v_tier_slug = 'student' THEN 0
      WHEN v_tier_slug = 'bachelor' THEN 1
      WHEN v_tier_slug = 'master' THEN 3
      WHEN v_tier_slug IN ('phd', 'professor') THEN -1  -- ubegrenset
      ELSE 0
    END,
    CASE 
      WHEN v_tier_slug = 'student' THEN 1
      WHEN v_tier_slug = 'bachelor' THEN 3
      WHEN v_tier_slug = 'master' THEN 7
      WHEN v_tier_slug IN ('phd', 'professor') THEN -1  -- ubegrenset
      ELSE 1
    END,
    -- allow_live: bachelor og opp (student = KUN paper)
    v_tier_slug IN ('bachelor', 'master', 'phd', 'professor'),
    -- allow_paper: alle
    true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ── 6. Funksjon for å telle aktive strategier ───────────────────────────────
CREATE OR REPLACE FUNCTION public.count_user_strategies(p_user_id UUID, p_mode TEXT DEFAULT NULL)
RETURNS INTEGER AS $$
DECLARE
  v_count INTEGER;
BEGIN
  SELECT COUNT(*)
  INTO v_count
  FROM public.user_strategies
  WHERE user_id = p_user_id
    AND is_active = true
    AND (p_mode IS NULL OR trading_mode = p_mode);
  
  RETURN v_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ── 7. Funksjon for å validere strategi-grenser før opprettelse ─────────────
CREATE OR REPLACE FUNCTION public.can_create_strategy(
  p_user_id UUID,
  p_trading_mode TEXT
) RETURNS BOOLEAN AS $$
DECLARE
  v_tier_slug TEXT;
  v_max_strategies INTEGER;
  v_current_count INTEGER;
  v_allow_live BOOLEAN;
BEGIN
  -- Hent brukerens tier
  SELECT tier_slug INTO v_tier_slug
  FROM subscriptions
  WHERE user_id = p_user_id AND status = 'active'
  ORDER BY created_at DESC
  LIMIT 1;
  
  IF v_tier_slug IS NULL THEN
    v_tier_slug := 'student';
  END IF;
  
  -- Sjekk live-tilgang for student
  IF p_trading_mode = 'live' AND v_tier_slug = 'student' THEN
    RETURN false;
  END IF;
  
  -- Hent max strategier for tier
  SELECT auto_trade_max_strategies INTO v_max_strategies
  FROM public.get_user_entitlements(p_user_id);
  
  -- Ubegrenset (-1)
  IF v_max_strategies = -1 THEN
    RETURN true;
  END IF;
  
  -- Tell nåværende aktive strategier
  SELECT COUNT(*) INTO v_current_count
  FROM public.user_strategies
  WHERE user_id = p_user_id AND is_active = true;
  
  RETURN v_current_count < v_max_strategies;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ── 8. Trigger for updated_at ───────────────────────────────────────────────
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_user_strategies_updated_at
  BEFORE UPDATE ON public.user_strategies
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_user_binance_keys_updated_at
  BEFORE UPDATE ON public.user_binance_keys
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_grid_bot_state_updated_at
  BEFORE UPDATE ON public.grid_bot_state
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- KOMMENTARER
-- ============================================================================
COMMENT ON TABLE public.user_binance_keys IS 'Krypterte Binance API-nøkler per bruker';
COMMENT ON TABLE public.user_strategies IS 'Brukerens aktive auto trade-strategier';
COMMENT ON TABLE public.grid_bot_state IS 'Persistert tilstand for grid bot';
COMMENT ON TABLE public.trade_history IS 'Historikk over alle trades (paper og live)';

COMMENT ON COLUMN public.user_strategies.trading_mode IS 'paper = simulert, live = ekte Binance-trades';
COMMENT ON COLUMN public.user_strategies.capital_allocation IS 'USDT-allokering for denne strategien';
