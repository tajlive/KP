CREATE TABLE IF NOT EXISTS public.portfolios (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL DEFAULT 'Paper Trading',
  balance DECIMAL(15,2) NOT NULL DEFAULT 100000.00,
  currency TEXT NOT NULL DEFAULT 'NOK',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id)
);
ALTER TABLE public.portfolios ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own portfolio"
  ON public.portfolios FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can manage own portfolio"
  ON public.portfolios FOR ALL USING (auth.uid() = user_id);
CREATE OR REPLACE FUNCTION public.handle_new_portfolio()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.portfolios (user_id) VALUES (NEW.id);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
CREATE OR REPLACE TRIGGER on_profile_created
  AFTER INSERT ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_portfolio();
CREATE INDEX portfolios_user_id_idx ON public.portfolios(user_id);
