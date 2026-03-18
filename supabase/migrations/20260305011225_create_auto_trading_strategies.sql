-- Create auto_trading_strategies table
CREATE TABLE IF NOT EXISTS public.auto_trading_strategies (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  risk_level TEXT NOT NULL,
  description TEXT NOT NULL,
  timeframe TEXT DEFAULT '1h',
  max_position_size_pct NUMERIC NOT NULL,
  stop_loss_pct NUMERIC NOT NULL,
  take_profit_pct NUMERIC,
  daily_loss_limit_pct NUMERIC NOT NULL,
  max_trades_per_day INTEGER NOT NULL,
  allow_long BOOLEAN DEFAULT true,
  allow_short BOOLEAN DEFAULT true,
  max_leverage INTEGER DEFAULT 1,
  allowed_symbols TEXT[] DEFAULT '{}',
  expected_annual_return_pct NUMERIC,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
-- Enable RLS
ALTER TABLE public.auto_trading_strategies ENABLE ROW LEVEL SECURITY;
-- Allow read access to all authenticated users
CREATE POLICY "Allow read access for authenticated users to auto_trading_strategies" 
ON public.auto_trading_strategies 
FOR SELECT 
TO authenticated 
USING (true);
-- Insert the 4 default risk levels from RISK_LEVELS
INSERT INTO public.auto_trading_strategies (id, name, risk_level, description, max_position_size_pct, stop_loss_pct, daily_loss_limit_pct, max_trades_per_day, allowed_symbols, is_active)
VALUES
('safe', 'Trygg', 'conservative', 'Fokus på bevaring av kapital. Små posisjoner og stram risk management. Velegnet for nybegynnere.', 2, 5, 1, 3, '{"BTCUSDT","ETHUSDT"}', true),
('balanced', 'Balansert', 'balanced', 'Standard risiko. Balanserer profittpotensial med tålelig drawdown.', 5, 8, 3, 5, '{"BTCUSDT","ETHUSDT","SOLUSDT"}', true),
('offensive', 'Offensiv', 'aggressive', 'Høyere risiko for større gevinster. Større drawdowns kan forekomme.', 10, 12, 5, 10, '{"BTCUSDT","ETHUSDT","SOLUSDT","BNBUSDT","XRPUSDT"}', true),
('aggressive', 'Aggressiv', 'dynamic', 'Maksimal risiko og avkastning. Anbefales kun for erfarne tradere.', 20, 15, 10, 20, '{"BTCUSDT","ETHUSDT","SOLUSDT","BNBUSDT","XRPUSDT"}', true)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  risk_level = EXCLUDED.risk_level,
  description = EXCLUDED.description,
  max_position_size_pct = EXCLUDED.max_position_size_pct,
  stop_loss_pct = EXCLUDED.stop_loss_pct,
  daily_loss_limit_pct = EXCLUDED.daily_loss_limit_pct,
  max_trades_per_day = EXCLUDED.max_trades_per_day,
  is_active = EXCLUDED.is_active;
-- Ensure user_auto_trading_configs table exists
CREATE TABLE IF NOT EXISTS public.user_auto_trading_configs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  strategy_id TEXT REFERENCES public.auto_trading_strategies(id),
  is_enabled BOOLEAN DEFAULT false,
  is_paper_trading BOOLEAN DEFAULT true,
  trading_capital_nok NUMERIC DEFAULT 0,
  phase TEXT DEFAULT 'paper',
  phase_started_at TIMESTAMPTZ DEFAULT NOW(),
  phase_min_days INTEGER DEFAULT 7,
  phase_profitable BOOLEAN DEFAULT false,
  allocated_capital_pct NUMERIC DEFAULT 100,
  auto_extract_profit_enabled BOOLEAN DEFAULT false,
  auto_extract_profit_threshold_pct NUMERIC DEFAULT 5,
  auto_extract_profit_amount_pct NUMERIC DEFAULT 50,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id)
);
ALTER TABLE public.user_auto_trading_configs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own auto_trading_configs" 
ON public.user_auto_trading_configs FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own auto_trading_configs" 
ON public.user_auto_trading_configs FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own auto_trading_configs" 
ON public.user_auto_trading_configs FOR UPDATE TO authenticated USING (auth.uid() = user_id);
-- Also fix schema cache issue with Supabase
NOTIFY pgrst, 'reload schema';
