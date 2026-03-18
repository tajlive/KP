-- Posisjons-tabell (KRITISK for å hindre selge-uten-eie)
CREATE TABLE IF NOT EXISTS positions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  session_id UUID REFERENCES trading_sessions(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  symbol TEXT NOT NULL,
  quantity NUMERIC NOT NULL DEFAULT 0,
  avg_entry_price NUMERIC NOT NULL DEFAULT 0,
  total_cost_nok NUMERIC NOT NULL DEFAULT 0,
  unrealized_pnl NUMERIC DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(session_id, symbol)
);
ALTER TABLE positions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users manage own positions" ON positions;
CREATE POLICY "Users manage own positions" ON positions
  FOR ALL USING (auth.uid() = user_id);
-- Handle_new_user trigger (sikre at user_profiles alltid finnes)
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.user_profiles (id, created_at)
  VALUES (NEW.id, NOW())
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();
-- Atomic decrement (hindrer race condition)
CREATE OR REPLACE FUNCTION decrement_capital(
  p_session_id UUID,
  p_amount NUMERIC,
  p_user_id UUID
) RETURNS void AS $$
BEGIN
  UPDATE public.trading_sessions
  SET current_capital_nok = current_capital_nok - p_amount,
      updated_at = NOW()
  WHERE id = p_session_id 
    AND user_id = p_user_id
    AND current_capital_nok >= p_amount;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Insufficient capital or session not found';
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
-- Atomic increment
CREATE OR REPLACE FUNCTION increment_capital(
  p_session_id UUID,
  p_amount NUMERIC,
  p_user_id UUID
) RETURNS void AS $$
BEGIN
  UPDATE public.trading_sessions
  SET current_capital_nok = current_capital_nok + p_amount,
      updated_at = NOW()
  WHERE id = p_session_id 
    AND user_id = p_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
