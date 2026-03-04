CREATE TABLE IF NOT EXISTS public.positions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  portfolio_id UUID REFERENCES public.portfolios(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  symbol TEXT NOT NULL,
  quantity DECIMAL(15,8) NOT NULL,
  avg_price DECIMAL(15,2) NOT NULL,
  current_price DECIMAL(15,2),
  profit_loss DECIMAL(15,2),
  profit_loss_percent DECIMAL(10,2),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(portfolio_id, symbol)
);

ALTER TABLE public.positions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own positions"
  ON public.positions FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can manage own positions"
  ON public.positions FOR ALL USING (auth.uid() = user_id);

CREATE INDEX positions_portfolio_id_idx ON public.positions(portfolio_id);
CREATE INDEX positions_symbol_idx ON public.positions(symbol);
